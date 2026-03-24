import { describe, expect, it } from 'vitest'

import type { AgentInstance } from './demo-data'
import { agentFleetReducer, initialState } from './use-agent-fleet'
import type { AgentFleetAction, AgentFleetState } from './use-agent-fleet'

const baseAgent: AgentInstance = {
  id: 'agent_test',
  endpoint: 'ws://10.0.1.1:8765/app-server',
  connectionState: 'ready',
  server: {
    serverName: 'sigil',
    serverVersion: '0.1.0',
    instanceId: 'test-instance',
    instanceName: 'test-instance',
    protocolVersion: 'sigil.appserver.v1alpha1',
    methodFamilies: ['run', 'server'],
    capabilities: {
      config: {
        defaultVersion: 'sigil.appserver.v1alpha1',
        supportedVersions: ['sigil.appserver.v1alpha1'],
      },
      views: { runTree: true, stepDetail: true, liveSubscriptions: true },
      protocolArtifacts: true,
    },
  },
}

function reduce(
  state: AgentFleetState,
  ...actions: AgentFleetAction[]
): AgentFleetState {
  return actions.reduce(agentFleetReducer, state)
}

describe('agentFleetReducer', () => {
  it('RESET returns initial state', () => {
    const loaded = reduce(initialState, {
      type: 'FLEET_LOADED',
      agents: [baseAgent],
    })
    expect(reduce(loaded, { type: 'RESET' })).toEqual(initialState)
  })

  it('FLEET_LOADED populates agents array', () => {
    const agents = [baseAgent, { ...baseAgent, id: 'agent_2' }]
    const result = reduce(initialState, {
      type: 'FLEET_LOADED',
      agents,
    })
    expect(result.agents).toHaveLength(2)
    expect(result.agents).toBe(agents)
  })

  it('AGENT_CONNECTED appends a new agent', () => {
    const loaded = reduce(initialState, {
      type: 'FLEET_LOADED',
      agents: [baseAgent],
    })
    const newAgent = { ...baseAgent, id: 'agent_new' }
    const result = reduce(loaded, {
      type: 'AGENT_CONNECTED',
      agent: newAgent,
    })
    expect(result.agents).toHaveLength(2)
    expect(result.agents[1]).toBe(newAgent)
  })

  it('AGENT_DISCONNECTED sets connection state to disconnected', () => {
    const loaded = reduce(initialState, {
      type: 'FLEET_LOADED',
      agents: [baseAgent],
    })
    const result = reduce(loaded, {
      type: 'AGENT_DISCONNECTED',
      agentId: baseAgent.id,
    })
    expect(result.agents[0].connectionState).toBe('disconnected')
  })

  it('AGENT_REMOVED filters the agent from the list', () => {
    const agents = [baseAgent, { ...baseAgent, id: 'agent_2' }]
    const loaded = reduce(initialState, { type: 'FLEET_LOADED', agents })
    const result = reduce(loaded, {
      type: 'AGENT_REMOVED',
      agentId: baseAgent.id,
    })
    expect(result.agents).toHaveLength(1)
    expect(result.agents[0].id).toBe('agent_2')
  })

  it('AGENT_STATE_CHANGED updates connection state for matching agent', () => {
    const loaded = reduce(initialState, {
      type: 'FLEET_LOADED',
      agents: [baseAgent],
    })
    const result = reduce(loaded, {
      type: 'AGENT_STATE_CHANGED',
      agentId: baseAgent.id,
      connectionState: 'degraded',
    })
    expect(result.agents[0].connectionState).toBe('degraded')
  })

  it('AGENT_STATE_CHANGED does not affect other agents', () => {
    const agents = [baseAgent, { ...baseAgent, id: 'agent_2' }]
    const loaded = reduce(initialState, { type: 'FLEET_LOADED', agents })
    const result = reduce(loaded, {
      type: 'AGENT_STATE_CHANGED',
      agentId: baseAgent.id,
      connectionState: 'degraded',
    })
    expect(result.agents[0].connectionState).toBe('degraded')
    expect(result.agents[1].connectionState).toBe('ready')
  })
})
