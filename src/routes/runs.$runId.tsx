import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/runs/$runId')({
  component: RunDetailRoute,
})

function RunDetailRoute() {
  return (
    <main className="page-wrap min-h-[calc(100vh-12rem)] px-4 pb-10 pt-10" />
  )
}
