// @vitest-environment jsdom

import { waitFor } from '@testing-library/dom'
import * as React from 'react'
import * as ReactDOMClient from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  EventEnvelopeView,
  InitializeResult,
  RunProjectionView,
  RunStepSummaryView,
  RunTreeReadPayload,
} from '#/lib/protocol'
import { PROTOCOL_VERSION } from '#/lib/protocol'
import {
  deriveRunSubscriptionActions,
  initialState,
  runSubscriptionReducer,
  useRunSubscription,
} from './use-run-subscription'
import type {
  RunSubscriptionAction,
  RunSubscriptionState,
} from './use-run-subscription'

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
  getSnapshot: ReturnType<typeof vi.fn<() => LiveSessionSnapshot>>
  request: ReturnType<
    typeof vi.fn<
      (
        method: string,
        params?: { runId?: string; afterSeq?: number },
      ) => Promise<unknown>
    >
  >
  subscribeNotifications: ReturnType<
    typeof vi.fn<(_: (notification: unknown) => void) => () => void>
  >
}

const liveStore = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  return {
    listeners,
    state: {
      session: null as LiveSession | null,
      snapshot: null as LiveSessionSnapshot | null,
    },
  }
})

vi.mock('./appserver/store', () => ({
  getAgentSession: () => liveStore.state.session,
  getAgentSessionSnapshot: () => liveStore.state.snapshot,
  subscribeAgentSessionStore: (listener: () => void) => {
    liveStore.listeners.add(listener)
    return () => {
      liveStore.listeners.delete(listener)
    }
  },
}))

vi.mock('./data', () => ({
  getRunSnapshot: () => null,
}))

const baseProjection: RunProjectionView = {
  runId: '019569a1-2b3c-7d4e-8f01-234567890abc',
  name: 'test-run',
  state: 'running',
  runDir: '/var/sigil/runs/019569a1',
  eventsPath: '/var/sigil/runs/019569a1/events.jsonl',
  maxDepth: 2,
  pidStatus: 'current',
  stopRequested: false,
  nodeCount: 1,
  stepCount: 2,
  actionCount: 0,
  subcallCount: 0,
  nodes: [],
}

const baseEvent: EventEnvelopeView = {
  eventId: '019569a2-0001-7000-0000-000000000001',
  schemaVersion: 'v1',
  runId: baseProjection.runId,
  seq: 1,
  ts: '2026-03-18T17:00:00Z',
  type: 'node.step.started',
  causationId: baseProjection.runId,
  correlationId: baseProjection.runId,
  payload: {},
}

const baseStep: RunStepSummaryView = {
  nodeId: '019569a1-3c4d-7e5f-9012-000000000001',
  stepId: '019569a2-4d5e-7f60-0123-000000000001',
  nodeStepIndex: 0,
  stepStartedSeq: 1,
  schemaId: 'sigil.rlm.response.v1',
  state: 'running',
  actionCount: 0,
  subcallCount: 0,
  startedAt: '2026-03-18T17:00:00Z',
}

const baseServer: InitializeResult = {
  serverName: 'sigil',
  serverVersion: '0.1.0',
  instanceId: 'local-agent',
  instanceName: 'local-agent',
  protocolVersion: PROTOCOL_VERSION,
  methodFamilies: ['run', 'server'],
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

const actEnvironmentGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
const originalActEnvironment = actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT
const mountedContainers: HTMLDivElement[] = []
const mountedRoots: ReactDOMClient.Root[] = []

function reduce(
  state: RunSubscriptionState,
  ...actions: RunSubscriptionAction[]
): RunSubscriptionState {
  return actions.reduce(runSubscriptionReducer, state)
}

function makeSessionSnapshot(
  overrides: Partial<LiveSessionSnapshot> = {},
): LiveSessionSnapshot {
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

function makeRunFixture(
  runId: string,
  lastSeq: number,
): {
  events: EventEnvelopeView[]
  projection: RunProjectionView
  steps: RunStepSummaryView[]
  tree: RunTreeReadPayload
} {
  return {
    projection: {
      ...baseProjection,
      runId,
      name: `run-${runId}`,
      eventsPath: `/var/sigil/runs/${runId}/events.jsonl`,
    },
    tree: {
      rootNodeId: baseStep.nodeId,
      nodes: [],
    },
    steps: [
      {
        ...baseStep,
        stepId: `${baseStep.stepId}-${runId}`,
      },
    ],
    events: [
      {
        ...baseEvent,
        eventId: `${baseEvent.eventId}-${runId}-${lastSeq}`,
        runId,
        seq: lastSeq,
      },
    ],
  }
}

function createLiveSession(
  fixtures: Record<string, ReturnType<typeof makeRunFixture>>,
): {
  emitNotification: (notification: unknown) => void
  request: LiveSession['request']
  session: LiveSession
} {
  const notificationListeners = new Set<(notification: unknown) => void>()
  const request = vi.fn<
    (
      method: string,
      params?: { runId?: string; afterSeq?: number },
    ) => Promise<unknown>
  >(async (method, params) => {
    const runId = params?.runId
    const fixture = runId != null ? fixtures[runId] : undefined

    switch (method) {
      case 'run/read':
        return {
          runId,
          payload: { run: fixture?.projection },
        }
      case 'run/tree/read':
        return {
          runId,
          payload: fixture?.tree,
        }
      case 'run/steps/list':
        return {
          runId,
          payload: { steps: fixture?.steps ?? [] },
        }
      case 'run/events/read':
        return {
          runId,
          payload: {
            events: fixture?.events ?? [],
            lastSeq: fixture?.events.at(-1)?.seq ?? 0,
          },
        }
      case 'run/subscribe': {
        const lastSeq = fixture?.events.at(-1)?.seq ?? 0
        if ((params?.afterSeq ?? 0) > lastSeq) {
          throw new Error('invalid_resume_cursor')
        }
        return {
          runId,
          snapshotAsOfSeq: lastSeq,
          payload: {
            snapshot:
              params?.afterSeq == null && fixture
                ? {
                    run: fixture.projection,
                    tree: fixture.tree,
                    terminal: false,
                  }
                : undefined,
            replayEvents:
              params?.afterSeq != null
                ? (fixture?.events ?? []).filter(
                    (event) => event.seq > params.afterSeq!,
                  )
                : undefined,
            terminal: false,
          },
        }
      }
      case 'run/unsubscribe':
        return {
          runId,
          payload: { unsubscribed: true },
        }
      default:
        throw new Error(`unexpected method ${method}`)
    }
  })

  const session: LiveSession = {
    getSnapshot: vi.fn(() => {
      if (liveStore.state.snapshot == null) {
        throw new Error('missing session snapshot')
      }
      return liveStore.state.snapshot
    }),
    request,
    subscribeNotifications: vi.fn(
      (listener: (notification: unknown) => void) => {
        notificationListeners.add(listener)
        return () => {
          notificationListeners.delete(listener)
        }
      },
    ),
  }

  liveStore.state.session = session
  liveStore.state.snapshot = makeSessionSnapshot()
  return {
    emitNotification: (notification: unknown) => {
      for (const listener of notificationListeners) {
        listener(notification)
      }
    },
    request,
    session,
  }
}

function SubscriptionProbe({
  agentId,
  onState,
  runId,
}: {
  agentId: string
  onState: (state: RunSubscriptionState) => void
  runId: string
}) {
  const state = useRunSubscription(agentId, runId)

  React.useEffect(() => {
    onState(state)
  }, [onState, state])

  return null
}

async function flushEffects() {
  await React.act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

async function renderSubscriptionProbe(props: {
  agentId: string
  onState: (state: RunSubscriptionState) => void
  runId: string
}) {
  const container = document.createElement('div')
  document.body.append(container)
  mountedContainers.push(container)

  const root = ReactDOMClient.createRoot(container)
  mountedRoots.push(root)

  await React.act(async () => {
    root.render(React.createElement(SubscriptionProbe, props))
  })
  await flushEffects()

  return {
    rerender: async (nextProps: typeof props) => {
      await React.act(async () => {
        root.render(React.createElement(SubscriptionProbe, nextProps))
      })
      await flushEffects()
    },
    unmount: async () => {
      await React.act(async () => {
        root.unmount()
      })
    },
  }
}

describe('useRunSubscription hook', () => {
  beforeEach(() => {
    actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT = true
    vi.stubEnv('VITE_DATA_SOURCE', 'live')
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
      const container = mountedContainers.pop()
      container?.remove()
    }

    actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment
    vi.unstubAllEnvs()
    liveStore.state.session = null
    liveStore.state.snapshot = null
    liveStore.listeners.clear()
  })

  it('loads a fresh snapshot when live mode switches runs', async () => {
    const runA = makeRunFixture('run-a', 7)
    const runB = makeRunFixture('run-b', 2)
    const { request } = createLiveSession({
      [runA.projection.runId]: runA,
      [runB.projection.runId]: runB,
    })

    let latestState = initialState
    const onState = (state: RunSubscriptionState) => {
      latestState = state
    }

    const rendered = await renderSubscriptionProbe({
      agentId: 'agent-live',
      onState,
      runId: runA.projection.runId,
    })

    await waitFor(() => {
      expect(latestState.projection?.runId).toBe(runA.projection.runId)
      expect(latestState.status).toBe('active')
    })

    request.mockClear()

    await rendered.rerender({
      agentId: 'agent-live',
      onState,
      runId: runB.projection.runId,
    })

    await waitFor(() => {
      expect(latestState.projection?.runId).toBe(runB.projection.runId)
      expect(latestState.status).toBe('active')
    })

    expect(
      request.mock.calls.some(
        ([method, params]) =>
          method === 'run/read' && params?.runId === runB.projection.runId,
      ),
    ).toBe(true)

    const runBSubscribeCall = request.mock.calls.find(
      ([method, params]) =>
        method === 'run/subscribe' && params?.runId === runB.projection.runId,
    )
    expect(runBSubscribeCall?.[1]).toEqual({ runId: runB.projection.runId })
  })

  it('skips cleanup unsubscribe after the tracked session has been removed', async () => {
    const runA = makeRunFixture('run-a', 7)
    const { request, session } = createLiveSession({
      [runA.projection.runId]: runA,
    })

    let latestState = initialState
    const onState = (state: RunSubscriptionState) => {
      latestState = state
    }

    const rendered = await renderSubscriptionProbe({
      agentId: 'agent-live',
      onState,
      runId: runA.projection.runId,
    })

    await waitFor(() => {
      expect(latestState.projection?.runId).toBe(runA.projection.runId)
      expect(latestState.status).toBe('active')
    })

    request.mockClear()
    liveStore.state.session = null
    liveStore.state.snapshot = null
    session.getSnapshot.mockReturnValue(
      makeSessionSnapshot({
        connectionState: 'disconnected',
        initialized: false,
      }),
    )

    await rendered.unmount()

    expect(request).not.toHaveBeenCalled()
  })

  it('applies run projections from run/started notifications', async () => {
    const queuedRun = makeRunFixture('run-queued', 2)
    queuedRun.projection = {
      ...queuedRun.projection,
      state: 'queued',
      pidStatus: 'not_running',
      startedAt: undefined,
      nodeCount: 0,
      stepCount: 0,
      actionCount: 0,
      subcallCount: 0,
      nodes: [],
    }
    queuedRun.steps = []
    queuedRun.events = [
      {
        ...baseEvent,
        eventId: `${baseEvent.eventId}-${queuedRun.projection.runId}-queued`,
        runId: queuedRun.projection.runId,
        seq: 2,
        type: 'run.queued',
        payload: {},
      },
    ]

    const startedProjection: RunProjectionView = {
      ...queuedRun.projection,
      state: 'running',
      startedAt: '2026-03-18T17:01:00Z',
      pidStatus: 'current',
      nodeCount: 1,
      stepCount: 1,
    }

    const { emitNotification } = createLiveSession({
      [queuedRun.projection.runId]: queuedRun,
    })

    let latestState = initialState
    const onState = (state: RunSubscriptionState) => {
      latestState = state
    }

    await renderSubscriptionProbe({
      agentId: 'agent-live',
      onState,
      runId: queuedRun.projection.runId,
    })

    await waitFor(() => {
      expect(latestState.projection?.state).toBe('queued')
      expect(latestState.projection?.startedAt).toBeUndefined()
    })

    await React.act(async () => {
      emitNotification({
        method: 'run/started',
        params: {
          runId: queuedRun.projection.runId,
          seq: 3,
          payload: {
            run: startedProjection,
          },
        },
      })
      emitNotification({
        method: 'run/statusChanged',
        params: {
          runId: queuedRun.projection.runId,
          seq: 3,
          payload: {
            state: 'running',
            terminal: false,
          },
        },
      })
    })

    await waitFor(() => {
      expect(latestState.projection?.state).toBe('running')
      expect(latestState.projection?.startedAt).toBe(
        startedProjection.startedAt,
      )
      expect(latestState.projection?.pidStatus).toBe(
        startedProjection.pidStatus,
      )
      expect(latestState.projection?.nodeCount).toBe(
        startedProjection.nodeCount,
      )
    })
  })
})

describe('runSubscriptionReducer', () => {
  it('RESET returns initial state', () => {
    const loaded = reduce(initialState, {
      type: 'SNAPSHOT_LOADED',
      projection: baseProjection,
      tree: null,
      events: [baseEvent],
      steps: [baseStep],
    })
    expect(reduce(loaded, { type: 'RESET' })).toEqual(initialState)
  })

  it('SNAPSHOT_LOADED with a running run sets status to active', () => {
    const result = reduce(initialState, {
      type: 'SNAPSHOT_LOADED',
      projection: baseProjection,
      tree: null,
      events: [baseEvent],
      steps: [baseStep],
    })
    expect(result.status).toBe('active')
    expect(result.projection).toBe(baseProjection)
    expect(result.events).toEqual([baseEvent])
    expect(result.steps).toEqual([baseStep])
    expect(result.terminal).toBe(false)
  })

  it('SNAPSHOT_LOADED with a terminal run sets status to terminal', () => {
    const terminalProjection = { ...baseProjection, state: 'completed' }
    const result = reduce(initialState, {
      type: 'SNAPSHOT_LOADED',
      projection: terminalProjection,
      tree: null,
      events: [],
      steps: [],
    })
    expect(result.status).toBe('terminal')
    expect(result.terminal).toBe(true)
  })

  it('EVENT_APPENDED appends to events array', () => {
    const active = reduce(initialState, {
      type: 'SNAPSHOT_LOADED',
      projection: baseProjection,
      tree: null,
      events: [baseEvent],
      steps: [],
    })
    const newEvent = { ...baseEvent, seq: 2, eventId: 'new-event-id' }
    const result = reduce(active, { type: 'EVENT_APPENDED', event: newEvent })
    expect(result.events).toHaveLength(2)
    expect(result.events[1]).toBe(newEvent)
  })

  it('STATUS_CHANGED with terminal true transitions status', () => {
    const active = reduce(initialState, {
      type: 'SNAPSHOT_LOADED',
      projection: baseProjection,
      tree: null,
      events: [],
      steps: [],
    })
    const result = reduce(active, {
      type: 'STATUS_CHANGED',
      state: 'completed',
      terminal: true,
    })
    expect(result.status).toBe('terminal')
    expect(result.terminal).toBe(true)
    expect(result.projection?.state).toBe('completed')
  })

  it('STATUS_CHANGED with terminal false preserves active status', () => {
    const active = reduce(initialState, {
      type: 'SNAPSHOT_LOADED',
      projection: { ...baseProjection, state: 'queued' },
      tree: null,
      events: [],
      steps: [],
    })
    const result = reduce(active, {
      type: 'STATUS_CHANGED',
      state: 'running',
      terminal: false,
    })
    expect(result.status).toBe('active')
    expect(result.projection?.state).toBe('running')
  })

  it('PROJECTION_UPDATED replaces projection wholesale', () => {
    const active = reduce(initialState, {
      type: 'SNAPSHOT_LOADED',
      projection: baseProjection,
      tree: null,
      events: [],
      steps: [],
    })
    const updated = { ...baseProjection, nodeCount: 5, stepCount: 10 }
    const result = reduce(active, {
      type: 'PROJECTION_UPDATED',
      projection: updated,
    })
    expect(result.projection).toBe(updated)
  })

  it('STEP_STARTED appends a new step', () => {
    const active = reduce(initialState, {
      type: 'SNAPSHOT_LOADED',
      projection: baseProjection,
      tree: null,
      events: [],
      steps: [baseStep],
    })
    const newStep = { ...baseStep, stepId: 'new-step-id', nodeStepIndex: 1 }
    const result = reduce(active, { type: 'STEP_STARTED', step: newStep })
    expect(result.steps).toHaveLength(2)
    expect(result.steps[1]).toBe(newStep)
  })

  it('STEP_COMPLETED updates matching step fields', () => {
    const active = reduce(initialState, {
      type: 'SNAPSHOT_LOADED',
      projection: baseProjection,
      tree: null,
      events: [],
      steps: [baseStep],
    })
    const result = reduce(active, {
      type: 'STEP_COMPLETED',
      stepId: baseStep.stepId,
      completedAt: '2026-03-18T17:00:05Z',
      durationMs: 5000,
      decision: 'final',
    })
    expect(result.steps[0].state).toBe('completed')
    expect(result.steps[0].completedAt).toBe('2026-03-18T17:00:05Z')
    expect(result.steps[0].durationMs).toBe(5000)
    expect(result.steps[0].decision).toBe('final')
  })

  it('EVENT_APPENDED derives action counts once for duplicate seq values', () => {
    const active = reduce(initialState, {
      type: 'SNAPSHOT_LOADED',
      projection: baseProjection,
      tree: null,
      events: [],
      steps: [baseStep],
    })
    const actionEvent: EventEnvelopeView = {
      ...baseEvent,
      type: 'node.action.executed',
      payload: {
        stepId: baseStep.stepId,
      },
    }

    const once = reduce(active, {
      type: 'EVENT_APPENDED',
      event: actionEvent,
    })
    const twice = reduce(once, {
      type: 'EVENT_APPENDED',
      event: actionEvent,
    })

    expect(once.events).toHaveLength(1)
    expect(once.steps[0].actionCount).toBe(1)
    expect(twice.events).toHaveLength(1)
    expect(twice.steps[0].actionCount).toBe(1)
  })

  it('TERMINAL_RECONCILED replaces projection and steps with terminal data', () => {
    const active = reduce(initialState, {
      type: 'SNAPSHOT_LOADED',
      projection: baseProjection,
      tree: null,
      events: [],
      steps: [baseStep],
    })
    const result = reduce(active, {
      type: 'TERMINAL_RECONCILED',
      projection: {
        ...baseProjection,
        state: 'completed',
        terminalAt: '2026-03-18T17:10:00Z',
      },
      tree: {
        rootNodeId: baseStep.nodeId,
        nodes: [],
      },
      steps: [
        {
          ...baseStep,
          state: 'completed',
          completedAt: '2026-03-18T17:10:00Z',
          durationMs: 1000,
        },
      ],
    })
    expect(result.status).toBe('terminal')
    expect(result.terminal).toBe(true)
    expect(result.projection?.state).toBe('completed')
    expect(result.tree?.rootNodeId).toBe(baseStep.nodeId)
    expect(result.steps[0].state).toBe('completed')
  })

  it('SUBSCRIPTION_ERROR sets error state', () => {
    const result = reduce(initialState, {
      type: 'SUBSCRIPTION_ERROR',
      error: 'connection lost',
    })
    expect(result.status).toBe('error')
    expect(result.error).toBe('connection lost')
  })
})

describe('deriveRunSubscriptionActions', () => {
  it('derives STEP_STARTED from node.step.started events', () => {
    const actions = deriveRunSubscriptionActions({
      ...baseEvent,
      type: 'node.step.started',
      nodeId: baseStep.nodeId,
      payload: {
        stepId: baseStep.stepId,
        stepIndex: 0,
        schemaId: baseStep.schemaId,
      },
    })
    expect(actions).toEqual([
      {
        type: 'STEP_STARTED',
        step: {
          nodeId: baseStep.nodeId,
          stepId: baseStep.stepId,
          nodeStepIndex: 0,
          stepStartedSeq: 1,
          schemaId: baseStep.schemaId,
          state: 'running',
          startedAt: baseEvent.ts,
          actionCount: 0,
          subcallCount: 0,
        },
      },
    ])
  })

  it('derives STEP_COMPLETED from node.step.completed events', () => {
    const actions = deriveRunSubscriptionActions({
      ...baseEvent,
      type: 'node.step.completed',
      payload: {
        stepId: baseStep.stepId,
        durationMs: 2500,
        decision: 'continue',
      },
    })
    expect(actions).toEqual([
      {
        type: 'STEP_COMPLETED',
        stepId: baseStep.stepId,
        completedAt: baseEvent.ts,
        durationMs: 2500,
        decision: 'continue',
      },
    ])
  })
})
