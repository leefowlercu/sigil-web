import { describe, expect, it } from 'vite-plus/test'

import type { RunSummaryView } from '#/lib/protocol'
import { agentRunsReducer, initialState } from './use-agent-runs'
import type { AgentRunsAction, AgentRunsState } from './use-agent-runs'

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

function reduce(state: AgentRunsState, ...actions: AgentRunsAction[]): AgentRunsState {
  return actions.reduce(agentRunsReducer, state)
}

describe('agentRunsReducer', () => {
  it('RUNS_RESET returns initial state', () => {
    const loaded = reduce(initialState, {
      type: 'RUNS_SNAPSHOT_LOADED',
      runs: [baseRun],
    })
    expect(reduce(loaded, { type: 'RUNS_RESET' })).toEqual(initialState)
  })

  it('RUNS_SNAPSHOT_LOADED populates runs array', () => {
    const runs = [baseRun, { ...baseRun, runId: 'run-2' }]
    const result = reduce(initialState, { type: 'RUNS_SNAPSHOT_LOADED', runs })
    expect(result.runs).toHaveLength(2)
    expect(result.runs.map((run) => run.runId)).toEqual(['run-2', baseRun.runId])
  })

  it('RUN_UPSERTED prepends a new run', () => {
    const loaded = reduce(initialState, {
      type: 'RUNS_SNAPSHOT_LOADED',
      runs: [baseRun],
    })
    const newRun = { ...baseRun, runId: 'run-new', state: 'queued' }
    const result = reduce(loaded, { type: 'RUN_UPSERTED', run: newRun })
    expect(result.runs).toHaveLength(2)
    expect(result.runs[0].runId).toBe('run-new')
  })

  it('RUN_UPSERTED updates an existing run instead of duplicating it', () => {
    const queuedRun: RunSummaryView = {
      ...baseRun,
      state: 'queued',
      startedAt: undefined,
      terminalAt: undefined,
    }
    const startedRun: RunSummaryView = {
      ...queuedRun,
      state: 'running',
      startedAt: '2026-03-18T17:00:00Z',
      pidStatus: 'current',
    }

    const loaded = reduce(initialState, {
      type: 'RUNS_SNAPSHOT_LOADED',
      runs: [queuedRun],
    })
    const result = reduce(loaded, {
      type: 'RUN_UPSERTED',
      run: startedRun,
    })

    expect(result.runs).toHaveLength(1)
    expect(result.runs[0]).toEqual(startedRun)
  })

  it('RUN_REMOVED deletes the matching run', () => {
    const loaded = reduce(initialState, {
      type: 'RUNS_SNAPSHOT_LOADED',
      runs: [baseRun, { ...baseRun, runId: 'run-2' }],
    })
    const result = reduce(loaded, {
      type: 'RUN_REMOVED',
      runId: baseRun.runId,
    })
    expect(result.runs).toHaveLength(1)
    expect(result.runs[0].runId).toBe('run-2')
  })

  it('RUN_UPSERTED keeps newest-first ordering when updating a run', () => {
    const loaded = reduce(initialState, {
      type: 'RUNS_SNAPSHOT_LOADED',
      runs: [
        {
          ...baseRun,
          runId: 'run-old',
          queuedAt: '2026-03-18T16:40:00Z',
        },
        {
          ...baseRun,
          runId: 'run-newer',
          queuedAt: '2026-03-18T16:58:00Z',
        },
      ],
    })
    const result = reduce(loaded, {
      type: 'RUN_UPSERTED',
      run: {
        ...baseRun,
        runId: 'run-old',
        queuedAt: '2026-03-18T17:05:00Z',
      },
    })
    expect(result.runs[0].runId).toBe('run-old')
    expect(result.runs[1].runId).toBe('run-newer')
  })
})
