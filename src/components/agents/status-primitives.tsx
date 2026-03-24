import {
  CircleDot,
  CheckCircle2,
  AlertOctagon,
  XCircle,
  Clock,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import type { ConnectionState, RunState } from '#/lib/demo-data'

/* ------------------------------------------------------------------ */
/*  Run state                                                          */
/* ------------------------------------------------------------------ */

export const STATE_CONFIG: Record<
  RunState,
  { label: string; dotClass: string; badgeClass: string }
> = {
  running: {
    label: 'Running',
    dotClass:
      'bg-[var(--run-status-running)] shadow-[var(--run-status-running-shadow)]',
    badgeClass:
      'border-[var(--run-status-running-border)] bg-[var(--run-status-running-bg)] text-[var(--run-status-running-text)]',
  },
  completed: {
    label: 'Completed',
    dotClass: 'bg-[var(--run-status-completed)]',
    badgeClass:
      'border-[var(--run-status-completed-border)] bg-[var(--run-status-completed-bg)] text-[var(--run-status-completed-text)]',
  },
  failed: {
    label: 'Failed',
    dotClass: 'bg-[var(--run-status-failed)]',
    badgeClass:
      'border-[var(--run-status-failed-border)] bg-[var(--run-status-failed-bg)] text-[var(--run-status-failed-text)]',
  },
  interrupted: {
    label: 'Interrupted',
    dotClass: 'bg-[var(--run-status-interrupted)]',
    badgeClass:
      'border-[var(--run-status-interrupted-border)] bg-[var(--run-status-interrupted-bg)] text-[var(--run-status-interrupted-text)]',
  },
  queued: {
    label: 'Queued',
    dotClass: 'bg-[var(--run-status-queued)]',
    badgeClass:
      'border-[var(--run-status-queued-border)] bg-[var(--run-status-queued-bg)] text-[var(--run-status-queued-text)]',
  },
}

export function StateDot({
  state,
  pulse,
}: {
  state: RunState
  pulse?: boolean
}) {
  const config = STATE_CONFIG[state]
  return (
    <span className="relative flex size-2.5">
      {pulse && (
        <span
          className={`absolute inset-0 rounded-full ${config.dotClass} animate-ping opacity-60`}
        />
      )}
      <span className={`relative size-2.5 rounded-full ${config.dotClass}`} />
    </span>
  )
}

export function StateBadge({ state }: { state: RunState }) {
  const config = STATE_CONFIG[state]
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em]"
      style={{ color: `var(--run-status-${state}-text)` }}
    >
      {config.label}
      <StateDot state={state} pulse={state === 'running'} />
    </span>
  )
}

export function StateIcon({ state }: { state: RunState }) {
  const cls = 'size-3.5'
  switch (state) {
    case 'running':
      return <CircleDot className={`${cls} text-[var(--run-status-running)]`} />
    case 'completed':
      return (
        <CheckCircle2 className={`${cls} text-[var(--run-status-completed)]`} />
      )
    case 'failed':
      return <XCircle className={`${cls} text-[var(--run-status-failed)]`} />
    case 'interrupted':
      return (
        <AlertOctagon
          className={`${cls} text-[var(--run-status-interrupted)]`}
        />
      )
    case 'queued':
      return <Clock className={`${cls} text-[var(--run-status-queued)]`} />
  }
}

/* ------------------------------------------------------------------ */
/*  Connection state                                                   */
/* ------------------------------------------------------------------ */

export const CONNECTION_STATE_CONFIG: Record<
  ConnectionState,
  { label: string; dotClass: string; badgeClass: string; pulse: boolean }
> = {
  ready: {
    label: 'Ready',
    dotClass: 'bg-[var(--connection-ready)]',
    badgeClass:
      'border-[var(--connection-ready-border)] bg-[var(--connection-ready-bg)] text-[var(--connection-ready-text)]',
    pulse: false,
  },
  degraded: {
    label: 'Degraded',
    dotClass: 'bg-[var(--connection-degraded)]',
    badgeClass:
      'border-[var(--connection-degraded-border)] bg-[var(--connection-degraded-bg)] text-[var(--connection-degraded-text)]',
    pulse: false,
  },
  reconnecting: {
    label: 'Reconnecting',
    dotClass: 'bg-[var(--connection-reconnecting)]',
    badgeClass:
      'border-[var(--connection-reconnecting-border)] bg-[var(--connection-reconnecting-bg)] text-[var(--connection-reconnecting-text)]',
    pulse: true,
  },
  disconnected: {
    label: 'Disconnected',
    dotClass: 'bg-[var(--connection-disconnected)]',
    badgeClass:
      'border-[var(--connection-disconnected-border)] bg-[var(--connection-disconnected-bg)] text-[var(--connection-disconnected-text)]',
    pulse: false,
  },
}

export function ConnectionStateDot({ state }: { state: ConnectionState }) {
  const config = CONNECTION_STATE_CONFIG[state]
  return (
    <span className="relative flex size-2">
      {config.pulse && (
        <span
          className={`absolute inset-0 rounded-full ${config.dotClass} animate-ping opacity-60`}
        />
      )}
      <span className={`relative size-2 rounded-full ${config.dotClass}`} />
    </span>
  )
}

export function ConnectionStateBadge({ state }: { state: ConnectionState }) {
  const config = CONNECTION_STATE_CONFIG[state]
  return (
    <Badge
      variant="outline"
      className={`gap-1.5 border py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${config.badgeClass}`}
    >
      <ConnectionStateDot state={state} />
      {config.label}
    </Badge>
  )
}
