import { describe, expect, it } from 'vitest'

import {
  defaultAgentId,
  defaultRunId,
  demoAgents,
  getRunDetail,
  getRunsForAgent,
  sessionSummary,
} from './demo-data'

describe('demo data bootstrap', () => {
  it('exposes a ready session summary for the command-plane shell', () => {
    expect(sessionSummary.status).toBe('ready')
    expect(sessionSummary.endpoint).toMatch(/^ws:\/\//)
    expect(sessionSummary.protocolVersion).toBe('sigil.appserver.v1alpha1')
  })

  it('keeps the default run mapped to a detail view', () => {
    const runs = getRunsForAgent(defaultAgentId)
    expect(runs.length).toBeGreaterThan(0)
    const detail = getRunDetail(defaultRunId)
    expect(detail?.projection.runId).toBe(defaultRunId)
  })

  it('assigns the seeded default agent to one or more runs', () => {
    expect(demoAgents).toHaveLength(3)
    expect(getRunsForAgent(defaultAgentId)).not.toHaveLength(0)
  })

  it('orders seeded event sequences monotonically within each run detail', () => {
    const runs = getRunsForAgent(defaultAgentId)
    for (const run of runs) {
      const detail = getRunDetail(run.runId)
      const sequences = detail?.events.map((event) => event.seq) ?? []
      expect(sequences).toEqual([...sequences].sort((a, b) => a - b))
    }
  })
})
