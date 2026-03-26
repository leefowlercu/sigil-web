import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/runs/$runId')({
  component: RunDetailRoute,
})

function RunDetailRoute() {
  return (
    <main data-testid="run-detail-workspace" className="workspace-route">
      <div className="page-wrap workspace-frame">
        <section data-testid="run-detail-workspace-scroll-region" className="island-shell workspace-scroll-region" />
      </div>
    </main>
  )
}
