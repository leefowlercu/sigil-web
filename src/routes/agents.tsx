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
    <main className="page-wrap min-h-[calc(100vh-12rem)] px-4 pb-10 pt-10" />
  )
}
