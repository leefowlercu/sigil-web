import { useCallback, useEffect, useReducer, useSyncExternalStore } from 'react'
import type { AgentInstance, ConnectionState } from './demo-data'
import type { InitializeResult } from './protocol'
import { PROTOCOL_VERSION } from './protocol'
import {
  connectAgentSession,
  disconnectAgentSession,
  getAgentInstanceSnapshots,
  reconnectAgentSession,
  removeAgentSession,
  subscribeAgentSessionStore,
} from './appserver/store'
import { getAgentFleet } from './data'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type AgentFleetAction =
  | { type: 'FLEET_LOADED'; agents: AgentInstance[] }
  | { type: 'AGENT_CONNECTED'; agent: AgentInstance }
  | { type: 'AGENT_DISCONNECTED'; agentId: string }
  | { type: 'AGENT_REMOVED'; agentId: string }
  | {
      type: 'AGENT_STATE_CHANGED'
      agentId: string
      connectionState: ConnectionState
    }
  | { type: 'RESET' }

export type AgentFleetState = {
  agents: AgentInstance[]
}

/* ------------------------------------------------------------------ */
/*  Reducer                                                            */
/* ------------------------------------------------------------------ */

export const initialState: AgentFleetState = {
  agents: [],
}

export function agentFleetReducer(state: AgentFleetState, action: AgentFleetAction): AgentFleetState {
  switch (action.type) {
    case 'RESET':
      return initialState

    case 'FLEET_LOADED':
      return { agents: action.agents }

    case 'AGENT_CONNECTED':
      return { agents: [...state.agents, action.agent] }

    case 'AGENT_DISCONNECTED':
      return {
        agents: state.agents.map((a) =>
          a.id === action.agentId ? { ...a, connectionState: 'disconnected' as ConnectionState } : a,
        ),
      }

    case 'AGENT_REMOVED':
      return {
        agents: state.agents.filter((a) => a.id !== action.agentId),
      }

    case 'AGENT_STATE_CHANGED':
      return {
        agents: state.agents.map((a) =>
          a.id === action.agentId ? { ...a, connectionState: action.connectionState } : a,
        ),
      }
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export type AgentFleetHandle = {
  agents: AgentInstance[]
  connectAgent: (endpoint: string) => void
  disconnectAgent: (agentId: string) => void
  reconnectAgent: (agentId: string) => void
  removeAgent: (agentId: string) => void
}

const emptyAgentInstances: AgentInstance[] = []

export function useAgentFleet(): AgentFleetHandle {
  const isDemoMode = import.meta.env.VITE_DATA_SOURCE === 'demo'
  const [state, dispatch] = useReducer(agentFleetReducer, initialState)
  const liveAgents = useSyncExternalStore(
    subscribeAgentSessionStore,
    getAgentInstanceSnapshots,
    () => emptyAgentInstances,
  )

  useEffect(() => {
    if (!isDemoMode) {
      return
    }
    dispatch({ type: 'RESET' })
    const fleet = getAgentFleet()
    if (fleet.length > 0) {
      dispatch({ type: 'FLEET_LOADED', agents: fleet })
    }

    // Demo mode: simulate heartbeat-driven state transitions
    const degradedAgent = fleet.find((a) => a.connectionState === 'degraded')
    if (degradedAgent) {
      const transitions: ConnectionState[] = ['reconnecting', 'ready']
      let step = 0
      const interval = setInterval(() => {
        if (step < transitions.length) {
          dispatch({
            type: 'AGENT_STATE_CHANGED',
            agentId: degradedAgent.id,
            connectionState: transitions[step],
          })
          step++
        } else {
          clearInterval(interval)
        }
      }, 5000)
      return () => clearInterval(interval)
    }

    // Future: live mode would establish WebSocket connections here
    // and dispatch AGENT_CONNECTED/AGENT_STATE_CHANGED on events
  }, [isDemoMode])

  const connectAgent = useCallback(
    (endpoint: string) => {
      if (!isDemoMode) {
        connectAgentSession(`agent_${Date.now()}`, endpoint)
        return
      }
      // Demo mode: create a synthetic agent from the endpoint
      // Live mode (future): initiate WebSocket, perform initialize handshake
      let instanceName = endpoint
      try {
        const url = new URL(endpoint)
        instanceName = url.hostname
      } catch {
        // Use raw endpoint as name if URL parsing fails
      }

      const server: InitializeResult = {
        serverName: 'sigil',
        serverVersion: '0.1.0',
        instanceId: instanceName,
        instanceName,
        protocolVersion: PROTOCOL_VERSION,
        methodFamilies: ['run', 'runs', 'server'],
        capabilities: {
          config: {
            defaultVersion: PROTOCOL_VERSION,
            supportedVersions: [PROTOCOL_VERSION],
          },
          views: { runTree: true, stepDetail: true, liveSubscriptions: true },
          protocolArtifacts: true,
        },
      }

      dispatch({
        type: 'AGENT_CONNECTED',
        agent: {
          id: `agent_${Date.now()}`,
          endpoint,
          connectionState: 'ready',
          server,
        },
      })
    },
    [isDemoMode],
  )

  const disconnectAgent = useCallback(
    (agentId: string) => {
      if (!isDemoMode) {
        disconnectAgentSession(agentId)
        return
      }
      dispatch({ type: 'AGENT_DISCONNECTED', agentId })
      // Future: live mode would also close the WebSocket connection
    },
    [isDemoMode],
  )

  const reconnectAgent = useCallback(
    (agentId: string) => {
      if (!isDemoMode) {
        reconnectAgentSession(agentId)
        return
      }
      dispatch({
        type: 'AGENT_STATE_CHANGED',
        agentId,
        connectionState: 'ready',
      })
      // Future: live mode would re-establish the WebSocket connection
      // and perform the initialize handshake
    },
    [isDemoMode],
  )

  const removeAgent = useCallback(
    (agentId: string) => {
      if (!isDemoMode) {
        removeAgentSession(agentId)
        return
      }
      dispatch({ type: 'AGENT_REMOVED', agentId })
      // Future: live mode would also close the WebSocket connection
      // and clean up any subscriptions
    },
    [isDemoMode],
  )

  return {
    agents: isDemoMode ? state.agents : liveAgents,
    connectAgent,
    disconnectAgent,
    reconnectAgent,
    removeAgent,
  }
}
