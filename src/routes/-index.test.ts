import { describe, expect, it } from 'vitest'
import type { AgentInstance } from '#/lib/demo-data'
import { createInitializeResult } from '#/test-fixtures/live-session'
import { resolveAgentId, toAgentSearchValue } from './index'

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

describe('index route helpers', () => {
  const agents = [buildAgent('agent_alpha', 'alpha'), buildAgent('agent_beta', 'beta')]

  it('strips the canonical agent_ prefix from search values', () => {
    expect(toAgentSearchValue('agent_alpha')).toBe('alpha')
    expect(toAgentSearchValue('beta')).toBe('beta')
  })

  it('resolves exact and canonical search values to the same agent id', () => {
    expect(resolveAgentId('agent_alpha', agents)).toBe('agent_alpha')
    expect(resolveAgentId('alpha', agents)).toBe('agent_alpha')
    expect(resolveAgentId('missing', agents)).toBeUndefined()
  })
})
