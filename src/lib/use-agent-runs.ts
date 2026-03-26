import { useEffect, useReducer, useSyncExternalStore } from 'react'
import type { RunSummaryView } from '#/lib/protocol'
import { getAgentSession, getAgentSessionSnapshot, listAllRuns, subscribeAgentSessionStore } from './appserver/store'
import { getRunsForAgent } from './data'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type AgentRunsAction =
  | { type: 'RUNS_RESET' }
  | { type: 'RUNS_SNAPSHOT_LOADED'; runs: RunSummaryView[] }
  | { type: 'RUN_UPSERTED'; run: RunSummaryView }
  | {
      type: 'RUN_STATUS_CHANGED'
      runId: string
      state: RunSummaryView['state']
      terminal: boolean
    }
  | { type: 'RUN_REMOVED'; runId: string }

export type AgentRunsState = {
  runs: RunSummaryView[]
}

/* ------------------------------------------------------------------ */
/*  Reducer                                                           */
/* ------------------------------------------------------------------ */

export const initialState: AgentRunsState = {
  runs: [],
}

const nullSessionSnapshot = null as ReturnType<typeof getAgentSessionSnapshot>
const terminalStates = new Set(['completed', 'failed', 'interrupted'])

export function agentRunsReducer(state: AgentRunsState, action: AgentRunsAction): AgentRunsState {
  switch (action.type) {
    case 'RUNS_RESET':
      return initialState

    case 'RUNS_SNAPSHOT_LOADED':
      return {
        runs: sortRunsNewestFirst(action.runs),
      }

    case 'RUN_UPSERTED':
      return {
        runs: sortRunsNewestFirst(state.runs.filter((run) => run.runId !== action.run.runId).concat(action.run)),
      }

    case 'RUN_STATUS_CHANGED':
      return {
        runs: sortRunsNewestFirst(
          state.runs.map((run) => {
            if (run.runId !== action.runId) {
              return run
            }

            const nextRun: RunSummaryView = {
              ...run,
              state: action.state,
              terminalAt: action.terminal && !run.terminalAt ? new Date().toISOString() : run.terminalAt,
            }

            return normalizeRunSummary(nextRun)
          }),
        ),
      }

    case 'RUN_REMOVED':
      return {
        runs: state.runs.filter((run) => run.runId !== action.runId),
      }
  }
}

function sortRunsNewestFirst(runs: RunSummaryView[]): RunSummaryView[] {
  return [...runs].sort((left, right) => {
    const leftTime = runSortTime(left)
    const rightTime = runSortTime(right)
    if (leftTime === rightTime) {
      return right.runId.localeCompare(left.runId)
    }
    return rightTime.localeCompare(leftTime)
  })
}

function runSortTime(run: RunSummaryView): string {
  return run.queuedAt ?? run.startedAt ?? run.terminalAt ?? ''
}

function shouldRequestCleanupUnsubscribe(args: {
  agentId: string
  connectionID: number
  session: NonNullable<ReturnType<typeof getAgentSession>>
}): boolean {
  if (args.connectionID < 1) {
    return false
  }

  const trackedSession = getAgentSession(args.agentId)
  if (trackedSession !== args.session) {
    return false
  }

  const snapshot = args.session.getSnapshot()
  return snapshot.initialized && snapshot.connectionID === args.connectionID
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAgentRuns(agentId: string): RunSummaryView[] {
  const isDemoMode = import.meta.env.VITE_DATA_SOURCE === 'demo'
  const [state, dispatch] = useReducer(agentRunsReducer, initialState)
  const sessionSnapshot = useSyncExternalStore(
    subscribeAgentSessionStore,
    () => getAgentSessionSnapshot(agentId),
    () => nullSessionSnapshot,
  )

  useEffect(() => {
    dispatch({ type: 'RUNS_RESET' })
    if (!agentId) return

    if (!isDemoMode) {
      return
    }

    const runs = getRunsForAgent(agentId)
    if (runs.length > 0) {
      dispatch({ type: 'RUNS_SNAPSHOT_LOADED', runs })
    }

    // Demo mode: simulate a running run completing after 12 seconds
    const runningRun = runs.find((r) => r.state === 'running')
    if (runningRun) {
      const timeout = setTimeout(() => {
        dispatch({
          type: 'RUN_UPSERTED',
          run: {
            ...runningRun,
            state: 'completed',
            terminalAt: new Date().toISOString(),
            pidStatus: 'not_running',
          },
        })
      }, 12000)
      return () => clearTimeout(timeout)
    }
  }, [agentId, isDemoMode])

  useEffect(() => {
    if (isDemoMode || !agentId) {
      return
    }

    const session = getAgentSession(agentId)
    if (session == null || sessionSnapshot == null || sessionSnapshot.connectionID < 1) {
      return
    }

    let cancelled = false
    const subscribedConnectionID = sessionSnapshot.connectionID
    let attachPromise: Promise<void> | null = null

    const loadRunsSnapshot = async () => {
      try {
        const runs = await listAllRuns(session)
        if (!cancelled) {
          dispatch({ type: 'RUNS_SNAPSHOT_LOADED', runs })
        }
      } catch {
        if (!cancelled) {
          dispatch({ type: 'RUNS_SNAPSHOT_LOADED', runs: [] })
        }
      }
    }

    const attachRunsSubscription = async () => {
      await loadRunsSnapshot()

      const subscribeResult = await session.request('runs/subscribe', {})
      if (cancelled) {
        return
      }

      dispatch({
        type: 'RUNS_SNAPSHOT_LOADED',
        runs: subscribeResult.payload.items,
      })
    }

    const queueRunsSubscription = () => {
      if (attachPromise != null) {
        return
      }

      attachPromise = attachRunsSubscription()
        .catch(() => {
          // Preserve the most recent snapshot if the live attach fails after a
          // successful list load; loadRunsSnapshot already handles empty-state
          // fallback when the read path itself fails.
        })
        .finally(() => {
          attachPromise = null
        })
    }

    const unsubscribeNotifications = session.subscribeNotifications((notification) => {
      switch (notification.method) {
        case 'runs/changed':
          switch (notification.params.payload.kind) {
            case 'upsert':
              if (notification.params.payload.run != null) {
                dispatch({
                  type: 'RUN_UPSERTED',
                  run: normalizeRunSummary(notification.params.payload.run),
                })
              }
              break
            case 'remove':
              if (notification.params.payload.runId != null) {
                dispatch({
                  type: 'RUN_REMOVED',
                  runId: notification.params.payload.runId,
                })
              }
              break
            case 'reset':
              dispatch({ type: 'RUNS_RESET' })
              queueRunsSubscription()
              break
            default:
              break
          }
          break
        case 'run/statusChanged':
        case 'run/completed':
          dispatch({
            type: 'RUN_STATUS_CHANGED',
            runId: notification.params.runId,
            state: notification.params.payload.state,
            terminal: notification.params.payload.terminal,
          })
          break
        default:
          break
      }
    })

    queueRunsSubscription()

    return () => {
      cancelled = true
      unsubscribeNotifications()
      if (
        !shouldRequestCleanupUnsubscribe({
          agentId,
          connectionID: subscribedConnectionID,
          session,
        })
      ) {
        return
      }
      void session.request('runs/unsubscribe', {}).catch(() => {
        // The connection may already be gone during cleanup.
      })
    }
  }, [agentId, isDemoMode, sessionSnapshot?.connectionID])

  return state.runs
}

function normalizeRunSummary(run: RunSummaryView): RunSummaryView {
  if (!terminalStates.has(run.state)) {
    return run
  }
  return {
    ...run,
    pidStatus: run.pidStatus === 'current' ? 'not_running' : run.pidStatus,
  }
}
