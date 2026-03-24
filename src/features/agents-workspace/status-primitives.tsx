import { CircleDot, CheckCircle2, AlertOctagon, XCircle, Clock } from 'lucide-react'
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
    dotClass: 'bg-(--run-status-running) shadow-(--run-status-running-shadow)',
    badgeClass:
      'border-(--run-status-running-border) bg-(--run-status-running-bg) text-(--run-status-running-text)',
  },
  completed: {
    label: 'Completed',
    dotClass: 'bg-(--run-status-completed)',
    badgeClass:
      'border-(--run-status-completed-border) bg-(--run-status-completed-bg) text-(--run-status-completed-text)',
  },
  failed: {
    label: 'Failed',
    dotClass: 'bg-(--run-status-failed)',
    badgeClass:
      'border-(--run-status-failed-border) bg-(--run-status-failed-bg) text-(--run-status-failed-text)',
  },
  interrupted: {
    label: 'Interrupted',
    dotClass: 'bg-(--run-status-interrupted)',
    badgeClass:
      'border-(--run-status-interrupted-border) bg-(--run-status-interrupted-bg) text-(--run-status-interrupted-text)',
  },
  queued: {
    label: 'Queued',
    dotClass: 'bg-(--run-status-queued)',
    badgeClass:
      'border-(--run-status-queued-border) bg-(--run-status-queued-bg) text-(--run-status-queued-text)',
  },
}

export function StateDot({ state, pulse }: { state: RunState; pulse?: boolean }) {
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
      className="inline-flex items-center gap-1.5 text-[0.65rem] font-semibold tracking-[0.12em] uppercase"
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
      return <CircleDot className={`${cls} text-(--run-status-running)`} />
    case 'completed':
      return <CheckCircle2 className={`${cls} text-(--run-status-completed)`} />
    case 'failed':
      return <XCircle className={`${cls} text-(--run-status-failed)`} />
    case 'interrupted':
      return <AlertOctagon className={`${cls} text-(--run-status-interrupted)`} />
    case 'queued':
      return <Clock className={`${cls} text-(--run-status-queued)`} />
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
    dotClass: 'bg-(--connection-ready)',
    badgeClass:
      'border-(--connection-ready-border) bg-(--connection-ready-bg) text-(--connection-ready-text)',
    pulse: false,
  },
  degraded: {
    label: 'Degraded',
    dotClass: 'bg-(--connection-degraded)',
    badgeClass:
      'border-(--connection-degraded-border) bg-(--connection-degraded-bg) text-(--connection-degraded-text)',
    pulse: false,
  },
  reconnecting: {
    label: 'Reconnecting',
    dotClass: 'bg-(--connection-reconnecting)',
    badgeClass:
      'border-(--connection-reconnecting-border) bg-(--connection-reconnecting-bg) text-(--connection-reconnecting-text)',
    pulse: true,
  },
  disconnected: {
    label: 'Disconnected',
    dotClass: 'bg-(--connection-disconnected)',
    badgeClass:
      'border-(--connection-disconnected-border) bg-(--connection-disconnected-bg) text-(--connection-disconnected-text)',
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
      className={`gap-1.5 border py-0.5 text-[0.65rem] font-semibold tracking-[0.12em] uppercase ${config.badgeClass}`}
    >
      <ConnectionStateDot state={state} />
      {config.label}
    </Badge>
  )
}
