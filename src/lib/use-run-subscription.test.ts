import { describe, expect, it } from 'vitest'

import type {
  EventEnvelopeView,
  RunProjectionView,
  RunStepSummaryView,
} from '#/lib/protocol'
import {
  initialState,
  runSubscriptionReducer,
  type RunSubscriptionAction,
  type RunSubscriptionState,
} from './use-run-subscription'

const baseProjection: RunProjectionView = {
  runId: '019569a1-2b3c-7d4e-8f01-234567890abc',
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

function reduce(
  state: RunSubscriptionState,
  ...actions: RunSubscriptionAction[]
): RunSubscriptionState {
  return actions.reduce(runSubscriptionReducer, state)
}

describe('runSubscriptionReducer', () => {
  it('RESET returns initial state', () => {
    const loaded = reduce(initialState, {
      type: 'SNAPSHOT_LOADED',
      projection: baseProjection,
      events: [baseEvent],
      steps: [baseStep],
    })
    expect(reduce(loaded, { type: 'RESET' })).toEqual(initialState)
  })

  it('SNAPSHOT_LOADED with a running run sets status to active', () => {
    const result = reduce(initialState, {
      type: 'SNAPSHOT_LOADED',
      projection: baseProjection,
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

  it('SUBSCRIPTION_ERROR sets error state', () => {
    const result = reduce(initialState, {
      type: 'SUBSCRIPTION_ERROR',
      error: 'connection lost',
    })
    expect(result.status).toBe('error')
    expect(result.error).toBe('connection lost')
  })
})
