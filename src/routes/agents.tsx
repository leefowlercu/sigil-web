import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Activity } from 'lucide-react'
import { AgentContextPane } from '#/components/agents/agent-context-pane'
import { AgentsPane } from '#/components/agents/agents-pane'
import { RunDetailPane } from '#/components/agents/run-detail-pane'
import { RunsPane } from '#/components/agents/runs-pane'
import { useAgentFleet } from '#/lib/use-agent-fleet'
import { useAgentRuns } from '#/lib/use-agent-runs'

type AgentsSearch = {
  agent?: string
}

export const Route = createFileRoute('/agents')({
  validateSearch: (search: Record<string, unknown>): AgentsSearch => ({
    agent:
      typeof search.agent === 'string' && search.agent.length > 0
        ? search.agent
        : undefined,
  }),
  component: AgentsRoute,
})

function AgentsRoute() {
  const { agents, connectAgent, disconnectAgent, reconnectAgent, removeAgent } =
    useAgentFleet()

  const [selectedAgentId, setSelectedAgentId] = useState('')
  const effectiveAgentId =
    selectedAgentId && agents.some((a) => a.id === selectedAgentId)
      ? selectedAgentId
      : (agents[0]?.id ?? '')

  const selectedAgent = agents.find((a) => a.id === effectiveAgentId)
  const agentRuns = useAgentRuns(effectiveAgentId)

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  const activeRunId =
    selectedRunId && agentRuns.some((r) => r.runId === selectedRunId)
      ? selectedRunId
      : (agentRuns[0]?.runId ?? null)

  function handleAgentSelect(id: string) {
    setSelectedAgentId(id)
    setSelectedRunId(null)
  }

  return (
    <main data-testid="agents-workspace" className="workspace-route">
      {/* Sidebar */}
      <AgentsPane
        agents={agents}
        selectedId={effectiveAgentId}
        onSelect={handleAgentSelect}
        onConnect={connectAgent}
        onDisconnect={disconnectAgent}
        onReconnect={reconnectAgent}
        onRemove={removeAgent}
      />

      {/* Main workspace */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[var(--workspace-bg)]">
        {/* Agent context bar */}
        {selectedAgent && <AgentContextPane agent={selectedAgent} />}

        {/* Split pane: run list | run detail */}
        <div
          data-testid="agents-workspace-scroll-region"
          className="flex flex-1 overflow-hidden"
        >
          {/* Left: Run list */}
          <RunsPane
            runs={agentRuns}
            activeRunId={activeRunId}
            onSelectRun={setSelectedRunId}
          />

          {/* Right: Run detail */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {activeRunId ? (
              <RunDetailPane agentId={effectiveAgentId} runId={activeRunId} />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)]">
                  <Activity className="size-5 text-[var(--muted-foreground)] opacity-40" />
                </div>
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                  Select a run to view details.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
