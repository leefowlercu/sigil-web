import { useEffect, useReducer, useSyncExternalStore } from 'react'
import type { RunSummaryView } from '#/lib/protocol'
import {
  getAgentSession,
  getAgentSessionSnapshot,
  listAllRuns,
  runSummaryFromProjection,
  subscribeAgentSessionStore,
} from './appserver/store'
import { getRunsForAgent } from './data'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type AgentRunsAction =
  | { type: 'RUNS_LOADED'; runs: RunSummaryView[] }
  | { type: 'RUN_STARTED'; run: RunSummaryView }
  | {
      type: 'RUN_STATE_CHANGED'
      runId: string
      state: string
      terminalAt?: string
    }
  | { type: 'RESET' }

export type AgentRunsState = {
  runs: RunSummaryView[]
}

/* ------------------------------------------------------------------ */
/*  Reducer                                                            */
/* ------------------------------------------------------------------ */

export const initialState: AgentRunsState = {
  runs: [],
}

const nullSessionSnapshot = null as ReturnType<typeof getAgentSessionSnapshot>

export function agentRunsReducer(
  state: AgentRunsState,
  action: AgentRunsAction,
): AgentRunsState {
  switch (action.type) {
    case 'RESET':
      return initialState

    case 'RUNS_LOADED':
      return { runs: action.runs }

    case 'RUN_STARTED': {
      const existingRun = state.runs.find(
        (run) => run.runId === action.run.runId,
      )
      if (!existingRun) {
        return { runs: [action.run, ...state.runs] }
      }
      return {
        runs: [
          { ...existingRun, ...action.run },
          ...state.runs.filter((run) => run.runId !== action.run.runId),
        ],
      }
    }

    case 'RUN_STATE_CHANGED':
      return {
        runs: state.runs.map((r) =>
          r.runId === action.runId
            ? {
                ...r,
                state: action.state,
                terminalAt: action.terminalAt ?? r.terminalAt,
                pidStatus:
                  action.terminalAt != null ? 'not_running' : r.pidStatus,
              }
            : r,
        ),
      }
  }
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
    dispatch({ type: 'RESET' })
    if (!agentId) return

    if (!isDemoMode) {
      return
    }

    const runs = getRunsForAgent(agentId)
    if (runs.length > 0) {
      dispatch({ type: 'RUNS_LOADED', runs })
    }

    // Demo mode: simulate a running run completing after 12 seconds
    const runningRun = runs.find((r) => r.state === 'running')
    if (runningRun) {
      const timeout = setTimeout(() => {
        dispatch({
          type: 'RUN_STATE_CHANGED',
          runId: runningRun.runId,
          state: 'completed',
          terminalAt: new Date().toISOString(),
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
    if (
      session == null ||
      sessionSnapshot == null ||
      sessionSnapshot.connectionID < 1
    ) {
      return
    }

    let cancelled = false

    const loadRuns = async () => {
      try {
        const runs = await listAllRuns(session)
        if (!cancelled) {
          dispatch({ type: 'RUNS_LOADED', runs })
        }
      } catch {
        if (!cancelled) {
          dispatch({ type: 'RUNS_LOADED', runs: [] })
        }
      }
    }

    const unsubscribeNotifications = session.subscribeNotifications(
      (notification) => {
        switch (notification.method) {
          case 'run/started':
            dispatch({
              type: 'RUN_STARTED',
              run: runSummaryFromProjection(notification.params.payload.run),
            })
            break
          case 'run/completed':
          case 'run/statusChanged':
            dispatch({
              type: 'RUN_STATE_CHANGED',
              runId: notification.params.runId,
              state: notification.params.payload.state,
            })
            if (notification.params.payload.terminal) {
              void loadRuns()
            }
            break
          default:
            break
        }
      },
    )

    void loadRuns()

    return () => {
      cancelled = true
      unsubscribeNotifications()
    }
  }, [agentId, isDemoMode, sessionSnapshot?.connectionID])

  return state.runs
}
