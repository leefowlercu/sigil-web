import { describe, expect, it } from 'vitest'

import type { RunSummaryView } from '#/lib/protocol'
import {
  agentRunsReducer,
  initialState,
  type AgentRunsAction,
  type AgentRunsState,
} from './use-agent-runs'

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

function reduce(
  state: AgentRunsState,
  ...actions: AgentRunsAction[]
): AgentRunsState {
  return actions.reduce(agentRunsReducer, state)
}

describe('agentRunsReducer', () => {
  it('RESET returns initial state', () => {
    const loaded = reduce(initialState, {
      type: 'RUNS_LOADED',
      runs: [baseRun],
    })
    expect(reduce(loaded, { type: 'RESET' })).toEqual(initialState)
  })

  it('RUNS_LOADED populates runs array', () => {
    const runs = [baseRun, { ...baseRun, runId: 'run-2' }]
    const result = reduce(initialState, { type: 'RUNS_LOADED', runs })
    expect(result.runs).toHaveLength(2)
    expect(result.runs).toBe(runs)
  })

  it('RUN_STARTED prepends a new run', () => {
    const loaded = reduce(initialState, {
      type: 'RUNS_LOADED',
      runs: [baseRun],
    })
    const newRun = { ...baseRun, runId: 'run-new', state: 'queued' }
    const result = reduce(loaded, { type: 'RUN_STARTED', run: newRun })
    expect(result.runs).toHaveLength(2)
    expect(result.runs[0].runId).toBe('run-new')
  })

  it('RUN_STATE_CHANGED updates state for matching run', () => {
    const loaded = reduce(initialState, {
      type: 'RUNS_LOADED',
      runs: [baseRun],
    })
    const result = reduce(loaded, {
      type: 'RUN_STATE_CHANGED',
      runId: baseRun.runId,
      state: 'completed',
      terminalAt: '2026-03-18T17:10:00Z',
    })
    expect(result.runs[0].state).toBe('completed')
    expect(result.runs[0].terminalAt).toBe('2026-03-18T17:10:00Z')
    expect(result.runs[0].pidStatus).toBe('not_running')
  })

  it('RUN_STATE_CHANGED without terminalAt preserves pidStatus', () => {
    const loaded = reduce(initialState, {
      type: 'RUNS_LOADED',
      runs: [{ ...baseRun, state: 'queued' }],
    })
    const result = reduce(loaded, {
      type: 'RUN_STATE_CHANGED',
      runId: baseRun.runId,
      state: 'running',
    })
    expect(result.runs[0].state).toBe('running')
    expect(result.runs[0].pidStatus).toBe('current')
  })

  it('RUN_STATE_CHANGED does not affect other runs', () => {
    const runs = [baseRun, { ...baseRun, runId: 'run-2' }]
    const loaded = reduce(initialState, { type: 'RUNS_LOADED', runs })
    const result = reduce(loaded, {
      type: 'RUN_STATE_CHANGED',
      runId: baseRun.runId,
      state: 'completed',
      terminalAt: '2026-03-18T17:10:00Z',
    })
    expect(result.runs[0].state).toBe('completed')
    expect(result.runs[1].state).toBe('running')
  })
})
