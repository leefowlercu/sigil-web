import type { AgentInstance, RunDetailView } from './demo-data'
import type { RunSummaryView } from './protocol'
import * as demo from './demo-data'

const isDemoMode = import.meta.env.VITE_DATA_SOURCE === 'demo'

export const agents: AgentInstance[] = isDemoMode ? demo.demoAgents : []

export const defaultAgentId: string = isDemoMode ? demo.defaultAgentId : ''

export const defaultRunId: string = isDemoMode ? demo.defaultRunId : ''

export function getRunsForAgent(agentId: string): RunSummaryView[] {
  return isDemoMode ? demo.getRunsForAgent(agentId) : []
}

export function getAgentFleet(): AgentInstance[] {
  return isDemoMode ? demo.demoAgents : []
}

export function getRunDetail(runId: string): RunDetailView | undefined {
  return isDemoMode ? demo.getRunDetail(runId) : undefined
}

export function getRunSnapshot(runId: string): RunDetailView | undefined {
  return isDemoMode ? demo.getRunDetail(runId) : undefined
}
