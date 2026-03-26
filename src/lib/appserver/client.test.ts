import { describe, expect, it, vi } from 'vitest'
import type { InitializeResult } from '#/lib/protocol'
import { createInitializeResult } from '#/test-fixtures/live-session'
import { AppServerSessionClient } from './client'
import type { WebSocketLike } from './client'

function flushPromises(): Promise<void> {
  return Promise.resolve()
}

function invokeListener(listener: EventListenerOrEventListenerObject, event: Event) {
  if (typeof listener === 'function') {
    listener(event)
    return
  }
  listener.handleEvent(event)
}

class MockSocket implements WebSocketLike {
  readonly sentMessages: string[] = []
  readonly initializeResult: InitializeResult
  readyState = 0
  private readonly listeners = new Map<string, EventListenerOrEventListenerObject[]>()

  constructor(initializeResult: InitializeResult) {
    this.initializeResult = initializeResult
  }

  addEventListener(type: 'close' | 'error' | 'message' | 'open', listener: EventListenerOrEventListenerObject) {
    const current = this.listeners.get(type) ?? []
    current.push(listener)
    this.listeners.set(type, current)
  }

  close() {
    if (this.readyState === 3) {
      return
    }
    this.readyState = 3
    this.emit('close', {} as Event)
  }

  emitHeartbeat(heartbeatIntervalMs: number, serverTime = '2026-03-26T18:00:10.000Z') {
    this.emitMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'server/heartbeat',
        params: {
          instanceId: this.initializeResult.instanceId,
          serverTime,
          heartbeatIntervalMs,
        },
      }),
    )
  }

  emitMessage(data: string) {
    this.emit('message', { data } as MessageEvent<string>)
  }

  emitOpen() {
    this.readyState = 1
    this.emit('open', {} as Event)
  }

  send(data: string) {
    this.sentMessages.push(data)
    const message = JSON.parse(data) as {
      id?: string
      method?: string
    }
    if (message.id && message.method === 'initialize') {
      queueMicrotask(() => {
        this.emitMessage(
          JSON.stringify({
            jsonrpc: '2.0',
            id: message.id,
            result: this.initializeResult,
          }),
        )
      })
    }
  }

  private emit(type: string, event: Event) {
    for (const listener of this.listeners.get(type) ?? []) {
      invokeListener(listener, event)
    }
  }
}

describe('AppServerSessionClient', () => {
  it('marks the session degraded after a missed heartbeat window', async () => {
    vi.useFakeTimers()

    const sockets: MockSocket[] = []
    const client = new AppServerSessionClient({
      agentId: 'agent-live',
      endpoint: 'ws://127.0.0.1:8765/app-server',
      reconnectDelayMs: 25,
      server: createInitializeResult(),
      webSocketFactory: () => {
        const socket = new MockSocket(createInitializeResult())
        sockets.push(socket)
        return socket
      },
    })

    const connectPromise = client.connect()
    sockets[0]?.emitOpen()
    await connectPromise

    sockets[0]?.emitHeartbeat(20)
    expect(client.getSnapshot().connectionState).toBe('ready')

    await vi.advanceTimersByTimeAsync(1_001)
    expect(client.getSnapshot().connectionState).toBe('degraded')

    client.disconnect()
    vi.useRealTimers()
  })

  it('reconnects with a fresh socket and increments the connection id', async () => {
    vi.useFakeTimers()

    const sockets: MockSocket[] = []
    const client = new AppServerSessionClient({
      agentId: 'agent-live',
      endpoint: 'ws://127.0.0.1:8765/app-server',
      reconnectDelayMs: 25,
      server: createInitializeResult(),
      webSocketFactory: () => {
        const socket = new MockSocket(createInitializeResult())
        sockets.push(socket)
        return socket
      },
    })

    const firstConnect = client.connect()
    sockets[0]?.emitOpen()
    await firstConnect
    expect(client.getSnapshot().connectionID).toBe(1)

    client.reconnect()
    await flushPromises()
    expect(client.getSnapshot().connectionState).toBe('reconnecting')

    await vi.advanceTimersByTimeAsync(25)
    sockets[1]?.emitOpen()
    await flushPromises()
    await flushPromises()

    expect(client.getSnapshot().connectionState).toBe('ready')
    expect(client.getSnapshot().connectionID).toBe(2)

    client.disconnect()
    vi.useRealTimers()
  })
})
