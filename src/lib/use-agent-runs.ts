import { useEffect, useReducer } from 'react'
import type { RunSummaryView } from '#/lib/protocol'
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

export function agentRunsReducer(
  state: AgentRunsState,
  action: AgentRunsAction,
): AgentRunsState {
  switch (action.type) {
    case 'RESET':
      return initialState

    case 'RUNS_LOADED':
      return { runs: action.runs }

    case 'RUN_STARTED':
      return { runs: [action.run, ...state.runs] }

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
  const [state, dispatch] = useReducer(agentRunsReducer, initialState)

  useEffect(() => {
    dispatch({ type: 'RESET' })
    if (!agentId) return

    const runs = getRunsForAgent(agentId)
    if (runs.length > 0) {
      dispatch({ type: 'RUNS_LOADED', runs })
    }

    // Demo mode: simulate a running run completing after 12 seconds
    if (import.meta.env.VITE_DATA_SOURCE === 'demo') {
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
    }

    // Future: live mode would subscribe to run/started and run/completed
    // notifications for this agent and dispatch accordingly
  }, [agentId])

  return state.runs
}
