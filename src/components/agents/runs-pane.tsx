import { Terminal, Clock, Hash } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { ScrollArea } from '#/components/ui/scroll-area'
import type { RunState } from '#/lib/demo-data'
import type { RunSummaryView } from '#/lib/protocol'
import { StateBadge, StateIcon } from './status-primitives'

function formatTimestamp(iso?: string): string {
  if (!iso) return '--'
  const date = new Date(iso)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`run-item-${run.runId}`}
      className={`group flex w-full flex-col gap-2 rounded-xl border p-3.5 text-left transition-all ${
        isSelected
          ? 'border-[var(--sigil-accent-border)] bg-[var(--sigil-accent-hover)] shadow-sm'
          : 'border-[var(--line)] bg-transparent hover:border-[var(--line)] hover:bg-[var(--surface)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <StateIcon state={state} />
          <span className="font-mono text-[0.72rem] font-bold leading-tight text-[var(--foreground)]">
            {run.runId.slice(0, 13)}
          </span>
        </div>
        <StateBadge state={state} />
      </div>

      <div className="flex items-center gap-3 pl-5.5 text-[0.62rem] font-semibold text-[var(--muted-foreground)]">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-2.5" />
          {formatTimestamp(run.startedAt)}
        </span>
        {run.source && (
          <span className="inline-flex items-center gap-1">
            <Hash className="size-2.5" />
            {run.source}
          </span>
        )}
        {run.pidStatus && (
          <span className="inline-flex items-center gap-1 rounded-md bg-[var(--secondary)] px-1.5 py-0.5 text-[0.55rem] font-semibold text-[var(--muted-foreground)]">
            pid: {run.pidStatus}
          </span>
        )}
      </div>

      {run.stopRequested && (
        <p className="pl-5.5 text-[0.68rem] leading-snug font-semibold text-[var(--run-status-interrupted)]">
          Stop requested
        </p>
      )}
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
        <span className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
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
