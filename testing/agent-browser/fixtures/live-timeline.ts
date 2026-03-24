import type {
  EventEnvelopeView,
  InitializeResult,
  RunProjectionView,
  RunStepSummaryView,
  RunSummaryView,
  RunTreeReadPayload,
} from '../../../src/lib/protocol/current.generated.ts'
import { PROTOCOL_VERSION } from '../../../src/lib/protocol/current.generated.ts'
import type {
  ScriptedAppServerScenario,
  ScriptedRunFixture,
  ScriptedRunSnapshot,
} from '../types.ts'

export const LIVE_TIMELINE_RUN_ID = '0195b4d0-2b3c-7d4e-8f01-234567890abc'
export const LIVE_TIMELINE_NODE_ID = '0195b4d0-3c4d-7e5f-9012-000000000001'
export const LIVE_TIMELINE_STEP_ID = '0195b4d0-4d5e-7f60-0123-000000000001'
export const LIVE_TIMELINE_INITIAL_SEQ = 6
export const LIVE_TIMELINE_FINAL_SEQ = 10

const baseTime = Date.parse('2026-03-22T18:00:00Z')

function timestampFor(seq: number): string {
  return new Date(baseTime + seq * 1000).toISOString()
}

function cloneEvent(event: EventEnvelopeView): EventEnvelopeView {
  return {
    ...event,
    payload: { ...event.payload },
  }
}

function cloneProjection(projection: RunProjectionView): RunProjectionView {
  return {
    ...projection,
    nodes: projection.nodes.map((node) => ({ ...node })),
  }
}

function cloneSteps(steps: RunStepSummaryView[]): RunStepSummaryView[] {
  return steps.map((step) => ({ ...step }))
}

function cloneTree(tree: RunTreeReadPayload): RunTreeReadPayload {
  return {
    rootNodeId: tree.rootNodeId,
    nodes: tree.nodes.map((node) => ({
      ...node,
      childNodeIds: node.childNodeIds ? [...node.childNodeIds] : undefined,
    })),
  }
}

function serverSnapshot(): InitializeResult {
  return {
    serverName: 'sigil',
    serverVersion: '0.1.0',
    instanceId: 'sigil-scripted-agent-browser',
    instanceName: 'sigil-scripted-agent-browser',
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
}

const allEvents: EventEnvelopeView[] = [
  {
    eventId: '0195b4d0-5001-7000-0000-000000000001',
    schemaVersion: 'v1',
    runId: LIVE_TIMELINE_RUN_ID,
    seq: 1,
    ts: timestampFor(1),
    type: 'run.queued',
    causationId: LIVE_TIMELINE_RUN_ID,
    correlationId: LIVE_TIMELINE_RUN_ID,
    payload: {
      source: 'app-server',
    },
  },
  {
    eventId: '0195b4d0-5001-7000-0000-000000000002',
    schemaVersion: 'v1',
    runId: LIVE_TIMELINE_RUN_ID,
    seq: 2,
    ts: timestampFor(2),
    type: 'run.running',
    causationId: LIVE_TIMELINE_RUN_ID,
    correlationId: LIVE_TIMELINE_RUN_ID,
    payload: {
      executor: 'rlm',
      maxDepth: 2,
    },
  },
  {
    eventId: '0195b4d0-5001-7000-0000-000000000003',
    schemaVersion: 'v1',
    runId: LIVE_TIMELINE_RUN_ID,
    seq: 3,
    ts: timestampFor(3),
    type: 'node.step.started',
    nodeId: LIVE_TIMELINE_NODE_ID,
    causationId: LIVE_TIMELINE_RUN_ID,
    correlationId: LIVE_TIMELINE_RUN_ID,
    payload: {
      stepId: LIVE_TIMELINE_STEP_ID,
      stepIndex: 0,
      schemaId: 'sigil.rlm.response.v1',
    },
  },
  {
    eventId: '0195b4d0-5001-7000-0000-000000000004',
    schemaVersion: 'v1',
    runId: LIVE_TIMELINE_RUN_ID,
    seq: 4,
    ts: timestampFor(4),
    type: 'node.turn.user',
    nodeId: LIVE_TIMELINE_NODE_ID,
    causationId: LIVE_TIMELINE_RUN_ID,
    correlationId: LIVE_TIMELINE_RUN_ID,
    payload: {
      stepId: LIVE_TIMELINE_STEP_ID,
      role: 'user',
    },
  },
  {
    eventId: '0195b4d0-5001-7000-0000-000000000005',
    schemaVersion: 'v1',
    runId: LIVE_TIMELINE_RUN_ID,
    seq: 5,
    ts: timestampFor(5),
    type: 'node.turn.model',
    nodeId: LIVE_TIMELINE_NODE_ID,
    causationId: LIVE_TIMELINE_RUN_ID,
    correlationId: LIVE_TIMELINE_RUN_ID,
    payload: {
      stepId: LIVE_TIMELINE_STEP_ID,
      role: 'assistant',
      inputTokens: 240,
      outputTokens: 64,
      totalTokens: 304,
    },
  },
  {
    eventId: '0195b4d0-5001-7000-0000-000000000006',
    schemaVersion: 'v1',
    runId: LIVE_TIMELINE_RUN_ID,
    seq: 6,
    ts: timestampFor(6),
    type: 'node.action.executed',
    nodeId: LIVE_TIMELINE_NODE_ID,
    causationId: LIVE_TIMELINE_RUN_ID,
    correlationId: LIVE_TIMELINE_RUN_ID,
    payload: {
      stepId: LIVE_TIMELINE_STEP_ID,
      actionType: 'repl_code',
      language: 'go',
      status: 'ok',
      durationMs: 250,
    },
  },
  {
    eventId: '0195b4d0-5001-7000-0000-000000000007',
    schemaVersion: 'v1',
    runId: LIVE_TIMELINE_RUN_ID,
    seq: 7,
    ts: timestampFor(7),
    type: 'node.subcall.executed',
    nodeId: LIVE_TIMELINE_NODE_ID,
    causationId: LIVE_TIMELINE_RUN_ID,
    correlationId: LIVE_TIMELINE_RUN_ID,
    payload: {
      stepId: LIVE_TIMELINE_STEP_ID,
      subcallType: 'rlm_query',
      model: 'gpt-5.3-codex',
      status: 'ok',
      durationMs: 900,
    },
  },
  {
    eventId: '0195b4d0-5001-7000-0000-000000000008',
    schemaVersion: 'v1',
    runId: LIVE_TIMELINE_RUN_ID,
    seq: 8,
    ts: timestampFor(8),
    type: 'node.turn.model',
    nodeId: LIVE_TIMELINE_NODE_ID,
    causationId: LIVE_TIMELINE_RUN_ID,
    correlationId: LIVE_TIMELINE_RUN_ID,
    payload: {
      stepId: LIVE_TIMELINE_STEP_ID,
      role: 'assistant',
      inputTokens: 260,
      outputTokens: 72,
      totalTokens: 332,
      reasoningTokens: 18,
    },
  },
  {
    eventId: '0195b4d0-5001-7000-0000-000000000009',
    schemaVersion: 'v1',
    runId: LIVE_TIMELINE_RUN_ID,
    seq: 9,
    ts: timestampFor(9),
    type: 'node.step.completed',
    nodeId: LIVE_TIMELINE_NODE_ID,
    causationId: LIVE_TIMELINE_RUN_ID,
    correlationId: LIVE_TIMELINE_RUN_ID,
    payload: {
      stepId: LIVE_TIMELINE_STEP_ID,
      decision: 'final',
      actionCount: 2,
      durationMs: 4200,
    },
  },
  {
    eventId: '0195b4d0-5001-7000-0000-000000000010',
    schemaVersion: 'v1',
    runId: LIVE_TIMELINE_RUN_ID,
    seq: 10,
    ts: timestampFor(10),
    type: 'run.completed',
    causationId: LIVE_TIMELINE_RUN_ID,
    correlationId: LIVE_TIMELINE_RUN_ID,
    payload: {
      durationMs: 6200,
    },
  },
]

function buildProjection(seq: number): RunProjectionView {
  const terminal = seq >= LIVE_TIMELINE_FINAL_SEQ
  return {
    runId: LIVE_TIMELINE_RUN_ID,
    name: 'live-timeline-run',
    state: terminal ? 'completed' : 'running',
    runDir: `/tmp/${LIVE_TIMELINE_RUN_ID}`,
    eventsPath: `/tmp/${LIVE_TIMELINE_RUN_ID}/events.jsonl`,
    source: 'app-server',
    queuedAt: timestampFor(1),
    startedAt: timestampFor(2),
    terminalAt: terminal ? timestampFor(LIVE_TIMELINE_FINAL_SEQ) : undefined,
    executor: 'rlm',
    maxDepth: 2,
    pidStatus: terminal ? 'not_running' : 'current',
    stopRequested: false,
    finalAnswerRef: terminal ? 'run-artifact://final-answer.json' : undefined,
    nodeCount: 1,
    stepCount: 1,
    actionCount: seq >= 6 ? 1 : 0,
    subcallCount: seq >= 7 ? 1 : 0,
    nodes: [
      {
        nodeId: LIVE_TIMELINE_NODE_ID,
        depth: 0,
        role: 'root',
        state: terminal ? 'completed' : 'running',
        startedAt: timestampFor(2),
        terminalAt: terminal ? timestampFor(LIVE_TIMELINE_FINAL_SEQ) : undefined,
        stepCount: 1,
      },
    ],
  }
}

function buildSummary(seq: number): RunSummaryView {
  const projection = buildProjection(seq)
  return {
    runId: projection.runId,
    name: projection.name,
    state: projection.state,
    source: projection.source,
    queuedAt: projection.queuedAt,
    startedAt: projection.startedAt,
    terminalAt: projection.terminalAt,
    eventsPath: projection.eventsPath,
    pidStatus: projection.pidStatus,
    stopRequested: projection.stopRequested,
    finalAnswerRef: projection.finalAnswerRef,
    accountingRef: projection.accountingRef,
  }
}

function buildTree(seq: number): RunTreeReadPayload {
  return {
    rootNodeId: LIVE_TIMELINE_NODE_ID,
    nodes: [
      {
        nodeId: LIVE_TIMELINE_NODE_ID,
        depth: 0,
        role: 'root',
        state: seq >= LIVE_TIMELINE_FINAL_SEQ ? 'completed' : 'running',
        startedAt: timestampFor(2),
        terminalAt:
          seq >= LIVE_TIMELINE_FINAL_SEQ ? timestampFor(LIVE_TIMELINE_FINAL_SEQ) : undefined,
        stepCount: 1,
      },
    ],
  }
}

function buildSteps(seq: number): RunStepSummaryView[] {
  const completed = seq >= 9
  return [
    {
      nodeId: LIVE_TIMELINE_NODE_ID,
      stepId: LIVE_TIMELINE_STEP_ID,
      nodeStepIndex: 0,
      stepStartedSeq: 3,
      schemaId: 'sigil.rlm.response.v1',
      decision: completed ? 'final' : undefined,
      state: completed ? 'completed' : 'running',
      startedAt: timestampFor(3),
      completedAt: completed ? timestampFor(9) : undefined,
      durationMs: completed ? 4200 : undefined,
      actionCount: seq >= 6 ? 1 : 0,
      subcallCount: seq >= 7 ? 1 : 0,
    },
  ]
}

export function buildLiveTimelineEvents(lastSeq = LIVE_TIMELINE_INITIAL_SEQ) {
  return allEvents.filter((event) => event.seq <= lastSeq).map(cloneEvent)
}

export function buildLiveTimelineSnapshot(seq: number): ScriptedRunSnapshot {
  const boundedSeq = Math.max(0, Math.min(seq, LIVE_TIMELINE_FINAL_SEQ))
  return {
    summary: buildSummary(boundedSeq),
    projection: cloneProjection(buildProjection(boundedSeq)),
    tree: cloneTree(buildTree(boundedSeq)),
    steps: cloneSteps(buildSteps(boundedSeq)),
    events: buildLiveTimelineEvents(boundedSeq),
    terminal: boundedSeq >= LIVE_TIMELINE_FINAL_SEQ,
  }
}

export function createLiveTimelineRunFixture(): ScriptedRunFixture {
  return {
    runId: LIVE_TIMELINE_RUN_ID,
    initialSeq: LIVE_TIMELINE_INITIAL_SEQ,
    scheduled: [
      {
        atMs: 1000,
        frames: [
          {
            kind: 'notification',
            method: 'run/eventAppended',
            params: {
              runId: LIVE_TIMELINE_RUN_ID,
              seq: 7,
              payload: {
                event: cloneEvent(allEvents[6]),
              },
            },
          },
        ],
      },
      {
        atMs: 2000,
        frames: [
          {
            kind: 'notification',
            method: 'run/eventAppended',
            params: {
              runId: LIVE_TIMELINE_RUN_ID,
              seq: 8,
              payload: {
                event: cloneEvent(allEvents[7]),
              },
            },
          },
        ],
      },
      {
        atMs: 3000,
        frames: [
          {
            kind: 'notification',
            method: 'run/eventAppended',
            params: {
              runId: LIVE_TIMELINE_RUN_ID,
              seq: 9,
              payload: {
                event: cloneEvent(allEvents[8]),
              },
            },
          },
        ],
      },
      {
        atMs: 4000,
        frames: [
          {
            kind: 'notification',
            method: 'run/eventAppended',
            params: {
              runId: LIVE_TIMELINE_RUN_ID,
              seq: 10,
              payload: {
                event: cloneEvent(allEvents[9]),
              },
            },
          },
          {
            kind: 'notification',
            method: 'run/statusChanged',
            params: {
              runId: LIVE_TIMELINE_RUN_ID,
              seq: 10,
              payload: {
                state: 'completed',
                terminal: true,
              },
            },
          },
          {
            kind: 'notification',
            method: 'run/completed',
            params: {
              runId: LIVE_TIMELINE_RUN_ID,
              seq: 10,
              payload: {
                state: 'completed',
                terminal: true,
              },
            },
          },
        ],
      },
    ],
    stateAtSeq(seq: number) {
      return buildLiveTimelineSnapshot(seq)
    },
  }
}

export function createLiveTimelineScenario(): ScriptedAppServerScenario {
  return {
    server: serverSnapshot(),
    heartbeatIntervalMs: 1000,
    runs: [createLiveTimelineRunFixture()],
  }
}
