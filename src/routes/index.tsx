import { useEffect, useState } from 'react'
import { Activity, Plus } from 'lucide-react'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { AgentContextPane } from '#/features/agents-workspace/agent-context-pane'
import { AgentsPane } from '#/features/agents-workspace/agents-pane'
import { RunDetailPane } from '#/features/agents-workspace/run-detail-pane'
import { RunsPane } from '#/features/agents-workspace/runs-pane'
import type { AgentInstance } from '#/lib/demo-data'
import { useAgentFleet } from '#/lib/use-agent-fleet'
import { useAgentRuns } from '#/lib/use-agent-runs'

type IndexSearch = {
  agent?: string
}

export function resolveSelectedAgentId(agentSearchValue: string | undefined, agents: AgentInstance[]): string {
  const exactMatch = agents.find((agent) => agent.id === agentSearchValue)
  return exactMatch?.id ?? agents[0]?.id ?? ''
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    agent: typeof search.agent === 'string' && search.agent.length > 0 ? search.agent : undefined,
  }),
  component: IndexRoute,
})

function IndexRoute() {
  const navigate = useNavigate({ from: '/' })
  const search = useSearch({ from: '/' })
  const { agents, connectAgent, disconnectAgent, reconnectAgent, removeAgent } = useAgentFleet()

  const selectedAgentId = resolveSelectedAgentId(search.agent, agents)
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId)
  const agentRuns = useAgentRuns(selectedAgentId)

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  const activeRunId =
    selectedRunId && agentRuns.some((run) => run.runId === selectedRunId)
      ? selectedRunId
      : (agentRuns[0]?.runId ?? null)

  useEffect(() => {
    setSelectedRunId(null)
  }, [selectedAgentId])

  useEffect(() => {
    if (agents.length === 0) {
      return
    }

    const nextAgent = selectedAgentId || undefined
    if (search.agent === nextAgent) {
      return
    }

    void navigate({
      search: (prev) => ({
        ...prev,
        agent: nextAgent,
      }),
      replace: true,
    })
  }, [agents.length, navigate, search.agent, selectedAgentId])

  function handleAgentSelect(id: string) {
    if (id === selectedAgentId) {
      return
    }

    setSelectedRunId(null)
    void navigate({
      search: (prev) => ({
        ...prev,
        agent: id,
      }),
    })
  }

  return (
    <main data-testid="agents-workspace" className="workspace-route">
      <input data-testid="agent-search-param" type="hidden" readOnly value={selectedAgentId} />

      <AgentsPane
        agents={agents}
        selectedId={selectedAgentId}
        onSelect={handleAgentSelect}
        onConnect={connectAgent}
        onDisconnect={disconnectAgent}
        onReconnect={reconnectAgent}
        onRemove={removeAgent}
      />

      <div className="flex flex-1 flex-col overflow-hidden bg-(--workspace-bg)">
        {selectedAgent && (
          <div data-testid="selected-agent-panel">
            <AgentContextPane
              agent={selectedAgent}
              action={
                <Button
                  data-testid="new-run-button"
                  type="button"
                  variant="workspace"
                  size="toolbar"
                  className="uppercase"
                >
                  New Run
                  <Plus className="size-3" />
                </Button>
              }
            />
          </div>
        )}

        <div data-testid="agents-workspace-scroll-region" className="flex flex-1 overflow-hidden">
          <RunsPane runs={agentRuns} activeRunId={activeRunId} onSelectRun={setSelectedRunId} />

          <div className="flex flex-1 flex-col overflow-hidden">
            {activeRunId ? (
              <RunDetailPane agentId={selectedAgentId} runId={activeRunId} />
            ) : (
              <div
                data-testid="run-detail-empty-state"
                className="flex flex-1 flex-col items-center justify-center gap-3 text-center"
              >
                <div className="flex size-12 items-center justify-center rounded-xl border border-(--line) bg-(--surface)">
                  <Activity className="size-5 text-muted-foreground opacity-40" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">Select a run to view details.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
