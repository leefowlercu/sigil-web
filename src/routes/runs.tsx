import { Link, createFileRoute } from '@tanstack/react-router'
import { startTransition, useDeferredValue, useState } from 'react'
import { ArrowRight, Search, TerminalSquare } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { demoRuns } from '#/lib/demo-data'

export const Route = createFileRoute('/runs')({
  component: RunsRoute,
})

function RunsRoute() {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const filteredRuns = demoRuns.filter((run) => {
    if (!deferredQuery.trim()) {
      return true
    }

    const haystack = `${run.title} ${run.operator} ${run.focus}`.toLowerCase()
    return haystack.includes(deferredQuery.toLowerCase())
  })

  return (
    <main className="page-wrap px-4 pb-10 pt-10">
      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="island-shell rise-in rounded-[2rem]">
            <CardHeader className="gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="island-kicker mb-2">Run Index</p>
                  <CardTitle className="display-title text-4xl text-[var(--sea-ink)] sm:text-5xl">
                    Inspect, page, and triage the current run corpus.
                  </CardTitle>
                </div>
                <Badge
                  data-testid="run-count"
                  className="border border-[rgba(50,143,151,0.22)] bg-[rgba(79,184,178,0.12)] px-3 py-1 text-[var(--sea-ink)]"
                >
                  {filteredRuns.length} runs in view
                </Badge>
              </div>
              <CardDescription className="max-w-2xl text-base leading-7 text-[var(--sea-ink-soft)]">
                The bootstrap route mirrors the shell, list, pagination, and
                empty-state scenarios we captured in the PRDs.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[18rem] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--sea-ink-soft)]" />
                  <Input
                    value={query}
                    onChange={(event) => {
                      const nextValue = event.target.value
                      startTransition(() => setQuery(nextValue))
                    }}
                    placeholder="Filter by title, operator, or focus..."
                    className="pl-9"
                  />
                </div>
                <Button asChild variant="outline">
                  <Link to="/runs/new">
                    New run
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>

              <div className="grid gap-4" data-testid="run-list">
                {filteredRuns.map((run, index) => (
                  <Card
                    key={run.id}
                    data-testid="run-list-item"
                    className="feature-card rise-in rounded-[1.6rem]"
                    style={{ animationDelay: `${index * 70 + 60}ms` }}
                  >
                    <CardHeader className="gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-xl text-[var(--sea-ink)]">
                            {run.title}
                          </CardTitle>
                          <CardDescription className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                            {run.id} · {run.operator} · {run.source}
                          </CardDescription>
                        </div>
                        <Badge
                          className="border border-[rgba(23,58,64,0.12)] bg-white/70 px-3 py-1 text-[var(--sea-ink)] capitalize"
                          data-testid={
                            run.status === 'interrupted'
                              ? 'run-status-badge'
                              : undefined
                          }
                        >
                          {run.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                      <div className="grid gap-3 text-sm text-[var(--sea-ink-soft)] sm:grid-cols-3">
                        <div>
                          <p className="island-kicker mb-2">Focus</p>
                          <p className="m-0 leading-6 text-[var(--sea-ink)]">
                            {run.focus}
                          </p>
                        </div>
                        <div>
                          <p className="island-kicker mb-2">Last update</p>
                          <p className="m-0 text-[var(--sea-ink)]">
                            {run.updatedAt}
                          </p>
                        </div>
                        <div>
                          <p className="island-kicker mb-2">Seq / nodes</p>
                          <p className="m-0 text-[var(--sea-ink)]">
                            {run.seq} / {run.nodes}
                          </p>
                        </div>
                      </div>
                      <Button asChild>
                        <Link to="/runs/$runId" params={{ runId: run.id }}>
                          Open workspace
                          <TerminalSquare className="size-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card
            className="feature-card rise-in rounded-[1.75rem]"
            style={{ animationDelay: '120ms' }}
          >
            <CardHeader>
              <p className="island-kicker">Paging</p>
              <CardTitle className="text-lg text-[var(--sea-ink)]">
                Cursor-aware run traversal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-6 text-[var(--sea-ink-soft)]">
                This bootstrap keeps the pagination affordance visible without
                coupling it to a real backend yet.
              </p>
              <p
                data-testid="run-list-cursor"
                className="rounded-xl border border-[var(--line)] bg-white/55 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sea-ink-soft)]"
              >
                nextCursor=run_01jf7m0h23k6xsp9qjbp
              </p>
              <Button
                variant="secondary"
                className="w-full"
                data-testid="run-list-next-page"
              >
                Load next page
              </Button>
            </CardContent>
          </Card>

          <Card
            className="feature-card rise-in rounded-[1.75rem]"
            style={{ animationDelay: '200ms' }}
          >
            <CardHeader>
              <p className="island-kicker">Empty Corpus</p>
              <CardTitle className="text-lg text-[var(--sea-ink)]">
                Fallback state for first-time operators
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                data-testid="run-list-empty-state"
                className="rounded-2xl border border-dashed border-[var(--line)] bg-white/40 p-4 text-sm leading-6 text-[var(--sea-ink-soft)]"
              >
                When the corpus is empty, the command plane pivots into an
                operator-friendly CTA instead of a dead-end table.
              </div>
              <Button
                asChild
                className="mt-4 w-full"
                data-testid="new-run-button"
              >
                <Link to="/runs/new">Open inline YAML composer</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
