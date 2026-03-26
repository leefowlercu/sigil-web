import { describe, expect, it } from 'vitest'
import type { EventEnvelopeView } from '#/lib/protocol'
import { createLiveRunProjection } from '#/test-fixtures/live-session'
import { deriveRunSubscriptionActions, initialState, runSubscriptionReducer } from './use-run-subscription'

function buildEvent(
  overrides: Partial<EventEnvelopeView> & Pick<EventEnvelopeView, 'eventId' | 'seq' | 'ts' | 'type'>,
): EventEnvelopeView {
  return {
    eventId: overrides.eventId,
    schemaVersion: overrides.schemaVersion ?? 'v1',
    runId: overrides.runId ?? 'run-1',
    seq: overrides.seq,
    ts: overrides.ts,
    type: overrides.type,
    causationId: overrides.causationId ?? 'cause-1',
    correlationId: overrides.correlationId ?? 'corr-1',
    payload: overrides.payload ?? {},
    nodeId: overrides.nodeId,
  }
}

describe('run subscription helpers', () => {
  it('derives step lifecycle actions from appended node events', () => {
    const started = buildEvent({
      eventId: 'evt-1',
      seq: 1,
      ts: '2026-03-26T18:00:05.000Z',
      type: 'node.step.started',
      nodeId: 'node-1',
      payload: {
        stepId: 'step-1',
        stepIndex: 1,
        schemaId: 'sigil.rlm.response.v1',
      },
    })
    const completed = buildEvent({
      eventId: 'evt-2',
      seq: 2,
      ts: '2026-03-26T18:00:35.000Z',
      type: 'node.step.completed',
      payload: {
        stepId: 'step-1',
        durationMs: 30000,
        decision: 'final',
      },
    })

    expect(deriveRunSubscriptionActions(started)).toEqual([
      {
        type: 'STEP_STARTED',
        step: {
          nodeId: 'node-1',
          stepId: 'step-1',
          nodeStepIndex: 1,
          stepStartedSeq: 1,
          schemaId: 'sigil.rlm.response.v1',
          state: 'running',
          startedAt: '2026-03-26T18:00:05.000Z',
          actionCount: 0,
          subcallCount: 0,
        },
      },
    ])
    expect(deriveRunSubscriptionActions(completed)).toEqual([
      {
        type: 'STEP_COMPLETED',
        stepId: 'step-1',
        completedAt: '2026-03-26T18:00:35.000Z',
        durationMs: 30000,
        decision: 'final',
      },
    ])
  })

  it('deduplicates appended events and updates terminal status', () => {
    const loaded = runSubscriptionReducer(initialState, {
      type: 'SNAPSHOT_LOADED',
      projection: createLiveRunProjection('running'),
      tree: null,
      events: [],
      steps: [],
    })
    const stepStarted = buildEvent({
      eventId: 'evt-1',
      seq: 1,
      ts: '2026-03-26T18:00:05.000Z',
      type: 'node.step.started',
      nodeId: 'node-1',
      payload: {
        stepId: 'step-1',
        stepIndex: 1,
        schemaId: 'sigil.rlm.response.v1',
      },
    })

    const withEvent = runSubscriptionReducer(loaded, {
      type: 'EVENT_APPENDED',
      event: stepStarted,
    })
    const duplicate = runSubscriptionReducer(withEvent, {
      type: 'EVENT_APPENDED',
      event: stepStarted,
    })
    const terminal = runSubscriptionReducer(duplicate, {
      type: 'STATUS_CHANGED',
      state: 'completed',
      terminal: true,
    })

    expect(withEvent.steps).toHaveLength(1)
    expect(duplicate.events).toHaveLength(1)
    expect(terminal.status).toBe('terminal')
    expect(terminal.projection?.state).toBe('completed')
  })
})
