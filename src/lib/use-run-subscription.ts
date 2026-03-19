import { useEffect, useReducer } from 'react'
import type {
  EventEnvelopeView,
  RunProjectionView,
  RunStepSummaryView,
} from '#/lib/protocol'
import { getRunSnapshot } from './data'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type RunSubscriptionStatus = 'loading' | 'active' | 'terminal' | 'error'

export type RunSubscriptionState = {
  status: RunSubscriptionStatus
  projection: RunProjectionView | null
  events: EventEnvelopeView[]
  steps: RunStepSummaryView[]
  terminal: boolean
  error: string | null
}

export type RunSubscriptionAction =
  | {
      type: 'SNAPSHOT_LOADED'
      projection: RunProjectionView
      events: EventEnvelopeView[]
      steps: RunStepSummaryView[]
    }
  | { type: 'EVENT_APPENDED'; event: EventEnvelopeView }
  | { type: 'STATUS_CHANGED'; state: string; terminal: boolean }
  | { type: 'PROJECTION_UPDATED'; projection: RunProjectionView }
  | { type: 'STEP_STARTED'; step: RunStepSummaryView }
  | {
      type: 'STEP_COMPLETED'
      stepId: string
      completedAt: string
      durationMs: number
      decision?: string
    }
  | { type: 'SUBSCRIPTION_ERROR'; error: string }
  | { type: 'RESET' }

/* ------------------------------------------------------------------ */
/*  Reducer                                                            */
/* ------------------------------------------------------------------ */

export const initialState: RunSubscriptionState = {
  status: 'loading',
  projection: null,
  events: [],
  steps: [],
  terminal: false,
  error: null,
}

const terminalStates = new Set(['completed', 'failed', 'interrupted'])

export function runSubscriptionReducer(
  state: RunSubscriptionState,
  action: RunSubscriptionAction,
): RunSubscriptionState {
  switch (action.type) {
    case 'RESET':
      return initialState

    case 'SNAPSHOT_LOADED': {
      const isTerminal = terminalStates.has(action.projection.state)
      return {
        status: isTerminal ? 'terminal' : 'active',
        projection: action.projection,
        events: action.events,
        steps: action.steps,
        terminal: isTerminal,
        error: null,
      }
    }

    case 'EVENT_APPENDED':
      return {
        ...state,
        events: [...state.events, action.event],
      }

    case 'STATUS_CHANGED': {
      const isTerminal = action.terminal
      return {
        ...state,
        status: isTerminal ? 'terminal' : state.status,
        terminal: isTerminal,
        projection: state.projection
          ? { ...state.projection, state: action.state }
          : null,
      }
    }

    case 'PROJECTION_UPDATED':
      return {
        ...state,
        projection: action.projection,
      }

    case 'STEP_STARTED':
      return {
        ...state,
        steps: [...state.steps, action.step],
      }

    case 'STEP_COMPLETED':
      return {
        ...state,
        steps: state.steps.map((step) =>
          step.stepId === action.stepId
            ? {
                ...step,
                state: 'completed',
                completedAt: action.completedAt,
                durationMs: action.durationMs,
                decision: action.decision ?? step.decision,
              }
            : step,
        ),
      }

    case 'SUBSCRIPTION_ERROR':
      return {
        ...state,
        status: 'error',
        error: action.error,
      }
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useRunSubscription(runId: string): RunSubscriptionState {
  const [state, dispatch] = useReducer(runSubscriptionReducer, initialState)

  useEffect(() => {
    dispatch({ type: 'RESET' })

    const snapshot = getRunSnapshot(runId)
    if (snapshot) {
      dispatch({
        type: 'SNAPSHOT_LOADED',
        projection: snapshot.projection,
        events: snapshot.events,
        steps: snapshot.steps,
      })
    }

    // Future: live mode would call run/subscribe here and wire up
    // notification handlers that dispatch EVENT_APPENDED, STATUS_CHANGED,
    // PROJECTION_UPDATED, STEP_STARTED, and STEP_COMPLETED actions.

    return () => {
      // Future: live mode would call run/unsubscribe here
    }
  }, [runId])

  return state
}
