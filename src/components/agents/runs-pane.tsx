import { useEffect, useState } from 'react'
import { Terminal, Timer } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { ScrollArea } from '#/components/ui/scroll-area'
import type { RunState } from '#/lib/demo-data'
import type { RunSummaryView } from '#/lib/protocol'
import { StateBadge } from './status-primitives'

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

/* ------------------------------------------------------------------ */
/*  Run Card (file-local)                                               */
/* ------------------------------------------------------------------ */

function RunCard({
  run,
  isSelected,
  onSelect,
}: {
  run: RunSummaryView
  isSelected: boolean
  onSelect: () => void
}) {
  const state = run.state as RunState
  const isActive = state === 'running' || state === 'queued'
  const elapsed = useElapsed(run.startedAt, isActive)
  const duration =
    !isActive && run.startedAt && run.terminalAt
      ? formatDuration(
          new Date(run.terminalAt).getTime() -
            new Date(run.startedAt).getTime(),
        )
      : null
  const timeLabel = elapsed ?? duration

  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`run-item-${run.runId}`}
      className={`group flex w-full flex-col gap-2.5 rounded-xl border p-3.5 text-left transition-all ${
        isSelected
          ? 'border-[var(--sigil-accent-border)] bg-[var(--sigil-accent-hover)] shadow-sm'
          : 'border-[var(--line)] bg-transparent hover:border-[var(--border)] hover:bg-[var(--surface)]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.75rem] font-bold leading-tight text-[var(--foreground)]">
          {run.name}
        </span>
        <StateBadge state={state} />
      </div>

      <div className="flex items-center gap-3 text-[0.68rem] font-semibold text-[var(--muted-foreground)]">
        <span className="min-w-0 truncate font-mono">
          {run.runId}
        </span>
        {timeLabel && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 whitespace-nowrap tabular-nums">
            <Timer className="size-2.5" />
            {timeLabel}
          </span>
        )}
      </div>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Runs Pane                                                           */
/* ------------------------------------------------------------------ */

export function RunsPane({
  runs,
  activeRunId,
  onSelectRun,
}: {
  runs: RunSummaryView[]
  activeRunId: string | null
  onSelectRun: (id: string) => void
}) {
  return (
    <div className="flex w-[360px] shrink-0 flex-col border-r border-[var(--line)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-[15px]">
        <span className="text-sm font-bold uppercase text-[var(--foreground)]">
          Runs
        </span>
        <Badge
          variant="outline"
          className="border-[var(--border)] bg-[var(--secondary)] text-[0.58rem] font-bold text-[var(--muted-foreground)]"
        >
          {runs.length}
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-3">
          {runs.map((run) => (
            <RunCard
              key={run.runId}
              run={run}
              isSelected={run.runId === activeRunId}
              onSelect={() => onSelectRun(run.runId)}
            />
          ))}

          {runs.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Terminal className="size-6 text-[var(--muted-foreground)] opacity-40" />
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                No runs for this agent.
              </span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
