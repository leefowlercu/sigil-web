// @vitest-environment jsdom

import { waitFor } from '@testing-library/dom'
import * as React from 'react'
import * as ReactDOMClient from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import type { InitializeResult, RunSummaryView } from '#/lib/protocol'
import { PROTOCOL_VERSION } from '#/lib/protocol'
import { useAgentRuns } from './use-agent-runs'

type LiveSessionSnapshot = {
  agentId: string
  connectionID: number
  endpoint: string
  connectionState: 'ready' | 'degraded' | 'reconnecting' | 'disconnected'
  heartbeatIntervalMs: number | null
  initialized: boolean
  lastHeartbeatAt: string | null
  server: InitializeResult
}

type LiveSession = {
  getSnapshot: () => LiveSessionSnapshot
  request: ReturnType<typeof vi.fn>
  subscribeNotifications: ReturnType<
    typeof vi.fn<(_: (notification: unknown) => void) => () => void>
  >
}

const liveStore = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  return {
    listeners,
    state: {
      listAllRuns: vi.fn<() => Promise<RunSummaryView[]>>(async () => []),
      session: null as LiveSession | null,
      snapshot: null as LiveSessionSnapshot | null,
    },
  }
})

vi.mock('./appserver/store', () => ({
  getAgentSession: () => liveStore.state.session,
  getAgentSessionSnapshot: () => liveStore.state.snapshot,
  listAllRuns: () => liveStore.state.listAllRuns(),
  subscribeAgentSessionStore: (listener: () => void) => {
    liveStore.listeners.add(listener)
    return () => {
      liveStore.listeners.delete(listener)
    }
  },
}))

vi.mock('./data', () => ({
  getRunsForAgent: () => [],
}))

const baseServer: InitializeResult = {
  serverName: 'sigil',
  serverVersion: '0.1.0',
  instanceId: 'local-agent',
  instanceName: 'local-agent',
  protocolVersion: PROTOCOL_VERSION,
  methodFamilies: ['run', 'runs', 'server'],
  capabilities: {
    config: {
      defaultVersion: PROTOCOL_VERSION,
      supportedVersions: [PROTOCOL_VERSION],
    },
    views: {
      runTree: true,
      stepDetail: true,
      liveSubscriptions: true,
    },
    protocolArtifacts: true,
  },
}

const baseRun: RunSummaryView = {
  runId: '019569a1-2b3c-7d4e-8f01-234567890abc',
  name: 'test-run',
  state: 'running',
  source: 'app_server.run.start',
  queuedAt: '2026-03-18T16:58:00Z',
  startedAt: '2026-03-18T16:58:01Z',
  eventsPath: '/var/sigil/runs/019569a1/events.jsonl',
  pidStatus: 'current',
  stopRequested: false,
}

const actEnvironmentGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
const originalActEnvironment = actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT
const mountedContainers: HTMLDivElement[] = []
const mountedRoots: ReactDOMClient.Root[] = []

function makeSessionSnapshot(overrides: Partial<LiveSessionSnapshot> = {}): LiveSessionSnapshot {
  return {
    agentId: 'agent-live',
    connectionID: 1,
    endpoint: 'ws://127.0.0.1:8765/app-server',
    connectionState: 'ready',
    heartbeatIntervalMs: 1000,
    initialized: true,
    lastHeartbeatAt: '2026-03-18T17:00:00Z',
    server: baseServer,
    ...overrides,
  }
}

function createLiveSession(args: {
  listSnapshots: RunSummaryView[][]
  subscribeSnapshots: RunSummaryView[][]
  subscribeErrors?: Error[]
}) {
  const notificationListeners = new Set<(notification: unknown) => void>()
  const listAllRuns = vi.fn(async () => args.listSnapshots.shift() ?? [])
  let revision = 1
  const request = vi.fn(async (method: string) => {
    switch (method) {
      case 'runs/subscribe':
        if ((args.subscribeErrors?.length ?? 0) > 0) {
          throw args.subscribeErrors?.shift()
        }
        return {
          payload: {
            items: args.subscribeSnapshots.shift() ?? [],
            revision: revision++,
          },
        }
      case 'runs/unsubscribe':
        return {
          payload: {
            unsubscribed: true,
          },
        }
      default:
        throw new Error(`unexpected request method ${method}`)
    }
  })

  const session: LiveSession = {
    getSnapshot: () => liveStore.state.snapshot as LiveSessionSnapshot,
    request,
    subscribeNotifications: vi.fn((listener: (notification: unknown) => void) => {
      notificationListeners.add(listener)
      return () => {
        notificationListeners.delete(listener)
      }
    }),
  }

  liveStore.state.listAllRuns = listAllRuns
  liveStore.state.session = session
  liveStore.state.snapshot = makeSessionSnapshot()

  return {
    emitNotification: (notification: unknown) => {
      for (const listener of notificationListeners) {
        listener(notification)
      }
    },
    listAllRuns,
    request,
  }
}

function RunsProbe({
  agentId,
  onRuns,
}: {
  agentId: string
  onRuns: (runs: RunSummaryView[]) => void
}) {
  const runs = useAgentRuns(agentId)

  React.useEffect(() => {
    onRuns(runs)
  }, [onRuns, runs])

  return null
}

async function flushEffects() {
  await React.act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

async function renderRunsProbe(props: {
  agentId: string
  onRuns: (runs: RunSummaryView[]) => void
}) {
  const container = document.createElement('div')
  document.body.append(container)
  mountedContainers.push(container)

  const root = ReactDOMClient.createRoot(container)
  mountedRoots.push(root)

  await React.act(async () => {
    root.render(React.createElement(RunsProbe, props))
  })
  await flushEffects()

  return {
    unmount: async () => {
      await React.act(async () => {
        root.unmount()
      })
    },
  }
}

describe('useAgentRuns hook', () => {
  beforeEach(() => {
    actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT = true
    vi.stubEnv('VITE_DATA_SOURCE', 'live')
    liveStore.state.listAllRuns = vi.fn(async () => [])
    liveStore.state.session = null
    liveStore.state.snapshot = null
    liveStore.listeners.clear()
  })

  afterEach(async () => {
    while (mountedRoots.length > 0) {
      const root = mountedRoots.pop()
      if (root) {
        await React.act(async () => {
          root.unmount()
        })
      }
    }
    while (mountedContainers.length > 0) {
      mountedContainers.pop()?.remove()
    }

    actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment
    vi.unstubAllEnvs()
    liveStore.state.listAllRuns = vi.fn(async () => [])
    liveStore.state.session = null
    liveStore.state.snapshot = null
    liveStore.listeners.clear()
  })

  it('applies runs/changed upserts without reloading the list surface', async () => {
    const completedRun: RunSummaryView = {
      ...baseRun,
      state: 'completed',
      terminalAt: '2026-03-18T17:10:00Z',
      pidStatus: 'not_running',
    }
    const { emitNotification, listAllRuns, request } = createLiveSession({
      listSnapshots: [[baseRun]],
      subscribeSnapshots: [[baseRun]],
    })

    let latestRuns: RunSummaryView[] = []
    await renderRunsProbe({
      agentId: 'agent-live',
      onRuns: (runs) => {
        latestRuns = runs
      },
    })

    await waitFor(() => {
      expect(latestRuns[0]?.state).toBe('running')
    })

    await React.act(async () => {
      emitNotification({
        method: 'runs/changed',
        params: {
          revision: 2,
          payload: {
            kind: 'upsert',
            run: completedRun,
          },
        },
      })
    })
    await flushEffects()

    await waitFor(() => {
      expect(latestRuns[0]).toEqual(completedRun)
    })
    expect(latestRuns[0]?.terminalAt).toBe('2026-03-18T17:10:00Z')
    expect(listAllRuns).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith('runs/subscribe', {})
  })

  it('reissues runs/subscribe after a runs/changed reset', async () => {
    const completedRun: RunSummaryView = {
      ...baseRun,
      state: 'completed',
      terminalAt: '2026-03-18T17:10:00Z',
      pidStatus: 'not_running',
    }
    const { emitNotification, request } = createLiveSession({
      listSnapshots: [[baseRun], [completedRun]],
      subscribeSnapshots: [[baseRun], [completedRun]],
    })

    let latestRuns: RunSummaryView[] = []
    await renderRunsProbe({
      agentId: 'agent-live',
      onRuns: (runs) => {
        latestRuns = runs
      },
    })

    await waitFor(() => {
      expect(latestRuns[0]?.state).toBe('running')
    })

    await React.act(async () => {
      emitNotification({
        method: 'runs/changed',
        params: {
          revision: 2,
          payload: {
            kind: 'reset',
          },
        },
      })
    })
    await flushEffects()

    await waitFor(() => {
      expect(request).toHaveBeenCalledTimes(2)
      expect(latestRuns[0]).toEqual(completedRun)
    })
  })

  it('applies run/statusChanged updates to an existing run summary', async () => {
    const { emitNotification, listAllRuns, request } = createLiveSession({
      listSnapshots: [[baseRun]],
      subscribeSnapshots: [[baseRun]],
    })

    let latestRuns: RunSummaryView[] = []
    await renderRunsProbe({
      agentId: 'agent-live',
      onRuns: (runs) => {
        latestRuns = runs
      },
    })

    await waitFor(() => {
      expect(latestRuns[0]?.state).toBe('running')
    })

    await React.act(async () => {
      emitNotification({
        method: 'run/statusChanged',
        params: {
          runId: baseRun.runId,
          seq: 10,
          payload: {
            state: 'completed',
            terminal: true,
          },
        },
      })
    })
    await flushEffects()

    await waitFor(() => {
      expect(latestRuns[0]?.state).toBe('completed')
      expect(latestRuns[0]?.pidStatus).toBe('not_running')
      expect(latestRuns[0]?.terminalAt).toBeTruthy()
    })
    expect(listAllRuns).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith('runs/subscribe', {})
  })

  it('keeps the last loaded snapshot when runs/subscribe fails', async () => {
    const { request } = createLiveSession({
      listSnapshots: [[baseRun]],
      subscribeSnapshots: [],
      subscribeErrors: [new Error('subscription unavailable')],
    })

    let latestRuns: RunSummaryView[] = []
    await renderRunsProbe({
      agentId: 'agent-live',
      onRuns: (runs) => {
        latestRuns = runs
      },
    })

    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('runs/subscribe', {})
      expect(latestRuns).toEqual([baseRun])
    })
  })
})
