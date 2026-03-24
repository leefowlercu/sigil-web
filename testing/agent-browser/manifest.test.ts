import { afterEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { loadAgentBrowserManifest } from './manifest.ts'
import { projectRoot } from './utils.ts'

const tempDirs: string[] = []

async function writeTempManifest(contents: string) {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'sigil-web-agent-browser-manifest-'),
  )
  tempDirs.push(tempDir)
  const manifestPath = path.join(tempDir, 'manifest.toml')
  await fs.writeFile(manifestPath, contents, 'utf8')
  return manifestPath
}

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })),
  )
})

describe('loadAgentBrowserManifest', () => {
  it('loads agent-browser evidence without mode', async () => {
    const manifestPath = await writeTempManifest(`version = 1

[[route]]
id = "run-detail"
path = "/runs/$runId"
description = "Run detail"

[[scenario]]
prd = "PRD-0300"
scenario_id = "SCN-0000"
title = "Example live timeline"
route_id = "run-detail"
state_id = "live-timeline"

[[scenario.evidence]]
lane = "agent-browser"
file = "sigil-web/testing/agent-browser/scenarios/prd-0300-live-timeline.ts"
match = "Example live timeline"
`)

    const evidences = await loadAgentBrowserManifest(manifestPath)

    expect(evidences).toHaveLength(1)
    expect(evidences[0]).toMatchObject({
      prd: 'PRD-0300',
      scenarioID: 'SCN-0000',
      lane: 'agent-browser',
      match: 'Example live timeline',
    })
    expect(evidences[0].file).toBe(
      path.resolve(
        projectRoot,
        'sigil-web/testing/agent-browser/scenarios/prd-0300-live-timeline.ts',
      ),
    )
    expect('mode' in (evidences[0] as Record<string, unknown>)).toBe(false)
  })

  it('rejects agent-browser evidence that declares mode', async () => {
    const manifestPath = await writeTempManifest(`version = 1

[[route]]
id = "run-detail"
path = "/runs/$runId"
description = "Run detail"

[[scenario]]
prd = "PRD-0300"
scenario_id = "SCN-0000"
title = "Example live timeline"
route_id = "run-detail"
state_id = "live-timeline"

[[scenario.evidence]]
lane = "agent-browser"
mode = "legacy"
file = "sigil-web/testing/agent-browser/scenarios/prd-0300-live-timeline.ts"
match = "Example live timeline"
`)

    await expect(loadAgentBrowserManifest(manifestPath)).rejects.toThrow(
      'agent-browser evidence must not declare mode',
    )
  })
})
