import { createFileRoute } from '@tanstack/react-router'

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
  return (
    <main data-testid="agents-workspace" className="workspace-route">
      <div className="page-wrap workspace-frame">
        <section
          data-testid="agents-workspace-scroll-region"
          className="island-shell workspace-scroll-region"
        />
      </div>
    </main>
  )
}
