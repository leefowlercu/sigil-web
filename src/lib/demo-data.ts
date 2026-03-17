export type RunStatus = 'queued' | 'running' | 'completed' | 'interrupted'

export type RunRecord = {
  id: string
  agentId: string
  title: string
  status: RunStatus
  updatedAt: string
  operator: string
  source: string
  seq: number
  nodes: number
  focus: string
}

export type RunEvent = {
  seq: number
  at: string
  label: string
  summary: string
}

export type RunStep = {
  id: string
  label: string
  schemaId: string
  artifactTitle: string
  artifactBody: string
}

export type RunNode = {
  id: string
  label: string
  state: 'root' | 'active' | 'completed'
}

export type RunDetail = {
  runId: string
  status: RunStatus
  operator: string
  source: string
  seq: number
  updatedAt: string
  model: string
  live: boolean
  summary: string
  finalAnswer: string
  stopProvenance: string
  nodes: RunNode[]
  steps: RunStep[]
  events: RunEvent[]
}

export type AgentRecord = {
  id: string
  name: string
  lane: string
  runtime: string
  model: string
  lastSeen: string
  summary: string
}

export const sessionSummary = {
  endpoint: 'ws://127.0.0.1:7411/ws',
  instanceName: 'dev-localhost',
  protocolVersion: 'sigil.appserver.v1alpha1',
  status: 'ready',
  capabilitiesConfig: 'v1',
}

export const demoAgents: AgentRecord[] = [
  {
    id: 'agent_control_plane',
    name: 'control-plane',
    lane: 'Reconnect monitor',
    runtime: 'sigil app-server',
    model: 'gpt-5.4',
    lastSeen: 'heartbeat 8s ago',
    summary:
      'Primary operator lane watching canonical subscriptions and heartbeat recovery.',
  },
  {
    id: 'agent_spec_governance',
    name: 'spec-governance',
    lane: 'Traceability verifier',
    runtime: 'sigil app-server',
    model: 'gpt-5.4-mini',
    lastSeen: 'heartbeat 14s ago',
    summary:
      'Checks PRD, MATRIX, and acceptance parity before publish-time pointer updates.',
  },
  {
    id: 'agent_ops_sandbox',
    name: 'ops-sandbox',
    lane: 'Stop-control rehearsal',
    runtime: 'sigil app-server',
    model: 'gpt-5.3-codex',
    lastSeen: 'heartbeat 22s ago',
    summary:
      'Exercises interruption and provenance flows without disturbing the primary lane.',
  },
]

export const demoRuns: RunRecord[] = [
  {
    id: 'run_01jf7m7d1vvb4r1fvyht',
    agentId: demoAgents[0].id,
    title: 'Market-map orchestration dry run',
    status: 'running',
    updatedAt: '2m ago',
    operator: 'control-plane',
    source: 'app_server.run.start',
    seq: 48,
    nodes: 5,
    focus: 'Subscription replay stable after heartbeat recovery.',
  },
  {
    id: 'run_01jf7m4s9dmwexm3f8am',
    agentId: demoAgents[1].id,
    title: 'PRD traceability verifier preview',
    status: 'completed',
    updatedAt: '17m ago',
    operator: 'spec-governance',
    source: 'cli.imported',
    seq: 32,
    nodes: 3,
    focus: 'Matrix and feature titles are aligned.',
  },
  {
    id: 'run_01jf7m0h23k6xsp9qjbp',
    agentId: demoAgents[2].id,
    title: 'Interrupted reconnect rehearsal',
    status: 'interrupted',
    updatedAt: '42m ago',
    operator: 'ops-sandbox',
    source: 'app_server.run.start',
    seq: 21,
    nodes: 2,
    focus: 'Stop provenance captured as app_server.run.stop.',
  },
]

export const runDetails: Partial<Record<string, RunDetail>> = {
  [demoRuns[0].id]: {
    runId: demoRuns[0].id,
    status: 'running',
    operator: demoRuns[0].operator,
    source: demoRuns[0].source,
    seq: 48,
    updatedAt: demoRuns[0].updatedAt,
    model: 'gpt-5.4',
    live: true,
    summary:
      'The run is attached to a live subscription and has resumed cleanly after one heartbeat interruption.',
    finalAnswer:
      'Awaiting terminal output. Current workspace remains attached to canonical event delivery.',
    stopProvenance:
      'No stop request persisted yet. Active workspace remains eligible for run/stop.',
    nodes: [
      { id: 'root', label: 'Root planner', state: 'root' },
      { id: 'child-1', label: 'Protocol inspector', state: 'completed' },
      { id: 'child-2', label: 'Design reconciler', state: 'active' },
    ],
    steps: [
      {
        id: 'step-17',
        label: 'resume-subscription',
        schemaId: 'sigil.rlm.response.v1',
        artifactTitle: 'Replay reconciliation',
        artifactBody:
          'Applied canonical events 45-48 after reconnect with no duplicate sequences.',
      },
      {
        id: 'step-18',
        label: 'update-workspace',
        schemaId: 'sigil.rlm.response.v1',
        artifactTitle: 'Workspace diff',
        artifactBody:
          'Updated timeline, live indicator, and terminal guardrails for the operator shell.',
      },
    ],
    events: [
      {
        seq: 45,
        at: '11:02:14',
        label: 'run/eventAppended',
        summary: 'Canonical replay resumed after reconnect.',
      },
      {
        seq: 46,
        at: '11:02:20',
        label: 'run/statusChanged',
        summary: 'Live workspace marked healthy after heartbeat recovery.',
      },
      {
        seq: 47,
        at: '11:02:27',
        label: 'run/eventAppended',
        summary: 'Design reconciler node wrote updated artifact output.',
      },
      {
        seq: 48,
        at: '11:02:34',
        label: 'server/heartbeat',
        summary: 'Heartbeat observed on the active operator session.',
      },
    ],
  },
  [demoRuns[1].id]: {
    runId: demoRuns[1].id,
    status: 'completed',
    operator: demoRuns[1].operator,
    source: demoRuns[1].source,
    seq: 32,
    updatedAt: demoRuns[1].updatedAt,
    model: 'gpt-5.4-mini',
    live: false,
    summary:
      'The verifier preview completed and confirmed PRD, MATRIX, and feature-title parity.',
    finalAnswer:
      'Verified sigil-web specs: PRDs, MATRIX mappings, acceptance titles, scenario-manifest entries, and design-manifest artboards aligned.',
    stopProvenance:
      'Terminal completed state. No stop request metadata was required.',
    nodes: [
      { id: 'root', label: 'Verifier coordinator', state: 'root' },
      { id: 'child-1', label: 'Matrix checker', state: 'completed' },
    ],
    steps: [
      {
        id: 'step-11',
        label: 'parse-prds',
        schemaId: 'sigil.rlm.response.v1',
        artifactTitle: 'PRD scan',
        artifactBody:
          'Collected 5 sigil-web PRDs with globally unique scenario titles.',
      },
      {
        id: 'step-12',
        label: 'compare-feature-titles',
        schemaId: 'sigil.rlm.response.v1',
        artifactTitle: 'Acceptance parity',
        artifactBody:
          'All matrix rows resolved to the expected feature scenario titles.',
      },
    ],
    events: [
      {
        seq: 30,
        at: '10:41:07',
        label: 'run/eventAppended',
        summary: 'Read PRD scenarios and matrix mappings.',
      },
      {
        seq: 31,
        at: '10:41:13',
        label: 'run/completed',
        summary: 'Verifier completed with no drift detected.',
      },
      {
        seq: 32,
        at: '10:41:14',
        label: 'run/statusChanged',
        summary: 'Run entered terminal completed state.',
      },
    ],
  },
  [demoRuns[2].id]: {
    runId: demoRuns[2].id,
    status: 'interrupted',
    operator: demoRuns[2].operator,
    source: demoRuns[2].source,
    seq: 21,
    updatedAt: demoRuns[2].updatedAt,
    model: 'gpt-5.3-codex',
    live: false,
    summary:
      'The operator requested a stop during reconnect rehearsal and the run terminated with preserved provenance.',
    finalAnswer:
      'Interrupted after stop request. Partial accounting and stop metadata were persisted.',
    stopProvenance:
      'requested_by=app_server.run.stop, reason=user_request, interrupted_by=app_server.run.stop',
    nodes: [
      { id: 'root', label: 'Reconnect rehearsal', state: 'root' },
      { id: 'child-1', label: 'Stop control', state: 'completed' },
    ],
    steps: [
      {
        id: 'step-7',
        label: 'issue-stop',
        schemaId: 'sigil.rlm.response.v1',
        artifactTitle: 'Stop request',
        artifactBody:
          'Persisted stop-request metadata and observed terminal interruption transition.',
      },
    ],
    events: [
      {
        seq: 19,
        at: '10:16:55',
        label: 'run/eventAppended',
        summary: 'Heartbeat window exceeded while rehearsing reconnect.',
      },
      {
        seq: 20,
        at: '10:17:03',
        label: 'run/statusChanged',
        summary: 'Stop control issued from app-server workspace.',
      },
      {
        seq: 21,
        at: '10:17:05',
        label: 'run/completed',
        summary: 'Run interrupted with persisted stop provenance.',
      },
    ],
  },
}

export const defaultRunId = demoRuns[0].id
export const defaultAgentId = demoAgents[0].id

export function getRunsForAgent(agentId: string) {
  return demoRuns.filter((run) => run.agentId === agentId)
}
