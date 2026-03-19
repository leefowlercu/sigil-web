import {
  Activity,
  Layers,
  ArrowUpRight,
  Zap,
  FileText,
  Box,
  Terminal,
} from 'lucide-react'
import { ScrollArea } from '#/components/ui/scroll-area'
import { Separator } from '#/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import type { RunState } from '#/lib/demo-data'
import { useRunSubscription } from '#/lib/use-run-subscription'

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
        {label}
      </span>
      <span
        className={`text-xs leading-relaxed text-[var(--foreground)] ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}

function formatTimestamp(iso?: string): string {
  if (!iso) return '--'
  const date = new Date(iso)
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function RunDetailPane({ runId }: { runId: string }) {
  const { status, projection, events, steps, terminal } =
    useRunSubscription(runId)

  if (status === 'loading' || !projection) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--muted-foreground)]">
        Loading run detail...
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--muted-foreground)]">
        Failed to load run detail.
      </div>
    )
  }

  const state = projection.state as RunState
  const isLive = state === 'running' && !terminal

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
      {/* Tabbed detail content */}
      <Tabs
        defaultValue="timeline"
        className="flex min-h-0 flex-1 flex-col overflow-hidden gap-0"
      >
        <div className="flex shrink-0 items-center border-b border-[var(--line)] px-4 py-[7px]">
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
          <span className="ml-auto inline-flex cursor-default items-center gap-1 rounded-md border border-[var(--line)] bg-transparent px-2.5 py-1 mr-[4px] text-[0.65rem] font-semibold text-[var(--muted-foreground)] no-underline transition hover:border-[var(--sigil-accent-focus-border)] hover:bg-[var(--sigil-accent-hover)] hover:text-[var(--sigil-accent)]">
            Open detail
            <ArrowUpRight className="size-3" />
          </span>
        </div>

        {/* Timeline tab */}
        <TabsContent value="timeline" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-0 px-5 py-4">
              {/* Event timeline */}
              <div className="relative flex flex-col gap-0">
                {events.map((event, i) => {
                  const isLast = i === events.length - 1
                  return (
                    <div key={event.seq} className="relative flex gap-3 pb-4">
                      {/* Vertical connector line */}
                      {!isLast && (
                        <span className="absolute top-4 left-[7px] h-[calc(100%-8px)] w-px bg-[var(--line)]" />
                      )}
                      {/* Dot */}
                      <span className="relative z-10 mt-1 flex size-[15px] shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-strong)]">
                        <span
                          className={`size-[5px] rounded-full ${
                            isLast && isLive
                              ? 'bg-[var(--sigil-accent)]'
                              : 'bg-[var(--muted-foreground)]'
                          }`}
                        />
                      </span>
                      {/* Content */}
                      <div className="flex flex-1 flex-col gap-0.5 pt-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                            {formatTimestamp(event.ts)}
                          </span>
                          <span className="rounded-md bg-[var(--secondary)] px-1.5 py-0.5 text-[0.58rem] font-semibold text-[var(--muted-foreground)]">
                            {event.type}
                          </span>
                          <span className="text-[0.58rem] font-semibold text-[var(--muted-foreground)] opacity-50">
                            seq {event.seq}
                          </span>
                        </div>
                        {event.nodeId && (
                          <p className="font-mono text-[0.6rem] leading-relaxed text-[var(--muted-foreground)]">
                            node {event.nodeId.slice(0, 13)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Nodes tab */}
        <TabsContent value="nodes" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-2 px-5 py-4">
              {projection.nodes.map((node) => {
                const nodeState = node.state as RunState
                return (
                  <div
                    key={node.nodeId}
                    className="flex items-center gap-3 rounded-lg border border-[var(--line)] p-3"
                  >
                    <Box
                      className={`size-4 ${
                        node.role === 'root'
                          ? 'text-[var(--sigil-accent)]'
                          : nodeState === 'running'
                            ? 'text-[var(--primary)]'
                            : 'text-[var(--run-status-completed)]'
                      }`}
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[0.68rem] font-bold text-[var(--foreground)]">
                        {node.nodeId.slice(0, 13)}
                      </span>
                      <div className="flex items-center gap-2">
                        {node.role && (
                          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                            {node.role}
                          </span>
                        )}
                        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)] opacity-60">
                          {node.state}
                        </span>
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[0.58rem] font-semibold text-[var(--muted-foreground)]">
                        {node.stepCount} steps
                      </span>
                      {nodeState === 'running' && (
                        <span className="inline-flex items-center gap-1 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[var(--sigil-accent)]">
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
            <div className="flex flex-col gap-2 px-5 py-4">
              {steps.map((step) => (
                <div
                  key={step.stepId}
                  className="flex flex-col gap-1.5 rounded-lg border border-[var(--line)] p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[var(--secondary)] px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                      {step.schemaId}
                    </span>
                    {step.decision && (
                      <span className="text-[0.55rem] font-semibold text-[var(--muted-foreground)]">
                        {step.decision}
                      </span>
                    )}
                    <span className="text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)] opacity-50">
                      {step.state}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[0.6rem] font-semibold text-[var(--muted-foreground)]">
                    <span className="font-mono">
                      {step.stepId.slice(0, 13)}
                    </span>
                    {step.durationMs != null && (
                      <span>{step.durationMs}ms</span>
                    )}
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
              {projection.source && (
                <MetaRow label="Source" value={projection.source} mono />
              )}
              {projection.executor && (
                <MetaRow label="Executor" value={projection.executor} mono />
              )}
              <MetaRow label="PID Status" value={projection.pidStatus} />
              <MetaRow label="Max Depth" value={String(projection.maxDepth)} />
              <Separator />
              <MetaRow label="Nodes" value={String(projection.nodeCount)} />
              <MetaRow label="Steps" value={String(projection.stepCount)} />
              <MetaRow label="Actions" value={String(projection.actionCount)} />
              <MetaRow
                label="Subcalls"
                value={String(projection.subcallCount)}
              />
              <Separator />
              {projection.queuedAt && (
                <MetaRow label="Queued At" value={projection.queuedAt} mono />
              )}
              {projection.startedAt && (
                <MetaRow label="Started At" value={projection.startedAt} mono />
              )}
              {projection.terminalAt && (
                <MetaRow
                  label="Terminal At"
                  value={projection.terminalAt}
                  mono
                />
              )}
              {projection.stopRequest && (
                <>
                  <Separator />
                  <MetaRow
                    label="Stop Requested By"
                    value={projection.stopRequest.requestedBy}
                    mono
                  />
                  <MetaRow
                    label="Stop Signal"
                    value={projection.stopRequest.signal}
                  />
                </>
              )}
              {projection.finalAnswerRef && (
                <MetaRow
                  label="Final Answer Ref"
                  value={projection.finalAnswerRef}
                  mono
                />
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
