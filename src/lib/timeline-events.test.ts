import { describe, expect, test } from 'vitest'
import type { EventEnvelopeView } from './protocol'
import {
  buildTurnTokenMap,
  formatDuration,
  formatTokenCount,
  getEventCategory,
  getEventDisplayInfo,
  getEventLabel,
  getEventSummary,
  getDotColorClass,
} from './timeline-events'
import type { EventCategory } from './timeline-events'

/* ------------------------------------------------------------------ */
/*  getEventCategory                                                   */
/* ------------------------------------------------------------------ */

describe('getEventCategory', () => {
  const cases: [string, EventCategory][] = [
    ['run.queued', 'run'],
    ['run.running', 'run'],
    ['run.completed', 'run'],
    ['run.failed', 'run'],
    ['run.interrupted', 'run'],
    ['node.started', 'node'],
    ['node.completed', 'node'],
    ['node.failed', 'node'],
    ['node.step.started', 'step'],
    ['node.step.completed', 'step'],
    ['node.turn.user', 'turn'],
    ['node.turn.model', 'turn'],
    ['node.action.executed', 'action'],
    ['node.subcall.executed', 'action'],
  ]

  test.each(cases)('%s -> %s', (eventType, expected) => {
    expect(getEventCategory(eventType)).toBe(expected)
  })

  test('unknown type falls back to step', () => {
    expect(getEventCategory('something.unknown')).toBe('step')
  })
})

/* ------------------------------------------------------------------ */
/*  getEventLabel                                                      */
/* ------------------------------------------------------------------ */

describe('getEventLabel', () => {
  const cases: [string, string][] = [
    ['run.queued', 'Run queued'],
    ['run.running', 'Run started'],
    ['run.completed', 'Run completed'],
    ['run.failed', 'Run failed'],
    ['run.interrupted', 'Run interrupted'],
    ['node.started', 'Node started'],
    ['node.completed', 'Node completed'],
    ['node.failed', 'Node failed'],
    ['node.step.started', 'Step started'],
    ['node.step.completed', 'Step completed'],
    ['node.turn.user', 'User turn'],
    ['node.turn.model', 'Model turn'],
    ['node.action.executed', 'Action executed'],
    ['node.subcall.executed', 'Subcall executed'],
  ]

  test.each(cases)('%s -> %s', (eventType, expected) => {
    expect(getEventLabel(eventType)).toBe(expected)
  })

  test('unknown type falls back to raw string', () => {
    expect(getEventLabel('custom.event.type')).toBe('custom.event.type')
  })
})

/* ------------------------------------------------------------------ */
/*  formatDuration                                                     */
/* ------------------------------------------------------------------ */

describe('formatDuration', () => {
  const cases: [unknown, string][] = [
    [null, ''],
    [undefined, ''],
    ['not-a-number', ''],
    [0, '0ms'],
    [9, '9ms'],
    [999, '999ms'],
    [1000, '1.0s'],
    [16331, '16.3s'],
    [20329, '20.3s'],
  ]

  test.each(cases)('formatDuration(%s) -> %s', (input, expected) => {
    expect(formatDuration(input)).toBe(expected)
  })
})

/* ------------------------------------------------------------------ */
/*  getEventSummary                                                    */
/* ------------------------------------------------------------------ */

describe('getEventSummary', () => {
  test('run.queued with source', () => {
    expect(getEventSummary('run.queued', { source: 'cli.run.start' })).toBe(
      'from cli.run.start',
    )
  })

  test('run.queued without source', () => {
    expect(getEventSummary('run.queued', {})).toBe('')
  })

  test('run.running', () => {
    expect(
      getEventSummary('run.running', { executor: 'rlm', maxDepth: 3 }),
    ).toBe('executor: rlm, max depth: 3')
  })

  test('run.completed with duration', () => {
    expect(getEventSummary('run.completed', { durationMs: 20329 })).toBe(
      '20.3s',
    )
  })

  test('run.failed with error', () => {
    expect(
      getEventSummary('run.failed', {
        errorCode: 'harness_limit_exceeded',
        errorMessage: 'step limit reached',
      }),
    ).toBe('harness_limit_exceeded: step limit reached')
  })

  test('run.interrupted with reason and by', () => {
    expect(
      getEventSummary('run.interrupted', {
        reason: 'user_request',
        interruptedBy: 'cli.run.stop',
      }),
    ).toBe('user request via cli.run.stop')
  })

  test('node.started root', () => {
    expect(getEventSummary('node.started', { role: 'root', depth: 0 })).toBe(
      'root node, depth 0',
    )
  })

  test('node.started recursive_subcall', () => {
    expect(
      getEventSummary('node.started', {
        role: 'recursive_subcall',
        depth: 1,
      }),
    ).toBe('recursive_subcall node, depth 1')
  })

  test('node.completed', () => {
    expect(getEventSummary('node.completed', { durationMs: 20319 })).toBe(
      '20.3s',
    )
  })

  test('node.failed', () => {
    expect(
      getEventSummary('node.failed', {
        errorCode: 'ERR',
        errorMessage: 'something broke',
      }),
    ).toBe('ERR: something broke')
  })

  test('node.step.started', () => {
    expect(
      getEventSummary('node.step.started', {
        stepIndex: 1,
        schemaId: 'sigil.rlm.response.v1',
      }),
    ).toBe('step #1 (sigil.rlm.response.v1)')
  })

  test('node.step.completed continue', () => {
    expect(
      getEventSummary('node.step.completed', {
        decision: 'continue',
        actionCount: 1,
        durationMs: 16331,
      }),
    ).toBe('continue, 1 action, 16.3s')
  })

  test('node.step.completed final', () => {
    expect(
      getEventSummary('node.step.completed', {
        decision: 'final',
        actionCount: 0,
        durationMs: 3970,
      }),
    ).toBe('final, 0 actions, 4.0s')
  })

  test('node.turn.user with no token map shows pending', () => {
    expect(
      getEventSummary('node.turn.user', {
        stepId: 'step-1',
        role: 'user',
      }),
    ).toBe('awaiting response...')
  })

  test('node.turn.user with token map resolves input tokens', () => {
    const tokenMap = new Map([
      ['step-1', { inputTokens: 4084, outputTokens: 874, totalTokens: 4958 }],
    ])
    expect(
      getEventSummary(
        'node.turn.user',
        { stepId: 'step-1', role: 'user' },
        tokenMap,
      ),
    ).toBe('4,084 input tokens')
  })

  test('node.turn.user with token map but no match shows pending', () => {
    const tokenMap = new Map([
      ['other-step', { inputTokens: 100, outputTokens: 50, totalTokens: 150 }],
    ])
    expect(
      getEventSummary(
        'node.turn.user',
        { stepId: 'step-1', role: 'user' },
        tokenMap,
      ),
    ).toBe('awaiting response...')
  })

  test('node.turn.model with output tokens', () => {
    expect(
      getEventSummary('node.turn.model', {
        role: 'model',
        outputTokens: 874,
      }),
    ).toBe('874 output tokens')
  })

  test('node.turn.model with output and reasoning tokens', () => {
    expect(
      getEventSummary('node.turn.model', {
        role: 'model',
        outputTokens: 874,
        reasoningTokens: 325,
      }),
    ).toBe('874 output tokens (325 reasoning)')
  })

  test('node.turn.model without token fields returns empty', () => {
    expect(getEventSummary('node.turn.model', { role: 'model' })).toBe('')
  })

  test('node.action.executed', () => {
    expect(
      getEventSummary('node.action.executed', {
        actionType: 'repl_code',
        language: 'go',
        status: 'completed',
        durationMs: 9,
      }),
    ).toBe('repl_code (go), completed, 9ms')
  })

  test('node.subcall.executed', () => {
    expect(
      getEventSummary('node.subcall.executed', {
        subcallType: 'rlm_query',
        model: 'openai/gpt-5.3-codex',
        status: 'completed',
        durationMs: 2100,
      }),
    ).toBe('rlm_query (openai/gpt-5.3-codex), completed, 2.1s')
  })

  test('unknown event type returns empty', () => {
    expect(getEventSummary('custom.type', { foo: 'bar' })).toBe('')
  })
})

/* ------------------------------------------------------------------ */
/*  getDotColorClass                                                   */
/* ------------------------------------------------------------------ */

describe('getDotColorClass', () => {
  test('terminal run events have per-type colors', () => {
    expect(getDotColorClass('run.completed', 'run')).toBe(
      'bg-[var(--run-status-completed)]',
    )
    expect(getDotColorClass('run.failed', 'run')).toBe(
      'bg-[var(--run-status-failed)]',
    )
    expect(getDotColorClass('run.interrupted', 'run')).toBe(
      'bg-[var(--run-status-interrupted)]',
    )
  })

  test('run.queued and run.running have per-type colors', () => {
    expect(getDotColorClass('run.queued', 'run')).toBe(
      'bg-[var(--run-status-queued)]',
    )
    expect(getDotColorClass('run.running', 'run')).toBe(
      'bg-[var(--run-status-running)]',
    )
  })

  test('node category uses blue', () => {
    expect(getDotColorClass('node.started', 'node')).toBe(
      'bg-[var(--run-status-running)]',
    )
  })

  test('step category uses foreground', () => {
    expect(getDotColorClass('node.step.started', 'step')).toBe(
      'bg-[var(--foreground)]',
    )
  })

  test('turn category uses muted', () => {
    expect(getDotColorClass('node.turn.user', 'turn')).toBe(
      'bg-[var(--muted-foreground)]',
    )
  })

  test('action category uses amber', () => {
    expect(getDotColorClass('node.action.executed', 'action')).toBe(
      'bg-[var(--run-status-interrupted)]',
    )
  })
})

/* ------------------------------------------------------------------ */
/*  getEventDisplayInfo integration                                    */
/* ------------------------------------------------------------------ */

describe('getEventDisplayInfo', () => {
  test('returns complete info for a run.queued event', () => {
    const event: EventEnvelopeView = {
      eventId: '019d16af-8a30-7aa2-9ed6-8916aea4d849',
      schemaVersion: 'v1',
      runId: '019d16af-8a30-74fd-9ef9-05f82fdc74ec',
      seq: 1,
      ts: '2026-03-22T17:54:56.176711Z',
      type: 'run.queued',
      causationId: '019d16af-8a30-7aa2-9ed6-8916aea4d849',
      correlationId: '019d16af-8a30-74fd-9ef9-05f82fdc74ec',
      payload: {
        name: 'run-start-templated',
        source: 'cli.run.start',
      },
    }

    const info = getEventDisplayInfo(event)
    expect(info.category).toBe('run')
    expect(info.label).toBe('Run queued')
    expect(info.summary).toBe('from cli.run.start')
    expect(info.dotColorClass).toBe('bg-[var(--run-status-queued)]')
    expect(info.isTerminal).toBe(false)
  })

  test('returns complete info for a run.completed event', () => {
    const event: EventEnvelopeView = {
      eventId: 'test-id',
      schemaVersion: 'v1',
      runId: 'test-run',
      seq: 14,
      ts: '2026-03-22T17:55:16.508472Z',
      type: 'run.completed',
      causationId: 'test',
      correlationId: 'test',
      payload: {
        status: 'completed',
        durationMs: 20329,
      },
    }

    const info = getEventDisplayInfo(event)
    expect(info.category).toBe('run')
    expect(info.label).toBe('Run completed')
    expect(info.summary).toBe('20.3s')
    expect(info.dotColorClass).toBe('bg-[var(--run-status-completed)]')
    expect(info.isTerminal).toBe(true)
  })

  test('returns complete info for a node.action.executed event', () => {
    const event: EventEnvelopeView = {
      eventId: 'test-id',
      schemaVersion: 'v1',
      runId: 'test-run',
      seq: 7,
      ts: '2026-03-22T17:55:12.51671Z',
      type: 'node.action.executed',
      nodeId: '019d16af-8a33-739d-ad4c-155d322f3614',
      causationId: 'test',
      correlationId: 'test',
      payload: {
        actionType: 'repl_code',
        language: 'go',
        status: 'completed',
        durationMs: 9,
      },
    }

    const info = getEventDisplayInfo(event)
    expect(info.category).toBe('action')
    expect(info.label).toBe('Action executed')
    expect(info.summary).toBe('repl_code (go), completed, 9ms')
    expect(info.dotColorClass).toBe('bg-[var(--run-status-interrupted)]')
    expect(info.isTerminal).toBe(false)
  })
})

/* ------------------------------------------------------------------ */
/*  formatTokenCount                                                   */
/* ------------------------------------------------------------------ */

describe('formatTokenCount', () => {
  const cases: [number, string][] = [
    [0, '0'],
    [874, '874'],
    [4084, '4,084'],
    [100000, '100,000'],
    [1234567, '1,234,567'],
  ]

  test.each(cases)('formatTokenCount(%s) -> %s', (input, expected) => {
    expect(formatTokenCount(input)).toBe(expected)
  })
})

/* ------------------------------------------------------------------ */
/*  buildTurnTokenMap                                                  */
/* ------------------------------------------------------------------ */

describe('buildTurnTokenMap', () => {
  const makeEvent = (
    type: string,
    payload: Record<string, unknown>,
  ): EventEnvelopeView => ({
    eventId: 'test',
    schemaVersion: 'v1',
    runId: 'test',
    seq: 1,
    ts: '2026-01-01T00:00:00Z',
    type,
    causationId: 'test',
    correlationId: 'test',
    payload,
  })

  test('extracts token data from model turn events', () => {
    const events = [
      makeEvent('node.turn.user', { stepId: 'step-1', role: 'user' }),
      makeEvent('node.turn.model', {
        stepId: 'step-1',
        role: 'model',
        inputTokens: 4084,
        outputTokens: 874,
        totalTokens: 4958,
        reasoningTokens: 325,
      }),
    ]
    const map = buildTurnTokenMap(events)
    expect(map.size).toBe(1)
    expect(map.get('step-1')).toEqual({
      inputTokens: 4084,
      outputTokens: 874,
      totalTokens: 4958,
      reasoningTokens: 325,
    })
  })

  test('returns empty map when no model turns have tokens', () => {
    const events = [
      makeEvent('node.turn.user', { stepId: 'step-1', role: 'user' }),
      makeEvent('node.turn.model', { stepId: 'step-1', role: 'model' }),
    ]
    const map = buildTurnTokenMap(events)
    expect(map.size).toBe(0)
  })

  test('ignores non-turn events', () => {
    const events = [
      makeEvent('run.queued', { name: 'test' }),
      makeEvent('node.step.started', { stepId: 'step-1' }),
    ]
    const map = buildTurnTokenMap(events)
    expect(map.size).toBe(0)
  })
})
