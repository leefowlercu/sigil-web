import type {
  EventEnvelopeView,
  InitializeResult,
  RunProjectionView,
  RunStepSummaryView,
  RunSummaryView,
  RunTreeReadPayload,
} from '#/lib/protocol'
import { PROTOCOL_VERSION } from '#/lib/protocol'

export const LIVE_AGENT_INSTANCE_ID = 'live-agent'
export const LIVE_AGENT_INSTANCE_NAME = 'live-agent'
export const LIVE_RUN_ID = '019d2000-0000-7000-8000-000000000001'
export const LIVE_ROOT_NODE_ID = '019d2000-0000-7000-8000-000000000010'
export const LIVE_STEP_ID = '019d2000-0000-7000-8000-000000000020'
export const LIVE_RUN_NAME = 'live-run'
export const LIVE_RUN_DIR = '/tmp/sigil-web-live/runs'
export const LIVE_EVENTS_PATH = `${LIVE_RUN_DIR}/${LIVE_RUN_ID}/events.jsonl`
export const LIVE_BASE_TS = '2026-03-26T18:00:00.000Z'
export const LIVE_STARTED_TS = '2026-03-26T18:00:05.000Z'
export const LIVE_COMPLETED_TS = '2026-03-26T18:00:35.000Z'

export type FixtureRunState = 'running' | 'completed'

export function createInitializeResult(): InitializeResult {
  return {
    serverName: 'sigil',
    serverVersion: '0.1.0',
    instanceId: LIVE_AGENT_INSTANCE_ID,
    instanceName: LIVE_AGENT_INSTANCE_NAME,
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

export function createLiveRunSummary(state: FixtureRunState = 'running'): RunSummaryView {
  return {
    runId: LIVE_RUN_ID,
    name: LIVE_RUN_NAME,
    state,
    source: 'app-server.fixture',
    queuedAt: LIVE_BASE_TS,
    startedAt: LIVE_STARTED_TS,
    terminalAt: state === 'completed' ? LIVE_COMPLETED_TS : undefined,
    eventsPath: LIVE_EVENTS_PATH,
    pidStatus: state === 'completed' ? 'not_running' : 'current',
    stopRequested: false,
  }
}

export function createLiveRunProjection(state: FixtureRunState = 'running'): RunProjectionView {
  return {
    runId: LIVE_RUN_ID,
    name: LIVE_RUN_NAME,
    state,
    runDir: LIVE_RUN_DIR,
    eventsPath: LIVE_EVENTS_PATH,
    source: 'app-server.fixture',
    queuedAt: LIVE_BASE_TS,
    startedAt: LIVE_STARTED_TS,
    terminalAt: state === 'completed' ? LIVE_COMPLETED_TS : undefined,
    executor: 'fixture',
    maxDepth: 1,
    pidStatus: state === 'completed' ? 'not_running' : 'current',
    stopRequested: false,
    nodeCount: 1,
    stepCount: 1,
    actionCount: 0,
    subcallCount: 0,
    nodes: [
      {
        nodeId: LIVE_ROOT_NODE_ID,
        depth: 0,
        role: 'root',
        state,
        startedAt: LIVE_STARTED_TS,
        terminalAt: state === 'completed' ? LIVE_COMPLETED_TS : undefined,
        stepCount: 1,
      },
    ],
  }
}

export function createLiveRunTree(state: FixtureRunState = 'running'): RunTreeReadPayload {
  return {
    rootNodeId: LIVE_ROOT_NODE_ID,
    nodes: [
      {
        nodeId: LIVE_ROOT_NODE_ID,
        depth: 0,
        role: 'root',
        state,
        startedAt: LIVE_STARTED_TS,
        terminalAt: state === 'completed' ? LIVE_COMPLETED_TS : undefined,
        stepCount: 1,
      },
    ],
  }
}

export function createLiveRunSteps(state: FixtureRunState = 'running'): RunStepSummaryView[] {
  return [
    {
      nodeId: LIVE_ROOT_NODE_ID,
      stepId: LIVE_STEP_ID,
      nodeStepIndex: 1,
      stepStartedSeq: 1,
      schemaId: 'sigil.rlm.response.v1',
      decision: state === 'completed' ? 'final' : undefined,
      state: state === 'completed' ? 'completed' : 'running',
      startedAt: LIVE_STARTED_TS,
      completedAt: state === 'completed' ? LIVE_COMPLETED_TS : undefined,
      durationMs: state === 'completed' ? 30000 : undefined,
      actionCount: 0,
      subcallCount: 0,
    },
  ]
}

export function createLiveRunEvents(): EventEnvelopeView[] {
  return []
}
