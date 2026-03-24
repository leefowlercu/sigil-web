import { useEffect, useReducer, useRef, useSyncExternalStore } from 'react'
import type {
  EventEnvelopeView,
  RunProjectionView,
  RunStepSummaryView,
  RunTreeReadPayload,
} from '#/lib/protocol'
import {
  getAgentSession,
  getAgentSessionSnapshot,
  subscribeAgentSessionStore,
} from './appserver/store'
import { getRunSnapshot } from './data'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type RunSubscriptionStatus = 'loading' | 'active' | 'terminal' | 'error'

export type RunSubscriptionState = {
  status: RunSubscriptionStatus
  projection: RunProjectionView | null
  tree: RunTreeReadPayload | null
  events: EventEnvelopeView[]
  steps: RunStepSummaryView[]
  terminal: boolean
  error: string | null
}

export type RunSubscriptionAction =
  | {
      type: 'SNAPSHOT_LOADED'
      projection: RunProjectionView
      tree: RunTreeReadPayload | null
      events: EventEnvelopeView[]
      steps: RunStepSummaryView[]
    }
  | { type: 'EVENT_APPENDED'; event: EventEnvelopeView }
  | { type: 'STATUS_CHANGED'; state: string; terminal: boolean }
  | { type: 'PROJECTION_UPDATED'; projection: RunProjectionView }
  | {
      type: 'STEP_ACTIVITY_RECORDED'
      field: 'actionCount' | 'subcallCount'
      stepId: string
    }
  | { type: 'STEP_STARTED'; step: RunStepSummaryView }
  | {
      type: 'STEP_COMPLETED'
      stepId: string
      completedAt: string
      durationMs: number
      decision?: string
    }
  | {
      type: 'TERMINAL_RECONCILED'
      projection: RunProjectionView
      tree: RunTreeReadPayload
      steps: RunStepSummaryView[]
    }
  | { type: 'SUBSCRIPTION_ERROR'; error: string }
  | { type: 'RESET' }

/* ------------------------------------------------------------------ */
/*  Reducer                                                            */
/* ------------------------------------------------------------------ */

export const initialState: RunSubscriptionState = {
  status: 'loading',
  projection: null,
  tree: null,
  events: [],
  steps: [],
  terminal: false,
  error: null,
}

const terminalStates = new Set(['completed', 'failed', 'interrupted'])
const nullSessionSnapshot = null as ReturnType<typeof getAgentSessionSnapshot>

function stateForProjection(
  projection: RunProjectionView,
): RunSubscriptionStatus {
  return terminalStates.has(projection.state) ? 'terminal' : 'active'
}

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
        tree: action.tree,
        events: action.events,
        steps: action.steps,
        terminal: isTerminal,
        error: null,
      }
    }

    case 'EVENT_APPENDED':
      return appendEventEnvelope(state, action.event)

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
        status: stateForProjection(action.projection),
        terminal: terminalStates.has(action.projection.state),
      }

    case 'STEP_ACTIVITY_RECORDED':
      return {
        ...state,
        steps: state.steps.map((step) =>
          step.stepId === action.stepId
            ? {
                ...step,
                [action.field]: step[action.field] + 1,
              }
            : step,
        ),
      }

    case 'STEP_STARTED':
      if (state.steps.some((step) => step.stepId === action.step.stepId)) {
        return state
      }
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

    case 'TERMINAL_RECONCILED': {
      const isTerminal = terminalStates.has(action.projection.state)
      return {
        ...state,
        status: isTerminal ? 'terminal' : 'active',
        projection: action.projection,
        tree: action.tree,
        steps: action.steps,
        terminal: isTerminal,
        error: null,
      }
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
/*  Event-derived step updates                                         */
/* ------------------------------------------------------------------ */

function payloadNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function payloadString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function deriveRunSubscriptionActions(
  event: EventEnvelopeView,
): RunSubscriptionAction[] {
  const stepId = payloadString(event.payload.stepId)
  switch (event.type) {
    case 'node.step.started': {
      const nodeId = event.nodeId
      const schemaId = payloadString(event.payload.schemaId)
      const stepIndex = payloadNumber(event.payload.stepIndex)
      if (!stepId || !nodeId || !schemaId || stepIndex == null) {
        return []
      }
      return [
        {
          type: 'STEP_STARTED',
          step: {
            nodeId,
            stepId,
            nodeStepIndex: stepIndex,
            stepStartedSeq: event.seq,
            schemaId,
            state: 'running',
            startedAt: event.ts,
            actionCount: 0,
            subcallCount: 0,
          },
        },
      ]
    }
    case 'node.step.completed': {
      const durationMs = payloadNumber(event.payload.durationMs)
      if (!stepId || durationMs == null) {
        return []
      }
      return [
        {
          type: 'STEP_COMPLETED',
          stepId,
          completedAt: event.ts,
          durationMs,
          decision: payloadString(event.payload.decision),
        },
      ]
    }
    case 'node.action.executed':
      if (!stepId) return []
      return [
        {
          type: 'STEP_ACTIVITY_RECORDED',
          field: 'actionCount',
          stepId,
        },
      ]
    case 'node.subcall.executed':
      if (!stepId) return []
      return [
        {
          type: 'STEP_ACTIVITY_RECORDED',
          field: 'subcallCount',
          stepId,
        },
      ]
    default:
      return []
  }
}

function applyDerivedActions(
  state: RunSubscriptionState,
  actions: RunSubscriptionAction[],
): RunSubscriptionState {
  return actions.reduce(
    (currentState, currentAction) =>
      runSubscriptionReducer(currentState, currentAction),
    state,
  )
}

function appendEventEnvelope(
  state: RunSubscriptionState,
  event: EventEnvelopeView,
): RunSubscriptionState {
  if (state.events.some((existingEvent) => existingEvent.seq === event.seq)) {
    return state
  }

  return applyDerivedActions(
    {
      ...state,
      events: [...state.events, event],
    },
    deriveRunSubscriptionActions(event),
  )
}

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : 'live subscription failed'
}

function shouldLoadFullSnapshot(
  state: RunSubscriptionState,
  runId: string,
): boolean {
  return state.projection == null || state.projection.runId !== runId
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

export function useRunSubscription(
  agentId: string,
  runId: string,
): RunSubscriptionState {
  const isDemoMode = import.meta.env.VITE_DATA_SOURCE === 'demo'
  const [state, dispatch] = useReducer(runSubscriptionReducer, initialState)
  const stateRef = useRef(state)
  const sessionSnapshot = useSyncExternalStore(
    subscribeAgentSessionStore,
    () => getAgentSessionSnapshot(agentId),
    () => nullSessionSnapshot,
  )

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    dispatch({ type: 'RESET' })
  }, [agentId, runId])

  useEffect(() => {
    if (!isDemoMode || !runId) {
      return
    }

    const snapshot = getRunSnapshot(runId)
    if (snapshot) {
      dispatch({
        type: 'SNAPSHOT_LOADED',
        projection: snapshot.projection,
        tree: null,
        events: snapshot.events,
        steps: snapshot.steps,
      })
    }
  }, [isDemoMode, runId])

  useEffect(() => {
    if (isDemoMode || !agentId || !runId || sessionSnapshot == null) {
      return
    }
    if (sessionSnapshot.connectionID < 1) {
      return
    }

    const session = getAgentSession(agentId)
    if (session == null) {
      return
    }
    const subscribedConnectionID = sessionSnapshot.connectionID

    let cancelled = false
    const isCancelled = () => cancelled

    const reconcileTerminal = async () => {
      try {
        const [runResult, treeResult, stepsResult] = await Promise.all([
          session.request('run/read', { runId }),
          session.request('run/tree/read', { runId }),
          session.request('run/steps/list', { runId }),
        ])
        if (isCancelled()) {
          return
        }
        dispatch({
          type: 'TERMINAL_RECONCILED',
          projection: runResult.payload.run,
          tree: treeResult.payload,
          steps: stepsResult.payload.steps,
        })
      } catch (error) {
        if (!isCancelled()) {
          dispatch({
            type: 'SUBSCRIPTION_ERROR',
            error: normalizeError(error),
          })
        }
      }
    }

    const unsubscribeNotifications = session.subscribeNotifications(
      (notification) => {
        switch (notification.method) {
          case 'run/eventAppended':
            if (notification.params.runId !== runId) {
              return
            }
            dispatch({
              type: 'EVENT_APPENDED',
              event: notification.params.payload.event,
            })
            break
          case 'run/started':
            if (notification.params.runId !== runId) {
              return
            }
            dispatch({
              type: 'PROJECTION_UPDATED',
              projection: notification.params.payload.run,
            })
            break
          case 'run/completed':
          case 'run/statusChanged':
            if (notification.params.runId !== runId) {
              return
            }
            dispatch({
              type: 'STATUS_CHANGED',
              state: notification.params.payload.state,
              terminal: notification.params.payload.terminal,
            })
            if (notification.params.payload.terminal) {
              void reconcileTerminal()
            }
            break
          default:
            break
        }
      },
    )

    const attach = async () => {
      try {
        const currentState = stateRef.current
        if (shouldLoadFullSnapshot(currentState, runId)) {
          const [runResult, treeResult, stepsResult, eventsResult] =
            await Promise.all([
              session.request('run/read', { runId }),
              session.request('run/tree/read', { runId }),
              session.request('run/steps/list', { runId }),
              session.request('run/events/read', { runId }),
            ])
          if (isCancelled()) {
            return
          }

          dispatch({
            type: 'SNAPSHOT_LOADED',
            projection: runResult.payload.run,
            tree: treeResult.payload,
            events: eventsResult.payload.events,
            steps: stepsResult.payload.steps,
          })

          const subscribeResult = await session.request('run/subscribe', {
            runId,
          })
          if (isCancelled()) {
            return
          }

          if (subscribeResult.payload.snapshot != null) {
            dispatch({
              type: 'PROJECTION_UPDATED',
              projection: subscribeResult.payload.snapshot.run,
            })
          }

          const loadedLastSeq = eventsResult.payload.lastSeq ?? 0
          if (subscribeResult.snapshotAsOfSeq > loadedLastSeq) {
            const [catchupEvents, catchupSteps] = await Promise.all([
              session.request('run/events/read', { runId }),
              session.request('run/steps/list', { runId }),
            ])
            if (isCancelled()) {
              return
            }
            dispatch({
              type: 'SNAPSHOT_LOADED',
              projection:
                subscribeResult.payload.snapshot?.run ?? runResult.payload.run,
              tree:
                subscribeResult.payload.snapshot?.tree ?? treeResult.payload,
              events: catchupEvents.payload.events,
              steps: catchupSteps.payload.steps,
            })
          }

          if (subscribeResult.payload.terminal) {
            void reconcileTerminal()
          }
          return
        }

        const afterSeq = currentState.events.at(-1)?.seq ?? 0
        const subscribeResult = await session.request(
          'run/subscribe',
          afterSeq > 0 ? { runId, afterSeq } : { runId },
        )
        if (isCancelled()) {
          return
        }

        if (subscribeResult.payload.snapshot != null) {
          dispatch({
            type: 'PROJECTION_UPDATED',
            projection: subscribeResult.payload.snapshot.run,
          })
        }

        for (const event of subscribeResult.payload.replayEvents ?? []) {
          dispatch({ type: 'EVENT_APPENDED', event })
        }

        if (subscribeResult.payload.terminal) {
          void reconcileTerminal()
        }
      } catch (error) {
        if (!isCancelled()) {
          dispatch({
            type: 'SUBSCRIPTION_ERROR',
            error: normalizeError(error),
          })
        }
      }
    }

    void attach()

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
      void session.request('run/unsubscribe', { runId }).catch(() => {
        // The connection may already be gone during cleanup.
      })
    }
  }, [agentId, isDemoMode, runId, sessionSnapshot?.connectionID])

  return state
}
