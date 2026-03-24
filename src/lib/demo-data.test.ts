import { describe, expect, it } from 'vite-plus/test'

import {
  defaultAgentId,
  defaultRunId,
  demoAgents,
  getRunArtifact,
  getRunDetail,
  getRunsForAgent,
} from './demo-data'

describe('demo data bootstrap', () => {
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

  it('exposes a final-answer artifact for completed runs that advertise a final answer ref', () => {
    const detail = getRunDetail(defaultRunId)
    const finalAnswerRef = detail?.projection.finalAnswerRef

    expect(finalAnswerRef).toBeDefined()
    const artifact = getRunArtifact(defaultRunId, finalAnswerRef!)

    expect(artifact?.artifactKind).toBe('final_answer')
    expect(artifact?.artifact.final_answer).toContain('SIGIL-NEEDLE-2026-03-03-ALPHA-OMEGA-7719')
  })
})
