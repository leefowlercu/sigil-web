import { afterEach, describe, expect, it } from 'vitest'
import { createInitializeResult } from '#/test-fixtures/live-session'
import type { AppServerSessionClient, SessionClientOptions } from './client'
import {
  clearAgentSessionsForTests,
  connectAgentSession,
  getAgentInstanceSnapshots,
  setSessionClientFactoryForTests,
} from './store'

type Deferred<T> = {
  promise: Promise<T>
  reject: (reason?: unknown) => void
  resolve: (value: T | PromiseLike<T>) => void
}

type ConnectPlan = {
  deferred?: Deferred<void>
  reject?: Error
  serverInstanceId: string
}

const connectPlans = new Map<string, ConnectPlan>()

function createDeferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>['resolve']
  let reject!: Deferred<T>['reject']
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

class MockAppServerSessionClient {
  private connectionID = 0
  private connectionState: 'ready' | 'degraded' | 'reconnecting' | 'disconnected' = 'disconnected'
  private initialized = false
  private readonly listeners = new Set<() => void>()
  private readonly endpoint: string
  private lastHeartbeatAt: string | null = null
  private heartbeatIntervalMs: number | null = null
  private readonly connectionKey: string
  private server: ReturnType<typeof createInitializeResult>

  constructor(options: SessionClientOptions) {
    this.connectionKey = options.connectionKey
    this.endpoint = options.endpoint
    this.server = options.server
  }

  async connect(): Promise<void> {
    const plan = connectPlans.get(this.endpoint)
    if (plan?.deferred != null) {
      await plan.deferred.promise
    }
    if (plan?.reject != null) {
      throw plan.reject
    }

    this.server = {
      ...createInitializeResult(),
      instanceId: plan?.serverInstanceId ?? this.server.instanceId,
      instanceName: plan?.serverInstanceId ?? this.server.instanceName,
    }
    this.connectionID += 1
    this.connectionState = 'ready'
    this.initialized = true
    this.emitChange()
  }

  disconnect(): void {
    this.connectionState = 'disconnected'
    this.initialized = false
    this.emitChange()
  }

  getSnapshot() {
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

  reconnect(): void {}

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emitChange() {
    for (const listener of this.listeners) {
      listener()
    }
  }
}

afterEach(() => {
  clearAgentSessionsForTests()
  connectPlans.clear()
  setSessionClientFactoryForTests(null)
})

describe('appserver session store', () => {
  it('keeps a live session hidden until initialize resolves a canonical agent id', async () => {
    setSessionClientFactoryForTests(
      (options) => new MockAppServerSessionClient(options) as unknown as AppServerSessionClient,
    )

    const deferred = createDeferred<void>()
    connectPlans.set('ws://127.0.0.1:8765/app-server', {
      deferred,
      serverInstanceId: 'live-agent',
    })

    const connectPromise = connectAgentSession('ws://127.0.0.1:8765/app-server')

    expect(getAgentInstanceSnapshots()).toEqual([])

    deferred.resolve(undefined)

    await expect(connectPromise).resolves.toEqual({
      status: 'connected',
      agentId: 'live-agent',
    })
    expect(getAgentInstanceSnapshots()).toMatchObject([
      {
        id: 'live-agent',
        endpoint: 'ws://127.0.0.1:8765/app-server',
      },
    ])
  })

  it('rejects a second connection that resolves to an existing canonical agent id', async () => {
    setSessionClientFactoryForTests(
      (options) => new MockAppServerSessionClient(options) as unknown as AppServerSessionClient,
    )

    connectPlans.set('ws://127.0.0.1:8765/app-server', {
      serverInstanceId: 'live-agent',
    })
    connectPlans.set('ws://127.0.0.1:8766/app-server', {
      serverInstanceId: 'live-agent',
    })

    await expect(connectAgentSession('ws://127.0.0.1:8765/app-server')).resolves.toEqual({
      status: 'connected',
      agentId: 'live-agent',
    })

    await expect(connectAgentSession('ws://127.0.0.1:8766/app-server')).resolves.toEqual({
      status: 'duplicate',
      agentId: 'live-agent',
    })
    expect(getAgentInstanceSnapshots()).toHaveLength(1)
    expect(getAgentInstanceSnapshots()[0]?.id).toBe('live-agent')
  })
})
