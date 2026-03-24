import type {
  ErrorObject,
  InitializeResult,
} from '../../src/lib/protocol/current.generated.ts'
import { PROTOCOL_VERSION } from '../../src/lib/protocol/current.generated.ts'
import { WebSocket } from 'ws'

type JSONRPCSuccessEnvelope = {
  jsonrpc: '2.0'
  id: string
  result: unknown
}

type JSONRPCErrorEnvelope = {
  jsonrpc: '2.0'
  id: string
  error: ErrorObject
}

type JSONRPCNotificationEnvelope = {
  jsonrpc: '2.0'
  method: string
  params?: unknown
}

type JSONRPCRequestEnvelope = {
  jsonrpc: '2.0'
  id: string
  method: string
  params?: unknown
}

type PendingRequest = {
  resolve: (result: unknown) => void
  reject: (error: Error) => void
}

export type RPCClientTranscriptEntry = {
  direction: 'inbound' | 'outbound'
  payload: unknown
}

export class RPCRequestError extends Error {
  readonly errorObject: ErrorObject
  readonly method: string

  constructor(method: string, errorObject: ErrorObject) {
    super(`${method} failed: ${errorObject.message}`)
    this.name = 'RPCRequestError'
    this.method = method
    this.errorObject = errorObject
  }
}

export class JSONRPCWebSocketClient {
  private connectPromise: Promise<void> | null = null
  private readonly endpoint: string
  private initialized = false
  private readonly notifications = new Set<
    (notification: JSONRPCNotificationEnvelope) => void
  >()
  private nextID = 0
  private readonly pending = new Map<string, PendingRequest>()
  private socket: WebSocket | null = null
  private readonly transcriptEntries: RPCClientTranscriptEntry[] = []

  constructor(endpoint: string) {
    this.endpoint = endpoint
  }

  async connect(): Promise<void> {
    if (this.initialized && this.socket?.readyState === WebSocket.OPEN) {
      return
    }
    if (this.connectPromise) {
      return this.connectPromise
    }

    this.connectPromise = new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.endpoint)
      this.socket = socket

      const rejectPending = (error: Error) => {
        for (const pending of this.pending.values()) {
          pending.reject(error)
        }
        this.pending.clear()
      }

      socket.on('message', (data) => {
        const raw = typeof data === 'string' ? data : data.toString('utf8')
        let parsed: unknown
        try {
          parsed = JSON.parse(raw)
        } catch {
          return
        }
        this.transcriptEntries.push({
          direction: 'inbound',
          payload: parsed,
        })

        if (parsed == null || typeof parsed !== 'object') {
          return
        }

        const response = parsed as Partial<
          JSONRPCSuccessEnvelope & JSONRPCErrorEnvelope
        >
        if (typeof response.id === 'string') {
          const pending = this.pending.get(response.id)
          if (!pending) return
          this.pending.delete(response.id)
          if (response.error != null) {
            pending.reject(
              new RPCRequestError('jsonrpc.request', response.error),
            )
            return
          }
          pending.resolve(response.result)
          return
        }

        const notification = parsed as Partial<JSONRPCNotificationEnvelope>
        if (typeof notification.method !== 'string') {
          return
        }
        for (const listener of this.notifications) {
          listener(notification as JSONRPCNotificationEnvelope)
        }
      })

      socket.once('open', () => {
        void this.sendRequest<InitializeResult>(socket, 'initialize', {
          protocolVersions: [PROTOCOL_VERSION],
          client: {
            name: 'sigil-web-agent-browser',
            version: '0.1.0',
          },
        })
          .then(async (result) => {
            if (result.protocolVersion !== PROTOCOL_VERSION) {
              throw new Error(
                `unsupported protocol version ${result.protocolVersion}`,
              )
            }
            this.sendNotification(socket, 'initialized', {})
            this.initialized = true
            resolve()
          })
          .catch(reject)
      })

      socket.once('error', (error) => {
        reject(error instanceof Error ? error : new Error(String(error)))
      })

      socket.once('close', () => {
        this.initialized = false
        this.socket = null
        rejectPending(new Error('connection closed'))
      })
    }).finally(() => {
      this.connectPromise = null
    })

    return this.connectPromise
  }

  async close() {
    const socket = this.socket
    if (socket == null) {
      return
    }
    this.socket = null
    this.initialized = false
    await new Promise<void>((resolve) => {
      socket.once('close', () => resolve())
      socket.close()
    })
  }

  getTranscript(): RPCClientTranscriptEntry[] {
    return [...this.transcriptEntries]
  }

  async notify(method: string, params?: unknown) {
    await this.connect()
    const socket = this.socket
    if (socket == null || socket.readyState !== WebSocket.OPEN) {
      throw new Error('connection is not ready')
    }
    this.sendNotification(socket, method, params)
  }

  async request<TResult>(method: string, params?: unknown): Promise<TResult> {
    await this.connect()
    const socket = this.socket
    if (socket == null || socket.readyState !== WebSocket.OPEN) {
      throw new Error('connection is not ready')
    }
    return this.sendRequest<TResult>(socket, method, params)
  }

  private sendNotification(
    socket: WebSocket,
    method: string,
    params?: unknown,
  ) {
    const payload: JSONRPCNotificationEnvelope = {
      jsonrpc: '2.0',
      method,
      params,
    }
    this.transcriptEntries.push({
      direction: 'outbound',
      payload,
    })
    socket.send(JSON.stringify(payload))
  }

  private sendRequest<TResult>(
    socket: WebSocket,
    method: string,
    params?: unknown,
  ): Promise<TResult> {
    const id = `rpc:${this.nextID++}`
    const payload: JSONRPCRequestEnvelope = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    }
    this.transcriptEntries.push({
      direction: 'outbound',
      payload,
    })
    socket.send(JSON.stringify(payload))

    return new Promise<TResult>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (result) => resolve(result as TResult),
        reject,
      })
    })
  }

  subscribeNotifications(
    listener: (notification: JSONRPCNotificationEnvelope) => void,
  ) {
    this.notifications.add(listener)
    return () => {
      this.notifications.delete(listener)
    }
  }
}
