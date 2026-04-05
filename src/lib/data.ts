import type { AgentInstance, RunDetailView } from './demo-data'
import type { RunArtifactReadPayload, RunStepDetailView, RunSummaryView } from './protocol'
import * as demo from './demo-data'

const isDemoMode = import.meta.env.VITE_DATA_SOURCE === 'demo'
const demoStartedRuns = new Map<string, RunSummaryView[]>()
const demoStartedRunDetails = new Map<string, RunDetailView>()

export const agents: AgentInstance[] = isDemoMode ? demo.demoAgents : []

export const defaultAgentId: string = isDemoMode ? demo.defaultAgentId : ''

export const defaultRunId: string = isDemoMode ? demo.defaultRunId : ''

export function getRunsForAgent(agentId: string): RunSummaryView[] {
  if (!isDemoMode) {
    return []
  }

  const startedRuns = demoStartedRuns.get(agentId) ?? []
  const staticRuns = demo
    .getRunsForAgent(agentId)
    .filter((run) => !startedRuns.some((startedRun) => startedRun.runId === run.runId))
  return [...startedRuns, ...staticRuns]
}

export function getAgentFleet(): AgentInstance[] {
  return isDemoMode ? demo.demoAgents : []
}

export function getRunDetail(runId: string): RunDetailView | undefined {
  if (!isDemoMode) {
    return undefined
  }

  return demoStartedRunDetails.get(runId) ?? demo.getRunDetail(runId)
}

export function getRunSnapshot(runId: string): RunDetailView | undefined {
  if (!isDemoMode) {
    return undefined
  }

  return demoStartedRunDetails.get(runId) ?? demo.getRunDetail(runId)
}

export function getStepDetail(runId: string, stepId: string): RunStepDetailView | undefined {
  return isDemoMode ? demo.getStepDetail(runId, stepId) : undefined
}

export function getRunArtifact(runId: string, artifactRef: string): RunArtifactReadPayload | undefined {
  return isDemoMode ? demo.getRunArtifact(runId, artifactRef) : undefined
}

export function recordDemoStartedRun(agentId: string, run: RunSummaryView, detail: RunDetailView) {
  if (!isDemoMode) {
    return
  }

  const startedRuns = demoStartedRuns.get(agentId) ?? []
  demoStartedRuns.set(agentId, [run, ...startedRuns.filter((startedRun) => startedRun.runId !== run.runId)])
  demoStartedRunDetails.set(run.runId, detail)
}

export function clearRecordedDemoRunsForTests() {
  demoStartedRuns.clear()
  demoStartedRunDetails.clear()
}
