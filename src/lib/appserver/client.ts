import { SUPPORTED_PROTOCOL_VERSIONS, negotiateAdapter } from '#/lib/protocol'
import type { AppServerMethodMap, ErrorObject, InitializeResult, ServerHeartbeatParams } from '#/lib/protocol'

type MethodName = Extract<keyof AppServerMethodMap, string>

type RequestMethodName = {
  [TMethod in MethodName]: AppServerMethodMap[TMethod]['kind'] extends 'request' ? TMethod : never
}[MethodName]

type NotificationMethodName = {
  [TMethod in MethodName]: AppServerMethodMap[TMethod]['kind'] extends 'notification' ? TMethod : never
}[MethodName]

type RequestParams<TMethod extends RequestMethodName> = AppServerMethodMap[TMethod]['params']
type RequestResult<TMethod extends RequestMethodName> = AppServerMethodMap[TMethod]['result']
type NotificationParams<TMethod extends NotificationMethodName> = AppServerMethodMap[TMethod]['params']

type JsonRPCID = string

type JsonRPCSuccessResponse = {
  jsonrpc: '2.0'
  id: JsonRPCID
  result: unknown
}

type JsonRPCErrorResponse = {
  jsonrpc: '2.0'
  id: JsonRPCID
  error: ErrorObject
}

type JsonRPCNotification = {
  jsonrpc: '2.0'
  method: string
  params?: unknown
}

type PendingRequest = {
  reject: (error: Error) => void
  resolve: (result: unknown) => void
}

export type SessionConnectionState = 'ready' | 'degraded' | 'reconnecting' | 'disconnected'

export type SessionSnapshot = {
  connectionKey: string
  connectionID: number
  endpoint: string
  connectionState: SessionConnectionState
  heartbeatIntervalMs: number | null
  initialized: boolean
  lastHeartbeatAt: string | null
  server: InitializeResult
}

export type AppServerNotification = {
  [TMethod in NotificationMethodName]: {
    method: TMethod
    params: NotificationParams<TMethod>
  }
}[NotificationMethodName]

export interface WebSocketLike {
  addEventListener: (type: 'close' | 'error' | 'message' | 'open', listener: EventListenerOrEventListenerObject) => void
  close: (code?: number, reason?: string) => void
  readyState: number
  send: (data: string) => void
}

export type WebSocketFactory = (endpoint: string) => WebSocketLike

export type SessionClientOptions = {
  connectionKey: string
  endpoint: string
  reconnectDelayMs?: number
  server: InitializeResult
  webSocketFactory?: WebSocketFactory
  setTimeoutFn?: typeof setTimeout
  clearTimeoutFn?: typeof clearTimeout
}

export class AppServerRequestError extends Error {
  readonly errorObject: ErrorObject
  readonly method: string

  constructor(method: string, errorObject: ErrorObject) {
    super(`${method} failed: ${errorObject.message}`)
    this.name = 'AppServerRequestError'
    this.method = method
    this.errorObject = errorObject
  }
}

export class AppServerSessionClient {
  private readonly connectionKey: string
  private readonly clearTimeoutFn: typeof clearTimeout
  private connectPromise: Promise<void> | null = null
  private connectionState: SessionConnectionState = 'disconnected'
  private readonly endpoint: string
  private readonly listeners = new Set<() => void>()
  private readonly notificationListeners = new Set<(notification: AppServerNotification) => void>()
  private connectionID = 0
  private heartbeatIntervalMs: number | null = null
  private heartbeatTimeoutID: ReturnType<typeof setTimeout> | null = null
  private initialized = false
  private lastHeartbeatAt: string | null = null
  private nextRequestID = 0
  private pendingRequests = new Map<JsonRPCID, PendingRequest>()
  private reconnectDelayMs: number
  private reconnectTimeoutID: ReturnType<typeof setTimeout> | null = null
  private reconnectWanted = false
  private server: InitializeResult
  private readonly setTimeoutFn: typeof setTimeout
  private socket: WebSocketLike | null = null
  private readonly webSocketFactory: WebSocketFactory

  constructor(options: SessionClientOptions) {
    this.connectionKey = options.connectionKey
    this.clearTimeoutFn = options.clearTimeoutFn ?? globalThis.clearTimeout.bind(globalThis)
    this.endpoint = options.endpoint
    this.reconnectDelayMs = options.reconnectDelayMs ?? 1000
    this.server = options.server
    this.setTimeoutFn = options.setTimeoutFn ?? globalThis.setTimeout.bind(globalThis)
    this.webSocketFactory =
      options.webSocketFactory ?? ((endpoint: string) => new WebSocket(endpoint) as unknown as WebSocketLike)
  }

  async connect(): Promise<void> {
    this.reconnectWanted = true
    this.clearReconnectTimeout()
    if (this.connectPromise) {
      return this.connectPromise
    }
    if (this.isSocketOpen() && this.initialized) {
      return
    }

    this.updateConnectionState('reconnecting')
    this.connectPromise = new Promise<void>((resolve, reject) => {
      let connectSettled = false
      const socket = this.webSocketFactory(this.endpoint)
      this.socket = socket

      const rejectConnect = (error: Error) => {
        if (connectSettled) return
        connectSettled = true
        reject(error)
      }

      const resolveConnect = () => {
        if (connectSettled) return
        connectSettled = true
        resolve()
      }

      const handleOpen = () => {
        if (this.socket !== socket) return
        void this.initializeConnection(socket)
          .then(resolveConnect)
          .catch((error) => {
            const normalized = error instanceof Error ? error : new Error(String(error))
            this.recoverFromFailedOpen(socket)
            rejectConnect(normalized)
          })
      }

      const handleMessage = (event: Event) => {
        if (this.socket !== socket) return
        const messageEvent = event as MessageEvent<string>
        this.handleMessage(messageEvent.data)
      }

      const handleClose = () => {
        if (this.socket !== socket) return
        if (!this.initialized) {
          rejectConnect(new Error('connection closed'))
        }
        this.handleSocketClosed()
      }

      const handleError = () => {
        if (this.socket !== socket) return
        if (!this.initialized && this.connectionState !== 'reconnecting') {
          this.updateConnectionState('reconnecting')
        }
      }

      socket.addEventListener('open', handleOpen)
      socket.addEventListener('message', handleMessage)
      socket.addEventListener('close', handleClose)
      socket.addEventListener('error', handleError)
    }).finally(() => {
      this.connectPromise = null
    })

    return this.connectPromise
  }

  disconnect(): void {
    this.reconnectWanted = false
    this.clearReconnectTimeout()
    this.clearHeartbeatTimeout()
    const socket = this.socket
    if (socket) {
      this.socket = null
      socket.close()
    }
    this.initialized = false
    this.rejectPendingRequests(new Error('connection closed'))
    this.updateConnectionState('disconnected')
  }

  getSnapshot(): SessionSnapshot {
    return {
      connectionKey: this.connectionKey,
      connectionID: this.connectionID,
      endpoint: this.endpoint,
      connectionState: this.connectionState,
      heartbeatIntervalMs: this.heartbeatIntervalMs,
      initialized: this.initialized,
      lastHeartbeatAt: this.lastHeartbeatAt,
      server: this.server,
    }
  }

  reconnect(): void {
    this.reconnectWanted = true
    this.clearReconnectTimeout()
    const socket = this.socket
    if (socket) {
      this.socket = null
      socket.close()
      void this.connect().catch(() => {
        // The scheduled reconnect path will continue trying.
      })
      return
    }
    void this.connect().catch(() => {
      // The scheduled reconnect path will continue trying.
    })
  }

  async request<TMethod extends RequestMethodName>(
    method: TMethod,
    params: RequestParams<TMethod>,
  ): Promise<RequestResult<TMethod>> {
    await this.connect()
    const socket = this.socket
    if (socket == null || socket.readyState !== 1) {
      throw new Error('connection is not ready')
    }
    return this.sendRequest(socket, method, params)
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  subscribeNotifications(listener: (notification: AppServerNotification) => void): () => void {
    this.notificationListeners.add(listener)
    return () => {
      this.notificationListeners.delete(listener)
    }
  }

  private clearHeartbeatTimeout() {
    if (this.heartbeatTimeoutID == null) return
    this.clearTimeoutFn(this.heartbeatTimeoutID)
    this.heartbeatTimeoutID = null
  }

  private clearReconnectTimeout() {
    if (this.reconnectTimeoutID == null) return
    this.clearTimeoutFn(this.reconnectTimeoutID)
    this.reconnectTimeoutID = null
  }

  private emitChange() {
    for (const listener of this.listeners) {
      listener()
    }
  }

  private emitNotification(notification: AppServerNotification) {
    for (const listener of this.notificationListeners) {
      listener(notification)
    }
  }

  private handleHeartbeat(params: ServerHeartbeatParams) {
    this.heartbeatIntervalMs = params.heartbeatIntervalMs
    this.lastHeartbeatAt = params.serverTime
    if (this.isSocketOpen() && this.initialized) {
      this.updateConnectionState('ready')
    }
    this.clearHeartbeatTimeout()
    const timeoutMs = Math.max(params.heartbeatIntervalMs * 2, 1000)
    this.heartbeatTimeoutID = this.setTimeoutFn(() => {
      if (!this.isSocketOpen() || !this.initialized) return
      this.updateConnectionState('degraded')
    }, timeoutMs)
    this.emitChange()
  }

  private handleMessage(rawMessage: string) {
    let message: unknown
    try {
      message = JSON.parse(rawMessage)
    } catch {
      return
    }
    if (message == null || typeof message !== 'object') {
      return
    }

    const response = message as Partial<JsonRPCSuccessResponse & JsonRPCErrorResponse>
    if (typeof response.id === 'string') {
      const pending = this.pendingRequests.get(response.id)
      if (!pending) return
      this.pendingRequests.delete(response.id)
      if ('error' in response && response.error != null) {
        pending.reject(new AppServerRequestError('jsonrpc.request', response.error))
        return
      }
      pending.resolve(response.result)
      return
    }

    const notification = message as JsonRPCNotification
    if (typeof notification.method !== 'string') return

    if (notification.method === 'server/heartbeat') {
      this.handleHeartbeat(notification.params as ServerHeartbeatParams)
    }

    this.emitNotification(notification as AppServerNotification)
  }

  private handleSocketClosed() {
    this.clearHeartbeatTimeout()
    this.initialized = false
    this.socket = null
    this.rejectPendingRequests(new Error('connection closed'))
    if (!this.reconnectWanted) {
      this.updateConnectionState('disconnected')
      return
    }

    this.updateConnectionState('reconnecting')
    this.clearReconnectTimeout()
    this.reconnectTimeoutID = this.setTimeoutFn(() => {
      void this.connect().catch(() => {
        // The next close event will reschedule reconnect.
      })
    }, this.reconnectDelayMs)
  }

  private recoverFromFailedOpen(socket: WebSocketLike) {
    if (this.socket !== socket) {
      return
    }
    this.handleSocketClosed()
    socket.close()
  }

  private async initializeConnection(socket: WebSocketLike) {
    const result = await this.sendRequest(socket, 'initialize', {
      protocolVersions: [...SUPPORTED_PROTOCOL_VERSIONS],
      client: {
        name: 'sigil-web',
        version: '0.1.0',
      },
    })
    negotiateAdapter(result.protocolVersion)
    this.server = result
    this.initialized = true
    this.connectionID += 1
    this.sendNotification(socket, 'initialized', {})
    this.updateConnectionState('ready')
    this.emitChange()
  }

  private isSocketOpen() {
    return this.socket != null && this.socket.readyState === 1
  }

  private rejectPendingRequests(error: Error) {
    for (const pending of this.pendingRequests.values()) {
      pending.reject(error)
    }
    this.pendingRequests.clear()
  }

  private sendNotification<TMethod extends NotificationMethodName>(
    socket: WebSocketLike,
    method: TMethod,
    params: NotificationParams<TMethod>,
  ) {
    if (socket.readyState !== 1) return
    socket.send(
      JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
      }),
    )
  }

  private sendRequest<TMethod extends RequestMethodName>(
    socket: WebSocketLike,
    method: TMethod,
    params: RequestParams<TMethod>,
  ): Promise<RequestResult<TMethod>> {
    if (socket.readyState !== 1) {
      return Promise.reject(new Error('connection is not ready'))
    }
    const id = `${this.connectionKey}:${this.nextRequestID++}`
    return new Promise<RequestResult<TMethod>>((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: (result) => resolve(result as RequestResult<TMethod>),
        reject,
      })
      socket.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id,
          method,
          params,
        }),
      )
    })
  }

  private updateConnectionState(connectionState: SessionConnectionState) {
    if (this.connectionState === connectionState) return
    this.connectionState = connectionState
    this.emitChange()
  }
}
