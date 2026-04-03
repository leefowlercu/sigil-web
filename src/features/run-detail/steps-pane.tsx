import { useEffect, useMemo, useState } from 'react'
import { ListOrdered, Timer } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { ScrollArea, ScrollBar } from '#/components/ui/scroll-area'
import { Separator } from '#/components/ui/separator'
import type { RunState } from '#/lib/demo-data'
import type { RunNodeProjectionView, RunStepSummaryView } from '#/lib/protocol'
import { StateDot } from '#/features/agents-workspace/status-primitives'

/* ------------------------------------------------------------------ */
/*  Step tree types                                                    */
/* ------------------------------------------------------------------ */

type StepTreeItem = { type: 'step'; step: RunStepSummaryView } | { type: 'segment'; segment: StepTreeSegment }

type StepTreeSegment = {
  nodeId: string
  depth: number
  items: StepTreeItem[]
}

/* ------------------------------------------------------------------ */
/*  Step tree builder                                                  */
/* ------------------------------------------------------------------ */

function buildNodeDepthMap(nodes: RunNodeProjectionView[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const node of nodes) {
    map.set(node.nodeId, node.depth)
  }
  return map
}

function buildStepTree(steps: RunStepSummaryView[], depthMap: Map<string, number>): StepTreeSegment[] {
  const segments: StepTreeSegment[] = []
  let cursor = 0

  function consumeSegment(nodeId: string, depth: number): StepTreeSegment {
    const segment: StepTreeSegment = { nodeId, depth, items: [] }
    while (cursor < steps.length) {
      const step = steps[cursor]
      const stepDepth = depthMap.get(step.nodeId) ?? 0
      if (step.nodeId === nodeId) {
        segment.items.push({ type: 'step', step })
        cursor++
      } else if (stepDepth > depth) {
        segment.items.push({ type: 'segment', segment: consumeSegment(step.nodeId, stepDepth) })
      } else {
        break
      }
    }
    return segment
  }

  while (cursor < steps.length) {
    const step = steps[cursor]
    const depth = depthMap.get(step.nodeId) ?? 0
    segments.push(consumeSegment(step.nodeId, depth))
  }

  return segments
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rem = seconds % 60
  if (minutes < 60) return rem > 0 ? `${minutes}m ${rem}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remMin = minutes % 60
  return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`
}

function useElapsed(startedAt?: string, active?: boolean): string | null {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (!active || !startedAt) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active, startedAt])

  if (!active || !startedAt) return null
  return formatDuration(now - new Date(startedAt).getTime())
}

function findLastStepIndex(items: StepTreeItem[]): number {
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].type === 'step') return i
  }
  return -1
}

/* ------------------------------------------------------------------ */
/*  Step card                                                          */
/* ------------------------------------------------------------------ */

function StepCard({ step, depth }: { step: RunStepSummaryView; depth: number }) {
  const state = step.state as RunState
  const isRunning = state === 'running'
  const elapsed = useElapsed(step.startedAt, isRunning)
  const duration = !isRunning && step.durationMs != null ? formatDuration(step.durationMs) : null
  const timeLabel = elapsed ?? duration

  return (
    <div
      data-testid={`steps-pane-step-${step.stepId}`}
      data-depth={depth}
      className="flex w-64 shrink-0 flex-col gap-2.5 rounded-xl border border-(--line) p-3.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm leading-tight font-bold text-foreground">Step #{step.nodeStepIndex}</span>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold tracking-[0.12em] uppercase"
          style={{ color: `var(--run-status-${state}-text)` }}
        >
          {state}
          <StateDot state={state} pulse={isRunning} />
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
        <span className="min-w-0 truncate font-mono">{step.stepId}</span>
        {timeLabel && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 whitespace-nowrap tabular-nums">
            <Timer className="size-2.5" />
            {timeLabel}
          </span>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Node segment                                                       */
/* ------------------------------------------------------------------ */

function NodeSegmentView({ segment }: { segment: StepTreeSegment }) {
  const lastStepIndex = findLastStepIndex(segment.items)

  return (
    <div className="flex flex-col">
      {/* Node label with rail origin */}
      <div className="relative flex items-center pb-2 pl-5">
        {/* Origin dot centered on rail axis */}
        <div className="absolute top-1/2 -left-0.5 size-1.25 -translate-y-1/2 rounded-full bg-(--line)" />
        {/* Connecting line from dot to first item */}
        {segment.items.length > 0 && <div className="absolute top-1/2 left-0 h-1/2 w-px bg-(--line)" />}
        <span className="truncate font-mono text-xs text-muted-foreground">node {segment.nodeId}</span>
      </div>

      {/* Items with rail */}
      {segment.items.map((item, index) => {
        const isStep = item.type === 'step'
        const isLastStep = index === lastStepIndex
        const isAfterLastStep = lastStepIndex >= 0 && index > lastStepIndex
        const hasMore = index < segment.items.length - 1

        const key = isStep ? item.step.stepId : `seg-${item.segment.nodeId}`

        return (
          <div key={key} className={`relative pl-5 ${hasMore ? 'pb-1.5' : ''}`}>
            {/* Vertical rail */}
            {!isAfterLastStep && (
              <div className={`absolute top-0 left-0 w-px bg-(--line) ${isLastStep ? 'h-1/2' : 'h-full'}`} />
            )}
            {/* Horizontal connector (steps only) */}
            {isStep && !isAfterLastStep && <div className="absolute top-1/2 left-0 h-px w-5 bg-(--line)" />}
            {/* Content */}
            {isStep ? <StepCard step={item.step} depth={segment.depth} /> : <NodeSegmentView segment={item.segment} />}
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Steps Pane                                                         */
/* ------------------------------------------------------------------ */

export function StepsPane({ steps, nodes }: { steps: RunStepSummaryView[]; nodes: RunNodeProjectionView[] }) {
  const depthMap = useMemo(() => buildNodeDepthMap(nodes), [nodes])
  const tree = useMemo(() => buildStepTree(steps, depthMap), [steps, depthMap])

  return (
    <aside
      data-testid="run-detail-steps-pane"
      className="flex min-h-0 w-[320px] shrink-0 flex-col border-r border-(--line) bg-(--sidebar-bg)"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 px-4 pt-2.5 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-(--sigil-accent-soft)">
            <ListOrdered className="size-3.5 text-(--sigil-accent)" />
          </div>
          <span className="text-sm font-bold text-foreground uppercase">Steps</span>
          <Badge
            data-testid="steps-pane-count"
            variant="outline"
            className="ml-auto border-border bg-secondary text-xs font-bold text-muted-foreground"
          >
            {steps.length}
          </Badge>
        </div>
      </div>

      <Separator className="bg-(--line)" />

      {/* Step list */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-3">
          {tree.map((segment) => (
            <NodeSegmentView key={segment.nodeId} segment={segment} />
          ))}

          {steps.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">No steps recorded.</div>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </aside>
  )
}
