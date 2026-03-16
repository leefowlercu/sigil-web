import { createFileRoute } from '@tanstack/react-router'
import {
  Activity,
  ArrowRightLeft,
  RefreshCcw,
  SquareTerminal,
  StopCircle,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { ScrollArea } from '#/components/ui/scroll-area'
import { Separator } from '#/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { defaultRunId, demoRuns, runDetails } from '#/lib/demo-data'

export const Route = createFileRoute('/runs/$runId')({
  component: RunDetailRoute,
})

function RunDetailRoute() {
  const { runId } = Route.useParams()
  const detail = runDetails[runId] ?? runDetails[defaultRunId]
  const summary = demoRuns.find((run) => run.id === detail.runId) ?? demoRuns[0]

  return (
    <main className="page-wrap px-4 pb-10 pt-10">
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Card className="island-shell rise-in rounded-[2rem]">
            <CardHeader className="gap-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="island-kicker mb-2">Run Workspace</p>
                  <CardTitle
                    data-testid="run-header"
                    className="display-title text-4xl text-[var(--sea-ink)] sm:text-5xl"
                  >
                    {summary.title}
                  </CardTitle>
                  <CardDescription className="mt-3 max-w-3xl text-base leading-7 text-[var(--sea-ink-soft)]">
                    {detail.summary}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    data-testid="run-status-badge"
                    className="border border-[rgba(23,58,64,0.12)] bg-white/70 px-3 py-1 text-[var(--sea-ink)] capitalize"
                  >
                    {detail.status}
                  </Badge>
                  {detail.live ? (
                    <Badge
                      data-testid="run-live-indicator"
                      className="border border-emerald-400/25 bg-emerald-400/12 px-3 py-1 text-[var(--sea-ink)]"
                    >
                      <Activity className="mr-1 size-3.5" />
                      Live attached
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" data-testid="run-refresh-button">
                  <RefreshCcw className="size-4" />
                  Refresh snapshot
                </Button>
                <Button
                  variant="secondary"
                  data-testid="stop-run-button"
                  disabled={detail.status !== 'running'}
                >
                  <StopCircle className="size-4" />
                  Stop run
                </Button>
              </div>
            </CardHeader>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card
              className="feature-card rise-in rounded-[1.75rem]"
              style={{ animationDelay: '80ms' }}
            >
              <CardHeader>
                <CardTitle
                  data-testid="run-summary-panel"
                  className="text-lg text-[var(--sea-ink)]"
                >
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-6 text-[var(--sea-ink-soft)]">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Metric label="Run ID" value={detail.runId} />
                  <Metric label="Operator" value={detail.operator} />
                  <Metric label="Source" value={detail.source} />
                  <Metric label="Model" value={detail.model} />
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="island-kicker">Terminal posture</p>
                  <p
                    data-testid="terminal-summary"
                    className="m-0 text-[var(--sea-ink)]"
                  >
                    {detail.stopProvenance}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="feature-card rise-in rounded-[1.75rem]"
              style={{ animationDelay: '140ms' }}
            >
              <CardHeader>
                <CardTitle
                  data-testid="run-tree-panel"
                  className="text-lg text-[var(--sea-ink)]"
                >
                  Node tree
                </CardTitle>
                <CardDescription>
                  The initial layout keeps topology visible beside timeline and
                  artifacts instead of hiding it behind a second page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {detail.nodes.map((node, index) => (
                  <div
                    key={node.id}
                    data-testid={index === 0 ? 'run-tree-node' : undefined}
                    className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white/55 px-4 py-3"
                  >
                    <div>
                      <p className="m-0 font-semibold text-[var(--sea-ink)]">
                        {node.label}
                      </p>
                      <p className="m-0 text-xs uppercase tracking-[0.18em] text-[var(--sea-ink-soft)]">
                        {node.id}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {node.state}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card
          className="island-shell rise-in rounded-[2rem]"
          style={{ animationDelay: '120ms' }}
        >
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle
                data-testid="run-timeline-panel"
                className="text-lg text-[var(--sea-ink)]"
              >
                Timeline and artifacts
              </CardTitle>
              <Badge
                data-testid="latest-event-seq"
                className="border border-[rgba(50,143,151,0.22)] bg-[rgba(79,184,178,0.12)] text-[var(--sea-ink)]"
              >
                latest seq {detail.seq}
              </Badge>
            </div>
            <CardDescription>
              Canonical events remain the source of truth for the workspace. The
              artifact and final-answer panes are layered on top.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="timeline" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="timeline">
                  <ArrowRightLeft className="mr-1 size-4" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="artifacts">
                  <SquareTerminal className="mr-1 size-4" />
                  Artifacts
                </TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="space-y-4">
                <ScrollArea className="h-[26rem] rounded-[1.5rem] border border-[var(--line)] bg-white/55 p-4">
                  <div className="space-y-3">
                    {detail.events.map((event) => (
                      <div
                        key={event.seq}
                        className="rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.68)] p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="m-0 font-semibold text-[var(--sea-ink)]">
                            {event.label}
                          </p>
                          <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sea-ink-soft)]">
                            seq {event.seq}
                          </p>
                        </div>
                        <p className="mb-0 mt-2 text-sm leading-6 text-[var(--sea-ink-soft)]">
                          {event.summary}
                        </p>
                        <p className="mb-0 mt-2 text-xs uppercase tracking-[0.18em] text-[var(--sea-ink-soft)]">
                          {event.at}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="artifacts" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
                  <Card className="rounded-[1.5rem] border-[var(--line)] bg-white/60">
                    <CardHeader>
                      <CardTitle
                        data-testid="step-detail-panel"
                        className="text-base text-[var(--sea-ink)]"
                      >
                        Step detail
                      </CardTitle>
                    </CardHeader>
                    <CardContent
                      data-testid="run-step-list"
                      className="space-y-3"
                    >
                      {detail.steps.map((step) => (
                        <div
                          key={step.id}
                          className="rounded-xl border border-[var(--line)] bg-white/70 p-3"
                        >
                          <p className="m-0 font-semibold text-[var(--sea-ink)]">
                            {step.label}
                          </p>
                          <p className="m-0 text-xs uppercase tracking-[0.18em] text-[var(--sea-ink-soft)]">
                            {step.id} · {step.schemaId}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <Card className="rounded-[1.5rem] border-[var(--line)] bg-white/60">
                      <CardHeader>
                        <CardTitle
                          data-testid="artifact-detail-panel"
                          className="text-base text-[var(--sea-ink)]"
                        >
                          Artifact detail
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {detail.steps.map((step) => (
                          <div
                            key={step.artifactTitle}
                            className="rounded-xl border border-[var(--line)] bg-white/70 p-4"
                          >
                            <p className="m-0 font-semibold text-[var(--sea-ink)]">
                              {step.artifactTitle}
                            </p>
                            <p className="mb-0 mt-2 text-sm leading-6 text-[var(--sea-ink-soft)]">
                              {step.artifactBody}
                            </p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="rounded-[1.5rem] border-[var(--line)] bg-white/60">
                      <CardHeader>
                        <CardTitle
                          data-testid="final-answer-panel"
                          className="text-base text-[var(--sea-ink)]"
                        >
                          Final answer / operator synopsis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm leading-6 text-[var(--sea-ink-soft)]">
                        <p className="m-0 text-[var(--sea-ink)]">
                          {detail.finalAnswer}
                        </p>
                        <Separator />
                        <p data-testid="stop-provenance-panel" className="m-0">
                          {detail.stopProvenance}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white/60 px-4 py-3">
      <p className="island-kicker mb-2">{label}</p>
      <p className="m-0 font-semibold text-[var(--sea-ink)]">{value}</p>
    </div>
  )
}
