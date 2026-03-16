import { describe, expect, it } from 'vitest'

import { defaultRunId, demoRuns, runDetails, sessionSummary } from './demo-data'

describe('demo data bootstrap', () => {
  it('exposes a ready session summary for the command-plane shell', () => {
    expect(sessionSummary.status).toBe('ready')
    expect(sessionSummary.endpoint).toMatch(/^ws:\/\//)
    expect(sessionSummary.protocolVersion).toBe('sigil.appserver.v1alpha1')
  })

  it('keeps the default run mapped to a detail workspace record', () => {
    expect(demoRuns).toHaveLength(3)
    expect(runDetails[defaultRunId]?.runId).toBe(defaultRunId)
  })

  it('orders seeded event sequences monotonically within each run detail', () => {
    for (const detail of Object.values(runDetails)) {
      const sequences = detail?.events.map((event) => event.seq) ?? []
      expect(sequences).toEqual([...sequences].sort((a, b) => a - b))
    }
  })
})
