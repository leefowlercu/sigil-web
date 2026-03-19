import type {
  EventEnvelopeView,
  InitializeResult,
  RunNodeProjectionView,
  RunProjectionView,
  RunStepSummaryView,
  RunSummaryView,
} from './protocol'
import { PROTOCOL_VERSION } from './protocol'

/* ------------------------------------------------------------------ */
/*  Client-side types                                                  */
/* ------------------------------------------------------------------ */

export type RunState =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'interrupted'

export type ConnectionState =
  | 'ready'
  | 'degraded'
  | 'reconnecting'
  | 'disconnected'

export type AgentInstance = {
  id: string
  endpoint: string
  connectionState: ConnectionState
  server: InitializeResult
}

export type RunDetailView = {
  projection: RunProjectionView
  events: EventEnvelopeView[]
  steps: RunStepSummaryView[]
}

/* ------------------------------------------------------------------ */
/*  Demo data: session                                                 */
/* ------------------------------------------------------------------ */

export const sessionSummary = {
  endpoint: 'ws://127.0.0.1:8765/app-server',
  instanceName: 'dev-localhost',
  protocolVersion: PROTOCOL_VERSION,
  status: 'ready',
  capabilitiesConfig: PROTOCOL_VERSION,
}

/* ------------------------------------------------------------------ */
/*  Demo data: agent instances                                         */
/* ------------------------------------------------------------------ */

const serverCapabilities = {
  config: {
    defaultVersion: PROTOCOL_VERSION,
    supportedVersions: [PROTOCOL_VERSION],
  },
  views: { runTree: true, stepDetail: true, liveSubscriptions: true },
  protocolArtifacts: true,
}

export const demoAgents: AgentInstance[] = [
  {
    id: 'agent_control_plane',
    endpoint: 'ws://10.0.1.12:8765/app-server',
    connectionState: 'ready',
    server: {
      serverName: 'sigil',
      serverVersion: '0.1.0',
      instanceId: 'control-plane',
      instanceName: 'control-plane',
      protocolVersion: PROTOCOL_VERSION,
      methodFamilies: ['run', 'server'],
      capabilities: serverCapabilities,
    },
  },
  {
    id: 'agent_spec_governance',
    endpoint: 'ws://10.0.1.13:8765/app-server',
    connectionState: 'ready',
    server: {
      serverName: 'sigil',
      serverVersion: '0.1.0',
      instanceId: 'spec-governance',
      instanceName: 'spec-governance',
      protocolVersion: PROTOCOL_VERSION,
      methodFamilies: ['run', 'server'],
      capabilities: serverCapabilities,
    },
  },
  {
    id: 'agent_ops_sandbox',
    endpoint: 'ws://10.0.1.14:8765/app-server',
    connectionState: 'degraded',
    server: {
      serverName: 'sigil',
      serverVersion: '0.1.0',
      instanceId: 'ops-sandbox',
      instanceName: 'ops-sandbox',
      protocolVersion: PROTOCOL_VERSION,
      methodFamilies: ['run', 'server'],
      capabilities: serverCapabilities,
    },
  },
]

/* ------------------------------------------------------------------ */
/*  Demo data: run summaries (from run/list)                           */
/* ------------------------------------------------------------------ */

type AgentRunSummary = { agentId: string; run: RunSummaryView }

const demoRunSummaries: AgentRunSummary[] = [
  {
    agentId: demoAgents[0].id,
    run: {
      runId: '019569a1-2b3c-7d4e-8f01-234567890abc',
      state: 'running',
      source: 'app_server.run.start',
      queuedAt: '2026-03-18T16:58:00Z',
      startedAt: '2026-03-18T16:58:01Z',
      eventsPath: '/var/sigil/runs/019569a1-2b3c-7d4e-8f01-234567890abc/events.jsonl',
      pidStatus: 'current',
      stopRequested: false,
    },
  },
  {
    agentId: demoAgents[1].id,
    run: {
      runId: '019569a0-1a2b-7c3d-8e0f-123456789def',
      state: 'completed',
      source: 'cli.run.start',
      queuedAt: '2026-03-18T16:41:00Z',
      startedAt: '2026-03-18T16:41:01Z',
      terminalAt: '2026-03-18T16:41:14Z',
      eventsPath: '/var/sigil/runs/019569a0-1a2b-7c3d-8e0f-123456789def/events.jsonl',
      pidStatus: 'not_running',
      stopRequested: false,
    },
  },
  {
    agentId: demoAgents[2].id,
    run: {
      runId: '0195699f-0a1b-7c2d-8e3f-0123456789ab',
      state: 'interrupted',
      source: 'app_server.run.start',
      queuedAt: '2026-03-18T16:16:00Z',
      startedAt: '2026-03-18T16:16:01Z',
      terminalAt: '2026-03-18T16:17:05Z',
      eventsPath: '/var/sigil/runs/0195699f-0a1b-7c2d-8e3f-0123456789ab/events.jsonl',
      pidStatus: 'not_running',
      stopRequested: true,
    },
  },
]

/* ------------------------------------------------------------------ */
/*  Demo data: run detail views (from run/read + run/events/read +     */
/*  run/steps/list)                                                    */
/* ------------------------------------------------------------------ */

const run0Id = demoRunSummaries[0].run.runId
const run1Id = demoRunSummaries[1].run.runId
const run2Id = demoRunSummaries[2].run.runId

const demoNodes0: RunNodeProjectionView[] = [
  {
    nodeId: '019569a1-3c4d-7e5f-9012-000000000001',
    depth: 0,
    role: 'root',
    state: 'running',
    startedAt: '2026-03-18T16:58:01Z',
    stepCount: 3,
  },
  {
    nodeId: '019569a1-3c4d-7e5f-9012-000000000002',
    parentNodeId: '019569a1-3c4d-7e5f-9012-000000000001',
    depth: 1,
    role: 'recursive_subcall',
    state: 'completed',
    startedAt: '2026-03-18T16:58:04Z',
    terminalAt: '2026-03-18T16:59:30Z',
    stepCount: 5,
  },
  {
    nodeId: '019569a1-3c4d-7e5f-9012-000000000003',
    parentNodeId: '019569a1-3c4d-7e5f-9012-000000000001',
    depth: 1,
    role: 'recursive_subcall',
    state: 'running',
    startedAt: '2026-03-18T16:59:31Z',
    stepCount: 2,
  },
]

const demoNodes1: RunNodeProjectionView[] = [
  {
    nodeId: '019569a0-2b3c-7d4e-9012-000000000001',
    depth: 0,
    role: 'root',
    state: 'completed',
    startedAt: '2026-03-18T16:41:01Z',
    terminalAt: '2026-03-18T16:41:14Z',
    stepCount: 4,
  },
  {
    nodeId: '019569a0-2b3c-7d4e-9012-000000000002',
    parentNodeId: '019569a0-2b3c-7d4e-9012-000000000001',
    depth: 1,
    role: 'recursive_subcall',
    state: 'completed',
    startedAt: '2026-03-18T16:41:03Z',
    terminalAt: '2026-03-18T16:41:12Z',
    stepCount: 2,
  },
]

const demoNodes2: RunNodeProjectionView[] = [
  {
    nodeId: '0195699f-1b2c-7d3e-9012-000000000001',
    depth: 0,
    role: 'root',
    state: 'interrupted',
    startedAt: '2026-03-18T16:16:01Z',
    terminalAt: '2026-03-18T16:17:05Z',
    stepCount: 2,
  },
]

const demoDetails: Record<string, RunDetailView> = {
  [run0Id]: {
    projection: {
      runId: run0Id,
      state: 'running',
      runDir: `/var/sigil/runs/${run0Id}`,
      eventsPath: `/var/sigil/runs/${run0Id}/events.jsonl`,
      source: 'app_server.run.start',
      queuedAt: '2026-03-18T16:58:00Z',
      startedAt: '2026-03-18T16:58:01Z',
      executor: 'rlm',
      maxDepth: 2,
      pidStatus: 'current',
      stopRequested: false,
      nodeCount: 3,
      stepCount: 10,
      actionCount: 4,
      subcallCount: 2,
      nodes: demoNodes0,
    },
    steps: [
      {
        nodeId: demoNodes0[2].nodeId,
        stepId: '019569a2-4d5e-7f60-0123-000000000017',
        nodeStepIndex: 0,
        stepStartedSeq: 43,
        schemaId: 'sigil.rlm.response.v1',
        decision: 'continue',
        state: 'completed',
        startedAt: '2026-03-18T17:02:10Z',
        completedAt: '2026-03-18T17:02:18Z',
        durationMs: 8000,
        actionCount: 1,
        subcallCount: 0,
      },
      {
        nodeId: demoNodes0[2].nodeId,
        stepId: '019569a2-4d5e-7f60-0123-000000000018',
        nodeStepIndex: 1,
        stepStartedSeq: 46,
        schemaId: 'sigil.rlm.response.v1',
        state: 'running',
        startedAt: '2026-03-18T17:02:20Z',
        actionCount: 0,
        subcallCount: 0,
      },
    ],
    events: [
      {
        eventId: '019569a2-5e6f-7012-3456-000000000045',
        schemaVersion: 'v1',
        runId: run0Id,
        seq: 45,
        ts: '2026-03-18T17:02:14Z',
        type: 'node.step.completed',
        nodeId: demoNodes0[2].nodeId,
        causationId: run0Id,
        correlationId: run0Id,
        payload: { decision: 'continue' },
      },
      {
        eventId: '019569a2-6f70-7123-4567-000000000046',
        schemaVersion: 'v1',
        runId: run0Id,
        seq: 46,
        ts: '2026-03-18T17:02:20Z',
        type: 'node.step.started',
        nodeId: demoNodes0[2].nodeId,
        causationId: run0Id,
        correlationId: run0Id,
        payload: { schemaId: 'sigil.rlm.response.v1' },
      },
      {
        eventId: '019569a2-7081-7234-5678-000000000047',
        schemaVersion: 'v1',
        runId: run0Id,
        seq: 47,
        ts: '2026-03-18T17:02:27Z',
        type: 'node.turn.model',
        nodeId: demoNodes0[2].nodeId,
        causationId: run0Id,
        correlationId: run0Id,
        payload: { artifactRef: `artifact://${run0Id}/node/${demoNodes0[2].nodeId}/step/1/model-turn` },
      },
      {
        eventId: '019569a2-8192-7345-6789-000000000048',
        schemaVersion: 'v1',
        runId: run0Id,
        seq: 48,
        ts: '2026-03-18T17:02:34Z',
        type: 'node.action.executed',
        nodeId: demoNodes0[2].nodeId,
        causationId: run0Id,
        correlationId: run0Id,
        payload: { actionIndex: 0 },
      },
    ],
  },
  [run1Id]: {
    projection: {
      runId: run1Id,
      state: 'completed',
      runDir: `/var/sigil/runs/${run1Id}`,
      eventsPath: `/var/sigil/runs/${run1Id}/events.jsonl`,
      source: 'cli.run.start',
      queuedAt: '2026-03-18T16:41:00Z',
      startedAt: '2026-03-18T16:41:01Z',
      terminalAt: '2026-03-18T16:41:14Z',
      executor: 'rlm',
      maxDepth: 2,
      pidStatus: 'not_running',
      stopRequested: false,
      nodeCount: 2,
      stepCount: 6,
      actionCount: 2,
      subcallCount: 1,
      nodes: demoNodes1,
    },
    steps: [
      {
        nodeId: demoNodes1[1].nodeId,
        stepId: '019569a0-3c4d-7e5f-0123-000000000011',
        nodeStepIndex: 0,
        stepStartedSeq: 28,
        schemaId: 'sigil.rlm.response.v1',
        decision: 'continue',
        state: 'completed',
        startedAt: '2026-03-18T16:41:05Z',
        completedAt: '2026-03-18T16:41:09Z',
        durationMs: 4000,
        actionCount: 1,
        subcallCount: 0,
      },
      {
        nodeId: demoNodes1[1].nodeId,
        stepId: '019569a0-3c4d-7e5f-0123-000000000012',
        nodeStepIndex: 1,
        stepStartedSeq: 30,
        schemaId: 'sigil.rlm.response.v1',
        decision: 'final',
        state: 'completed',
        startedAt: '2026-03-18T16:41:10Z',
        completedAt: '2026-03-18T16:41:12Z',
        durationMs: 2000,
        actionCount: 0,
        subcallCount: 0,
      },
    ],
    events: [
      {
        eventId: '019569a0-4d5e-7f60-1234-000000000030',
        schemaVersion: 'v1',
        runId: run1Id,
        seq: 30,
        ts: '2026-03-18T16:41:07Z',
        type: 'node.step.completed',
        nodeId: demoNodes1[1].nodeId,
        causationId: run1Id,
        correlationId: run1Id,
        payload: { decision: 'continue' },
      },
      {
        eventId: '019569a0-5e6f-7012-2345-000000000031',
        schemaVersion: 'v1',
        runId: run1Id,
        seq: 31,
        ts: '2026-03-18T16:41:13Z',
        type: 'node.completed',
        nodeId: demoNodes1[1].nodeId,
        causationId: run1Id,
        correlationId: run1Id,
        payload: {},
      },
      {
        eventId: '019569a0-6f70-7123-3456-000000000032',
        schemaVersion: 'v1',
        runId: run1Id,
        seq: 32,
        ts: '2026-03-18T16:41:14Z',
        type: 'run.completed',
        causationId: run1Id,
        correlationId: run1Id,
        payload: { state: 'completed', terminal: true },
      },
    ],
  },
  [run2Id]: {
    projection: {
      runId: run2Id,
      state: 'interrupted',
      runDir: `/var/sigil/runs/${run2Id}`,
      eventsPath: `/var/sigil/runs/${run2Id}/events.jsonl`,
      source: 'app_server.run.start',
      queuedAt: '2026-03-18T16:16:00Z',
      startedAt: '2026-03-18T16:16:01Z',
      terminalAt: '2026-03-18T16:17:05Z',
      executor: 'rlm',
      maxDepth: 1,
      pidStatus: 'not_running',
      stopRequested: true,
      stopRequest: {
        runId: run2Id,
        requestedAt: '2026-03-18T16:17:03Z',
        requestedBy: 'app_server.run.stop',
        signal: 'user_request',
      },
      interruptedReason: 'user_request',
      interruptedBy: 'app_server.run.stop',
      interruptedNodeId: demoNodes2[0].nodeId,
      nodeCount: 1,
      stepCount: 2,
      actionCount: 0,
      subcallCount: 0,
      nodes: demoNodes2,
    },
    steps: [
      {
        nodeId: demoNodes2[0].nodeId,
        stepId: '0195699f-2c3d-7e4f-0123-000000000007',
        nodeStepIndex: 0,
        stepStartedSeq: 17,
        schemaId: 'sigil.rlm.response.v1',
        decision: 'continue',
        state: 'completed',
        startedAt: '2026-03-18T16:16:05Z',
        completedAt: '2026-03-18T16:16:50Z',
        durationMs: 45000,
        actionCount: 0,
        subcallCount: 0,
      },
    ],
    events: [
      {
        eventId: '0195699f-3d4e-7f50-1234-000000000019',
        schemaVersion: 'v1',
        runId: run2Id,
        seq: 19,
        ts: '2026-03-18T16:16:55Z',
        type: 'node.step.completed',
        nodeId: demoNodes2[0].nodeId,
        causationId: run2Id,
        correlationId: run2Id,
        payload: { decision: 'continue' },
      },
      {
        eventId: '0195699f-4e5f-7060-2345-000000000020',
        schemaVersion: 'v1',
        runId: run2Id,
        seq: 20,
        ts: '2026-03-18T16:17:03Z',
        type: 'run.interrupted',
        causationId: run2Id,
        correlationId: run2Id,
        payload: { state: 'interrupted', terminal: true, reason: 'user_request' },
      },
    ],
  },
}

/* ------------------------------------------------------------------ */
/*  Accessors                                                          */
/* ------------------------------------------------------------------ */

export const defaultAgentId = demoAgents[0].id
export const defaultRunId = demoRunSummaries[0].run.runId

export function getRunsForAgent(agentId: string): RunSummaryView[] {
  return demoRunSummaries
    .filter((entry) => entry.agentId === agentId)
    .map((entry) => entry.run)
}

export function getRunDetail(runId: string): RunDetailView | undefined {
  return demoDetails[runId]
}
