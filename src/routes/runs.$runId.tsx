import { createFileRoute } from '@tanstack/react-router'
import { StepsPane } from '#/features/run-detail/steps-pane'
import { useRunSubscription } from '#/lib/use-run-subscription'

export const Route = createFileRoute('/runs/$runId')({
  component: RunDetailRoute,
})

function RunDetailRoute() {
  const { runId } = Route.useParams()
  const { status, projection, steps } = useRunSubscription('', runId)

  if (status === 'error') {
    return (
      <main data-testid="run-detail-workspace" className="workspace-route">
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Failed to load run detail.
        </div>
      </main>
    )
  }

  if (status === 'loading' || !projection) {
    return (
      <main data-testid="run-detail-workspace" className="workspace-route">
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading run detail...
        </div>
      </main>
    )
  }

  return (
    <main data-testid="run-detail-workspace" className="workspace-route">
      <StepsPane steps={steps} nodes={projection.nodes} />

      <div className="flex flex-1 flex-col overflow-hidden bg-(--workspace-bg)">
        <section data-testid="run-detail-workspace-scroll-region" className="flex flex-1 overflow-hidden" />
      </div>
    </main>
  )
}
