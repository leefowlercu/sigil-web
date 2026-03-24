import { useEffect, useState, useSyncExternalStore } from 'react'
import type { RunArtifactReadPayload } from '#/lib/protocol'
import {
  getAgentSession,
  getAgentSessionSnapshot,
  subscribeAgentSessionStore,
} from './appserver/store'
import { getRunArtifact } from './data'

export type RunArtifactStatus = 'idle' | 'loading' | 'ready' | 'error'

export type RunArtifactState = {
  status: RunArtifactStatus
  payload: RunArtifactReadPayload | null
  error: string | null
}

const initialState: RunArtifactState = {
  status: 'idle',
  payload: null,
  error: null,
}

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : 'artifact load failed'
}

export function useRunArtifact(
  agentId: string,
  runId: string,
  artifactRef?: string,
): RunArtifactState {
  const isDemoMode = import.meta.env.VITE_DATA_SOURCE === 'demo'
  const [state, setState] = useState<RunArtifactState>(initialState)
  const sessionSnapshot = useSyncExternalStore(
    subscribeAgentSessionStore,
    () => getAgentSessionSnapshot(agentId),
    () => null,
  )

  useEffect(() => {
    if (!runId || !artifactRef) {
      setState(initialState)
      return
    }

    if (!isDemoMode) {
      return
    }

    const payload = getRunArtifact(runId, artifactRef)
    if (payload != null) {
      setState({
        status: 'ready',
        payload,
        error: null,
      })
      return
    }

    setState({
      status: 'error',
      payload: null,
      error: 'artifact not found',
    })
  }, [artifactRef, isDemoMode, runId])

  useEffect(() => {
    if (isDemoMode || !agentId || !runId || !artifactRef || sessionSnapshot == null) {
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
    setState({
      status: 'loading',
      payload: null,
      error: null,
    })

    void session
      .request('run/artifact/read', { runId, artifactRef })
      .then((result) => {
        if (cancelled) {
          return
        }

        setState({
          status: 'ready',
          payload: result.payload,
          error: null,
        })
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        setState({
          status: 'error',
          payload: null,
          error: normalizeError(error),
        })
      })

    return () => {
      cancelled = true
    }
  }, [agentId, artifactRef, isDemoMode, runId, sessionSnapshot?.connectionID])

  return state
}
