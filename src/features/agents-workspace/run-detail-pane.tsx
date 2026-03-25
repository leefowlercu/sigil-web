import { Link } from '@tanstack/react-router'
import { Activity, Layers, ArrowUpRight, Zap, FileText, Box, Terminal } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '#/components/ui/button'
import { ScrollArea } from '#/components/ui/scroll-area'
import { Separator } from '#/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { RunTimelineTab } from '#/features/agents-workspace/run-timeline-tab'
import type { RunState } from '#/lib/demo-data'
import { buildTurnTokenMap } from '#/lib/timeline-events'
import { useRunArtifact } from '#/lib/use-run-artifact'
import { useRunSubscription } from '#/lib/use-run-subscription'

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.6rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">{label}</span>
      <span className={`text-xs leading-relaxed text-foreground ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.6rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">{label}</span>
      <pre className="overflow-x-auto text-xs leading-relaxed wrap-break-word whitespace-pre-wrap text-foreground">
        {value}
      </pre>
    </div>
  )
}

function formatStepDurationSeconds(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(2)}s`
}

function getFinalAnswerDisplay(state: ReturnType<typeof useRunArtifact>): string {
  if (state.status === 'loading') {
    return 'Loading final answer...'
  }

  const finalAnswer = state.payload?.artifact.final_answer
  if (typeof finalAnswer === 'string' && finalAnswer.length > 0) {
    return finalAnswer
  }

  if (state.status === 'error') {
    return 'Final answer unavailable.'
  }

  return 'No final answer available.'
}

export function RunDetailPane({ agentId, runId }: { agentId: string; runId: string }) {
  const { status, projection, events, steps, terminal } = useRunSubscription(agentId, runId)
  const turnTokenMap = useMemo(() => buildTurnTokenMap(events), [events])
  const finalAnswerState = useRunArtifact(agentId, runId, projection?.finalAnswerRef)

  if (status === 'error') {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Failed to load run detail.
      </div>
    )
  }

  if (status === 'loading' || !projection) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading run detail...</div>
    )
  }

  const state = projection.state as RunState
  const isLive = state === 'running' && !terminal

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden bg-(--workspace-bg)">
      {/* Tabbed detail content */}
      <Tabs defaultValue="timeline" className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
        <div className="flex shrink-0 items-center border-b border-(--line) py-1.75 pr-3 pl-4">
          <TabsList variant="line" className="h-auto gap-0">
            <TabsTrigger value="timeline" className="gap-1 text-xs">
              <Activity className="size-3" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="nodes" className="gap-1 text-xs">
              <Layers className="size-3" />
              Nodes
            </TabsTrigger>
            <TabsTrigger value="steps" className="gap-1 text-xs">
              <FileText className="size-3" />
              Steps
            </TabsTrigger>
            <TabsTrigger value="meta" className="gap-1 text-xs">
              <Terminal className="size-3" />
              Meta
            </TabsTrigger>
          </TabsList>
          <Button asChild variant="workspace" size="toolbar" className="ml-auto uppercase">
            <Link to="/runs/$runId" params={{ runId }}>
              Open Detail
              <ArrowUpRight className="size-3" />
            </Link>
          </Button>
        </div>

        {/* Timeline tab */}
        <TabsContent value="timeline" forceMount className="flex-1 overflow-hidden data-[state=inactive]:hidden">
          <RunTimelineTab events={events} isLive={isLive} runId={runId} turnTokenMap={turnTokenMap} />
        </TabsContent>

        {/* Nodes tab */}
        <TabsContent value="nodes" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-2 p-3">
              {projection.nodes.map((node) => {
                const nodeState = node.state as RunState
                return (
                  <div key={node.nodeId} className="flex items-center gap-3 rounded-lg border border-(--line) p-3">
                    <Box
                      className={`size-4 ${
                        node.role === 'root'
                          ? 'text-(--sigil-accent)'
                          : nodeState === 'running'
                            ? 'text-primary'
                            : 'text-(--run-status-completed)'
                      }`}
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[0.68rem] font-bold text-foreground">{node.nodeId}</span>
                      <div className="flex items-center gap-2">
                        {node.role && (
                          <span className="text-[0.6rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                            {node.role}
                          </span>
                        )}
                        <span className="text-[0.6rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase opacity-60">
                          {node.state}
                        </span>
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[0.58rem] font-semibold text-muted-foreground">{node.stepCount} steps</span>
                      {nodeState === 'running' && (
                        <span className="inline-flex items-center gap-1 text-[0.58rem] font-bold tracking-[0.12em] text-(--sigil-accent) uppercase">
                          <Zap className="size-3" />
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Steps tab */}
        <TabsContent value="steps" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-2 p-3">
              {steps.map((step) => (
                <div key={step.stepId} className="flex flex-col gap-2.5 rounded-lg border border-(--line) p-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[0.58rem] font-bold tracking-widest text-muted-foreground uppercase">
                      {step.schemaId}
                    </span>
                    {step.decision && (
                      <span className="text-[0.55rem] font-semibold text-muted-foreground">{step.decision}</span>
                    )}
                    <span className="text-[0.55rem] font-semibold tracking-widest text-muted-foreground uppercase opacity-50">
                      {step.state}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[0.6rem] font-semibold text-muted-foreground">
                    <span className="font-mono break-all">{step.stepId}</span>
                    {step.durationMs != null && <span>{formatStepDurationSeconds(step.durationMs)}</span>}
                    <span>step #{step.nodeStepIndex}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Meta tab */}
        <TabsContent value="meta" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-3 px-5 py-4">
              <MetaRow label="Name" value={projection.name} />
              <MetaRow label="Run ID" value={projection.runId} mono />
              <MetaRow label="State" value={projection.state} />
              {projection.source && <MetaRow label="Source" value={projection.source} mono />}
              {projection.executor && <MetaRow label="Executor" value={projection.executor} mono />}
              <MetaRow label="PID Status" value={projection.pidStatus} />
              <MetaRow label="Max Depth" value={String(projection.maxDepth)} />
              <Separator />
              <MetaRow label="Nodes" value={String(projection.nodeCount)} />
              <MetaRow label="Steps" value={String(projection.stepCount)} />
              <MetaRow label="Actions" value={String(projection.actionCount)} />
              <MetaRow label="Subcalls" value={String(projection.subcallCount)} />
              <Separator />
              {projection.queuedAt && <MetaRow label="Queued At" value={projection.queuedAt} mono />}
              {projection.startedAt && <MetaRow label="Started At" value={projection.startedAt} mono />}
              {projection.terminalAt && <MetaRow label="Terminal At" value={projection.terminalAt} mono />}
              {projection.stopRequest && (
                <>
                  <Separator />
                  <MetaRow label="Stop Requested By" value={projection.stopRequest.requestedBy} mono />
                  <MetaRow label="Stop Signal" value={projection.stopRequest.signal} />
                </>
              )}
              {projection.finalAnswerRef && (
                <>
                  <MetaRow label="Final Answer Ref" value={projection.finalAnswerRef} mono />
                  <MetaBlock label="Final Answer" value={getFinalAnswerDisplay(finalAnswerState)} />
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
