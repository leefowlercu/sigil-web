import { PROTOCOL_VERSION } from '#/lib/protocol'
import type {
  InitializeResult,
  RunProjectionView,
  RunSummaryView,
} from '#/lib/protocol'
import type { AgentInstance } from '#/lib/demo-data'
import { AppServerSessionClient } from './client'
import type { SessionSnapshot } from './client'

type SessionRecord = {
  client: AppServerSessionClient
  unsubscribe: () => void
}

const records = new Map<string, SessionRecord>()
const storeListeners = new Set<() => void>()
let agentInstanceSnapshotsCache: AgentInstance[] = []
const sessionSnapshotsCache = new Map<string, SessionSnapshot>()

function buildPlaceholderServer(endpoint: string): InitializeResult {
  let instanceName = endpoint
  try {
    instanceName = new URL(endpoint).hostname || endpoint
  } catch {
    // Keep the raw endpoint when URL parsing fails.
  }

  return {
    serverName: 'sigil',
    serverVersion: '0.1.0',
    instanceId: instanceName,
    instanceName,
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

function refreshCaches() {
  const nextAgentInstances: AgentInstance[] = []
  sessionSnapshotsCache.clear()

  for (const [agentId, record] of records) {
    const snapshot = record.client.getSnapshot()
    sessionSnapshotsCache.set(agentId, snapshot)
    nextAgentInstances.push({
      id: agentId,
      endpoint: snapshot.endpoint,
      connectionState: snapshot.connectionState,
      server: snapshot.server,
    })
  }

  agentInstanceSnapshotsCache = nextAgentInstances
}

function emitStoreChange() {
  refreshCaches()
  for (const listener of storeListeners) {
    listener()
  }
}

function createSession(agentId: string, endpoint: string) {
  const client = new AppServerSessionClient({
    agentId,
    endpoint,
    server: buildPlaceholderServer(endpoint),
  })
  const unsubscribe = client.subscribe(() => {
    emitStoreChange()
  })
  return { client, unsubscribe }
}

export function clearAgentSessionsForTests() {
  for (const [agentId] of records) {
    removeAgentSession(agentId)
  }
}

export function connectAgentSession(agentId: string, endpoint: string) {
  const existing = records.get(agentId)
  if (existing && existing.client.getSnapshot().endpoint === endpoint) {
    existing.client.reconnect()
    return
  }
  if (existing) {
    existing.unsubscribe()
    existing.client.disconnect()
    records.delete(agentId)
  }

  const record = createSession(agentId, endpoint)
  records.set(agentId, record)
  emitStoreChange()
  void record.client.connect().catch(() => {
    // The session stays visible and will continue reconnecting.
  })
}

export function disconnectAgentSession(agentId: string) {
  const record = records.get(agentId)
  if (!record) return
  record.client.disconnect()
}

export function getAgentInstanceSnapshots(): AgentInstance[] {
  return agentInstanceSnapshotsCache
}

export function getAgentSession(
  agentId: string,
): AppServerSessionClient | null {
  return records.get(agentId)?.client ?? null
}

export function getAgentSessionSnapshot(
  agentId: string,
): SessionSnapshot | null {
  return sessionSnapshotsCache.get(agentId) ?? null
}

export function reconnectAgentSession(agentId: string) {
  const record = records.get(agentId)
  if (!record) return
  record.client.reconnect()
}

export function removeAgentSession(agentId: string) {
  const record = records.get(agentId)
  if (!record) return
  record.unsubscribe()
  record.client.disconnect()
  records.delete(agentId)
  emitStoreChange()
}

export function runSummaryFromProjection(
  projection: RunProjectionView,
): RunSummaryView {
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
    error: projection.errorMessage,
  }
}

export async function listAllRuns(
  session: AppServerSessionClient,
): Promise<RunSummaryView[]> {
  const items: RunSummaryView[] = []
  let cursor: string | undefined
  do {
    const result = await session.request('runs/list', {
      cursor,
      limit: 100,
    })
    items.push(...result.payload.items)
    cursor = result.payload.nextCursor
  } while (cursor)
  return items
}

export function subscribeAgentSessionStore(listener: () => void): () => void {
  storeListeners.add(listener)
  return () => {
    storeListeners.delete(listener)
  }
}
