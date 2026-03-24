import type {
  ErrorObject,
  EventEnvelopeView,
  InitializeResult,
  RunProjectionView,
  RunStepSummaryView,
  RunSummaryView,
  RunTreeReadPayload,
} from '../../src/lib/protocol/current.generated.ts'

export type AgentBrowserSnapshotRef = {
  name?: string
  role?: string
}

export type AgentBrowserSnapshot = {
  origin: string
  refs: Record<string, AgentBrowserSnapshotRef>
  snapshot: string
}

export type AgentBrowserManifestEvidence = {
  prd: string
  scenarioID: string
  title: string
  routeID: string
  stateID: string
  fixtures: string[]
  lane: 'agent-browser'
  file: string
  match: string
}

export type ScriptedRunSnapshot = {
  summary: RunSummaryView
  projection: RunProjectionView
  tree: RunTreeReadPayload
  steps: RunStepSummaryView[]
  events: EventEnvelopeView[]
  terminal: boolean
}

export type ScriptedNotificationFrame = {
  kind: 'notification'
  method: string
  params?: unknown
}

export type ScriptedRawFrame = {
  kind: 'raw'
  raw: string
}

export type ScriptedServerFrame = ScriptedNotificationFrame | ScriptedRawFrame

export type ScriptedScheduledEmission = {
  atMs: number
  frames: ScriptedServerFrame[]
}

export interface ScriptedRunFixture {
  runId: string
  initialSeq: number
  scheduled: ScriptedScheduledEmission[]
  stateAtSeq: (seq: number) => ScriptedRunSnapshot
}

export interface ScriptedAppServerScenario {
  server: InitializeResult
  heartbeatIntervalMs: number
  runs: ScriptedRunFixture[]
}

export type ScriptedRequestLogEntry = {
  atMs: number
  connectionID: number
  id?: string
  method?: string
  params?: unknown
  raw: unknown
}

export type ScriptedTranscriptEntry = {
  atMs: number
  connectionID: number
  direction: 'inbound' | 'outbound'
  payload: unknown
}

export interface ScriptedConnectionController {
  readonly endpoint: string
  readonly scenario: ScriptedAppServerScenario
  start: () => Promise<void>
  advance: (ms: number) => Promise<void>
  emit: (...frames: ScriptedServerFrame[]) => Promise<void>
  emitMalformedNotification: (raw: string) => Promise<void>
  pauseHeartbeats: () => void
  resumeHeartbeats: () => void
  disconnect: () => Promise<void>
  getReceivedRequests: () => ScriptedRequestLogEntry[]
  getTranscript: () => ScriptedTranscriptEntry[]
  writeArtifacts: () => Promise<void>
  close: () => Promise<void>
}

export type AgentBrowserContextCommon = {
  appURL: string
  artifactDir: string
  browser: AgentBrowserSession
  evidence: AgentBrowserManifestEvidence
}

export type AgentBrowserScenarioContext = AgentBrowserContextCommon & {
  controller: ScriptedConnectionController
}

export type AgentBrowserScenarioCase = (
  context: AgentBrowserScenarioContext,
) => Promise<void>

export type AgentBrowserScenarioModule = {
  cases: Record<string, AgentBrowserScenarioCase>
}

export type JsonRPCRequestEnvelope = {
  jsonrpc: '2.0'
  id: string
  method: string
  params?: unknown
}

export type JsonRPCSuccessEnvelope = {
  jsonrpc: '2.0'
  id: string
  result: unknown
}

export type JsonRPCErrorEnvelope = {
  jsonrpc: '2.0'
  id: string
  error: ErrorObject
}

export type JsonRPCNotificationEnvelope = {
  jsonrpc: '2.0'
  method: string
  params?: unknown
}

export interface AgentBrowserSession {
  close: () => Promise<void>
  click: (ref: string) => Promise<void>
  commandLog: () => string[]
  evalJSON: <T>(script: string) => Promise<T>
  fill: (ref: string, value: string) => Promise<void>
  open: (url: string) => Promise<void>
  saveCommandLog: (filePath: string) => Promise<void>
  screenshot: (filePath: string) => Promise<void>
  snapshotInteractive: () => Promise<AgentBrowserSnapshot>
  wait: (value: number | string) => Promise<void>
  waitForLoad: (
    state?: 'domcontentloaded' | 'load' | 'networkidle',
  ) => Promise<void>
}
