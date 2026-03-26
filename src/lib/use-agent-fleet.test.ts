import { describe, expect, it } from 'vitest'
import type { AgentInstance } from './demo-data'
import { agentFleetReducer, initialState } from './use-agent-fleet'
import { createInitializeResult } from '#/test-fixtures/live-session'

function buildAgent(id: string, instanceName: string): AgentInstance {
  return {
    id,
    endpoint: `ws://${instanceName}:8765/app-server`,
    connectionState: 'ready',
    server: {
      ...createInitializeResult(),
      instanceId: instanceName,
      instanceName,
    },
  }
}

describe('agentFleetReducer', () => {
  it('loads the initial fleet snapshot', () => {
    const agents = [buildAgent('alpha', 'alpha'), buildAgent('beta', 'beta')]

    const nextState = agentFleetReducer(initialState, {
      type: 'FLEET_LOADED',
      agents,
    })

    expect(nextState.agents).toEqual(agents)
  })

  it('updates and removes agents without mutating unrelated entries', () => {
    const alpha = buildAgent('alpha', 'alpha')
    const beta = buildAgent('beta', 'beta')
    const loaded = agentFleetReducer(initialState, {
      type: 'FLEET_LOADED',
      agents: [alpha, beta],
    })

    const degraded = agentFleetReducer(loaded, {
      type: 'AGENT_STATE_CHANGED',
      agentId: alpha.id,
      connectionState: 'degraded',
    })
    const removed = agentFleetReducer(degraded, {
      type: 'AGENT_REMOVED',
      agentId: beta.id,
    })

    expect(degraded.agents[0]?.connectionState).toBe('degraded')
    expect(removed.agents).toHaveLength(1)
    expect(removed.agents[0]?.id).toBe(alpha.id)
  })
})
