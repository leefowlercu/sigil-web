import { describe, expect, it, vi } from 'vitest'
import type { RunSummaryView } from '#/lib/protocol'
import { agentRunsReducer, initialState } from './use-agent-runs'

function buildRun(overrides: Partial<RunSummaryView> & Pick<RunSummaryView, 'runId' | 'name'>): RunSummaryView {
  return {
    runId: overrides.runId,
    name: overrides.name,
    state: overrides.state ?? 'queued',
    queuedAt: overrides.queuedAt,
    startedAt: overrides.startedAt,
    terminalAt: overrides.terminalAt,
    eventsPath: overrides.eventsPath ?? `/tmp/${overrides.runId}/events.jsonl`,
    pidStatus: overrides.pidStatus ?? 'current',
    stopRequested: overrides.stopRequested ?? false,
    source: overrides.source,
    finalAnswerRef: overrides.finalAnswerRef,
    accountingRef: overrides.accountingRef,
    error: overrides.error,
  }
}

describe('agentRunsReducer', () => {
  it('sorts snapshot runs newest-first by queued time', () => {
    const older = buildRun({
      runId: 'older',
      name: 'older',
      queuedAt: '2026-03-26T18:00:00.000Z',
    })
    const newer = buildRun({
      runId: 'newer',
      name: 'newer',
      queuedAt: '2026-03-26T18:05:00.000Z',
    })

    const nextState = agentRunsReducer(initialState, {
      type: 'RUNS_SNAPSHOT_LOADED',
      runs: [older, newer],
    })

    expect(nextState.runs.map((run) => run.runId)).toEqual(['newer', 'older'])
  })

  it('marks terminal runs with a terminalAt timestamp when status changes', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-26T18:10:00.000Z'))

    const running = buildRun({
      runId: 'live-run',
      name: 'live-run',
      state: 'running',
      queuedAt: '2026-03-26T18:00:00.000Z',
      startedAt: '2026-03-26T18:00:05.000Z',
    })
    const loaded = agentRunsReducer(initialState, {
      type: 'RUNS_SNAPSHOT_LOADED',
      runs: [running],
    })

    const nextState = agentRunsReducer(loaded, {
      type: 'RUN_STATUS_CHANGED',
      runId: 'live-run',
      state: 'completed',
      terminal: true,
    })

    expect(nextState.runs[0]?.state).toBe('completed')
    expect(nextState.runs[0]?.terminalAt).toBe('2026-03-26T18:10:00.000Z')

    vi.useRealTimers()
  })
})
