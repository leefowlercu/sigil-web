import { describe, expect, it } from 'vitest'
import type { AgentInstance } from '#/lib/demo-data'
import { createInitializeResult } from '#/test-fixtures/live-session'
import { resolveSelectedAgentId } from './index'

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
  const agents = [buildAgent('alpha', 'alpha'), buildAgent('beta', 'beta')]

  it('keeps an exact canonical agent id when it is present in the fleet', () => {
    expect(resolveSelectedAgentId('alpha', agents)).toBe('alpha')
  })

  it('falls back to the first agent when the search value is invalid or legacy', () => {
    expect(resolveSelectedAgentId('missing', agents)).toBe('alpha')
    expect(resolveSelectedAgentId('agent_alpha', agents)).toBe('alpha')
    expect(resolveSelectedAgentId(undefined, agents)).toBe('alpha')
  })
})
