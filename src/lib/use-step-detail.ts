import { useEffect, useState, useSyncExternalStore } from 'react'
import type { RunStepDetailView } from '#/lib/protocol'
import { getAgentSession, getAgentSessionSnapshot, subscribeAgentSessionStore } from './appserver/store'
import { getStepDetail } from './data'

export type StepDetailStatus = 'idle' | 'loading' | 'ready' | 'error'

export type StepDetailState = {
  status: StepDetailStatus
  step: RunStepDetailView | null
  error: string | null
}

const initialState: StepDetailState = {
  status: 'idle',
  step: null,
  error: null,
}

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : 'step detail load failed'
}

export function useStepDetail(agentId: string, runId: string, nodeId?: string, stepId?: string): StepDetailState {
  const isDemoMode = import.meta.env.VITE_DATA_SOURCE === 'demo'
  const [state, setState] = useState<StepDetailState>(initialState)
  const sessionSnapshot = useSyncExternalStore(
    subscribeAgentSessionStore,
    () => getAgentSessionSnapshot(agentId),
    () => null,
  )

  useEffect(() => {
    if (!runId || !nodeId || !stepId) {
      setState(initialState)
      return
    }

    if (!isDemoMode) {
      return
    }

    const step = getStepDetail(runId, stepId)
    if (step != null) {
      setState({ status: 'ready', step, error: null })
      return
    }

    setState({ status: 'error', step: null, error: 'step not found' })
  }, [isDemoMode, nodeId, runId, stepId])

  useEffect(() => {
    if (isDemoMode || !agentId || !runId || !nodeId || !stepId || sessionSnapshot == null) {
      return
    }
    if (sessionSnapshot.connectionID < 1) {
      return
    }

    const session = getAgentSession(agentId)
    if (session == null) {
      return
    }

    let cancelled = false
    setState({ status: 'loading', step: null, error: null })

    void session
      .request('run/step/read', { runId, nodeId, stepId })
      .then((result) => {
        if (cancelled) return
        setState({ status: 'ready', step: result.payload.step, error: null })
      })
      .catch((error) => {
        if (cancelled) return
        setState({ status: 'error', step: null, error: normalizeError(error) })
      })

    return () => {
      cancelled = true
    }
  }, [agentId, isDemoMode, nodeId, runId, sessionSnapshot?.connectionID, stepId])

  return state
}
