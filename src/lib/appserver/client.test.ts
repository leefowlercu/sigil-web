import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { InitializeResult } from '#/lib/protocol'
import { AppServerRequestError, AppServerSessionClient } from './client'
import type { WebSocketLike } from './client'

class FakeWebSocket implements WebSocketLike {
  readyState = 0
  readonly sent: string[] = []
  private readonly listeners: Record<
    'close' | 'error' | 'message' | 'open',
    EventListenerOrEventListenerObject[]
  > = {
    close: [],
    error: [],
    message: [],
    open: [],
  }

  addEventListener(
    type: 'close' | 'error' | 'message' | 'open',
    listener: EventListenerOrEventListenerObject,
  ) {
    this.listeners[type].push(listener)
  }

  close() {
    this.readyState = 3
    this.emit('close', {})
  }

  emit(type: 'close' | 'error' | 'message' | 'open', event: unknown) {
    for (const listener of this.listeners[type]) {
      if (typeof listener === 'function') {
        listener(event as Event)
        continue
      }
      listener.handleEvent(event as Event)
    }
  }

  open() {
    this.readyState = 1
    this.emit('open', {})
  }

  receive(message: unknown) {
    this.emit('message', {
      data: JSON.stringify(message),
    })
  }

  send(data: string) {
    this.sent.push(data)
  }
}

const initializedServer: InitializeResult = {
  serverName: 'sigil',
  serverVersion: '0.1.0',
  instanceId: 'local-agent',
  instanceName: 'local-agent',
  protocolVersion: 'sigil.appserver.v1alpha1',
  methodFamilies: ['run', 'runs', 'server'],
  capabilities: {
    config: {
      defaultVersion: 'sigil.appserver.v1alpha1',
      supportedVersions: ['sigil.appserver.v1alpha1'],
    },
    views: {
      runTree: true,
      stepDetail: true,
      liveSubscriptions: true,
    },
    protocolArtifacts: true,
  },
}

function createClientHarness() {
  const sockets: FakeWebSocket[] = []
  const client = new AppServerSessionClient({
    agentId: 'agent_test',
    endpoint: 'ws://127.0.0.1:8765/app-server',
    server: initializedServer,
    webSocketFactory: () => {
      const socket = new FakeWebSocket()
      sockets.push(socket)
      return socket
    },
  })
  return { client, sockets }
}

async function connectClient(client: AppServerSessionClient, sockets: FakeWebSocket[]) {
  const connectPromise = client.connect()
  const socket = sockets[0]
  socket.open()
  const initializeRequest = JSON.parse(socket.sent[0]) as {
    id: string
    method: string
  }
  socket.receive({
    jsonrpc: '2.0',
    id: initializeRequest.id,
    result: initializedServer,
  })
  await connectPromise
  return initializeRequest
}

describe('AppServerSessionClient', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('performs the initialize handshake and sends initialized', async () => {
    const { client, sockets } = createClientHarness()

    await connectClient(client, sockets)

    const initializeRequest = JSON.parse(sockets[0].sent[0]) as {
      method: string
      params: { protocolVersions: string[] }
    }
    const initializedNotification = JSON.parse(sockets[0].sent[1]) as {
      method: string
    }

    expect(initializeRequest.method).toBe('initialize')
    expect(initializeRequest.params.protocolVersions).toEqual(['sigil.appserver.v1alpha1'])
    expect(initializedNotification.method).toBe('initialized')
    expect(client.getSnapshot().connectionState).toBe('ready')
    expect(client.getSnapshot().connectionID).toBe(1)
    expect(client.getSnapshot().server.instanceId).toBe('local-agent')
  })

  it('correlates request responses by id and surfaces JSON-RPC errors', async () => {
    const { client, sockets } = createClientHarness()
    await connectClient(client, sockets)

    const requestPromise = client.request('runs/list', { limit: 1 })
    await Promise.resolve()
    const runListRequest = JSON.parse(sockets[0].sent[2]) as {
      id: string
      method: string
    }
    expect(runListRequest.method).toBe('runs/list')

    sockets[0].receive({
      jsonrpc: '2.0',
      id: runListRequest.id,
      result: {
        payload: {
          items: [],
        },
      },
    })

    await expect(requestPromise).resolves.toEqual({
      payload: {
        items: [],
      },
    })

    const errorPromise = client.request('run/read', {
      runId: '019569a1-2b3c-7d4e-8f01-234567890abc',
    })
    await Promise.resolve()
    const failingRequest = JSON.parse(sockets[0].sent[3]) as { id: string }
    sockets[0].receive({
      jsonrpc: '2.0',
      id: failingRequest.id,
      error: {
        code: -32602,
        message: 'run not found',
        data: {
          code: 'run_not_found',
        },
      },
    })

    await expect(errorPromise).rejects.toBeInstanceOf(AppServerRequestError)
  })

  it('fans out notifications and updates heartbeat health', async () => {
    const { client, sockets } = createClientHarness()
    await connectClient(client, sockets)

    const notifications: string[] = []
    const unsubscribe = client.subscribeNotifications((notification) => {
      notifications.push(notification.method)
    })

    sockets[0].receive({
      jsonrpc: '2.0',
      method: 'server/heartbeat',
      params: {
        instanceId: 'local-agent',
        serverTime: '2026-03-22T21:00:00Z',
        heartbeatIntervalMs: 1000,
      },
    })
    expect(client.getSnapshot().connectionState).toBe('ready')
    expect(client.getSnapshot().heartbeatIntervalMs).toBe(1000)

    await vi.advanceTimersByTimeAsync(2000)
    expect(client.getSnapshot().connectionState).toBe('degraded')

    sockets[0].receive({
      jsonrpc: '2.0',
      method: 'run/eventAppended',
      params: {
        runId: '019569a1-2b3c-7d4e-8f01-234567890abc',
        seq: 2,
        payload: {
          event: {
            eventId: '019569a2-0001-7000-0000-000000000002',
            schemaVersion: 'v1',
            runId: '019569a1-2b3c-7d4e-8f01-234567890abc',
            seq: 2,
            ts: '2026-03-22T21:00:01Z',
            type: 'run.running',
            causationId: '019569a1-2b3c-7d4e-8f01-234567890abc',
            correlationId: '019569a1-2b3c-7d4e-8f01-234567890abc',
            payload: {},
          },
        },
      },
    })

    expect(notifications).toEqual(['server/heartbeat', 'run/eventAppended'])
    unsubscribe()
  })

  it('keeps degraded state until a heartbeat resumes', async () => {
    const { client, sockets } = createClientHarness()
    await connectClient(client, sockets)

    sockets[0].receive({
      jsonrpc: '2.0',
      method: 'server/heartbeat',
      params: {
        instanceId: 'local-agent',
        serverTime: '2026-03-22T21:00:00Z',
        heartbeatIntervalMs: 1000,
      },
    })

    await vi.advanceTimersByTimeAsync(2000)
    expect(client.getSnapshot().connectionState).toBe('degraded')

    const requestPromise = client.request('runs/list', { limit: 1 })
    await Promise.resolve()

    expect(client.getSnapshot().connectionState).toBe('degraded')

    const runListRequest = JSON.parse(sockets[0].sent[2]) as {
      id: string
      method: string
    }
    expect(runListRequest.method).toBe('runs/list')

    sockets[0].receive({
      jsonrpc: '2.0',
      id: runListRequest.id,
      result: {
        payload: {
          items: [],
        },
      },
    })

    await expect(requestPromise).resolves.toEqual({
      payload: {
        items: [],
      },
    })
    expect(client.getSnapshot().connectionState).toBe('degraded')
  })

  it('reconnects after an unexpected close and establishes a new connection id', async () => {
    const { client, sockets } = createClientHarness()
    await connectClient(client, sockets)

    expect(client.getSnapshot().connectionID).toBe(1)

    sockets[0].close()
    expect(client.getSnapshot().connectionState).toBe('reconnecting')

    await vi.advanceTimersByTimeAsync(1000)
    expect(sockets).toHaveLength(2)

    sockets[1].open()
    const reconnectRequest = JSON.parse(sockets[1].sent[0]) as { id: string }
    sockets[1].receive({
      jsonrpc: '2.0',
      id: reconnectRequest.id,
      result: initializedServer,
    })

    await vi.waitFor(() => {
      expect(client.getSnapshot().connectionState).toBe('ready')
      expect(client.getSnapshot().connectionID).toBe(2)
    })
  })

  it('settles failed pre-open connects so reconnect attempts can redial', async () => {
    const { client, sockets } = createClientHarness()

    const connectPromise = client.connect()
    expect(sockets).toHaveLength(1)

    sockets[0].close()

    await expect(connectPromise).rejects.toThrow('connection closed')
    expect(client.getSnapshot().connectionState).toBe('reconnecting')

    await vi.advanceTimersByTimeAsync(1000)
    expect(sockets).toHaveLength(2)

    sockets[1].open()
    const initializeRequest = JSON.parse(sockets[1].sent[0]) as { id: string }
    sockets[1].receive({
      jsonrpc: '2.0',
      id: initializeRequest.id,
      result: initializedServer,
    })

    await vi.waitFor(() => {
      expect(client.getSnapshot().connectionState).toBe('ready')
      expect(client.getSnapshot().connectionID).toBe(1)
    })
  })

  it('redials after initialize fails during protocol negotiation', async () => {
    const { client, sockets } = createClientHarness()

    const connectPromise = client.connect()
    sockets[0].open()
    const initializeRequest = JSON.parse(sockets[0].sent[0]) as { id: string }
    sockets[0].receive({
      jsonrpc: '2.0',
      id: initializeRequest.id,
      result: {
        ...initializedServer,
        protocolVersion: 'sigil.appserver.unsupported',
      },
    })

    await expect(connectPromise).rejects.toThrow()
    expect(client.getSnapshot().connectionState).toBe('reconnecting')

    await vi.advanceTimersByTimeAsync(1000)
    expect(sockets).toHaveLength(2)
  })
})
