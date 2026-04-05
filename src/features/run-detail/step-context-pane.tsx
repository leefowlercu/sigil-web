import { ChevronLeft, ChevronRight, Footprints } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Separator } from '#/components/ui/separator'
import type { RunState } from '#/lib/demo-data'
import type { RunStepDetailView } from '#/lib/protocol'
import { StateDot } from '#/features/agents-workspace/status-primitives'

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

export function StepContextPane({
  step,
  actionIndex,
  onActionIndexChange,
}: {
  step: RunStepDetailView
  actionIndex: number
  onActionIndexChange: (index: number) => void
}) {
  const state = step.state as RunState
  const isRunning = state === 'running'
  const actionCount = step.actionRefs?.length ?? 0
  const hasMultipleActions = actionCount > 1

  return (
    <div
      data-testid="step-context-pane"
      className="flex shrink-0 items-center gap-3 border-b border-(--line) bg-(--workspace-bg) pt-2.5 pr-3 pb-3 pl-4"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-(--sigil-accent-soft)">
        <Footprints className="size-3.5 text-(--sigil-accent)" />
      </span>
      <span className="text-sm font-bold tracking-tight text-foreground">Step #{step.nodeStepIndex}</span>

      <Separator orientation="vertical" className="h-4 shrink-0" />

      <span
        className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold tracking-[0.12em] uppercase"
        style={{ color: `var(--run-status-${state}-text)` }}
      >
        {state}
        <StateDot state={state} pulse={isRunning} />
      </span>

      {step.durationMs != null && (
        <>
          <Separator orientation="vertical" className="h-4 shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">
            {formatDuration(step.durationMs)}
          </span>
        </>
      )}

      <Separator orientation="vertical" className="h-4 shrink-0" />

      <span className="truncate font-mono text-xs text-muted-foreground">{step.nodeId}</span>

      {hasMultipleActions && (
        <div data-testid="step-action-pagination" className="ml-auto flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-6"
            disabled={actionIndex <= 0}
            onClick={() => onActionIndexChange(actionIndex - 1)}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">
            {actionIndex + 1}/{actionCount}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-6"
            disabled={actionIndex >= actionCount - 1}
            onClick={() => onActionIndexChange(actionIndex + 1)}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
