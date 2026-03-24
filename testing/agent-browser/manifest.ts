import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parse } from 'smol-toml'
import { projectRoot } from './utils.ts'
import type { AgentBrowserManifestEvidence } from './types.ts'

type ManifestRoute = {
  id: string
}

type ManifestEvidence = {
  lane?: string
  mode?: unknown
  file?: string
  match?: string
}

type ManifestScenario = {
  prd: string
  scenario_id: string
  title: string
  route_id: string
  state_id: string
  fixtures?: string[]
  evidence?: ManifestEvidence[]
}

type ManifestDocument = {
  route?: ManifestRoute[]
  scenario?: ManifestScenario[]
}

export async function loadAgentBrowserManifest(
  manifestPath: string,
): Promise<AgentBrowserManifestEvidence[]> {
  const raw = await fs.readFile(manifestPath, 'utf8')
  const parsed = parse(raw) as ManifestDocument
  const routeIDs = new Set((parsed.route ?? []).map((route) => route.id))
  const evidences: AgentBrowserManifestEvidence[] = []

  for (const scenario of parsed.scenario ?? []) {
    if (!routeIDs.has(scenario.route_id)) {
      throw new Error(
        `scenario ${scenario.prd} ${scenario.scenario_id} uses unknown route ${scenario.route_id}`,
      )
    }
    for (const evidence of scenario.evidence ?? []) {
      if (evidence.lane !== 'agent-browser') {
        continue
      }
      if (evidence.mode != null) {
        throw new Error(
          `scenario ${scenario.prd} ${scenario.scenario_id} agent-browser evidence must not declare mode`,
        )
      }
      if (!evidence.file || !evidence.match) {
        throw new Error(
          `scenario ${scenario.prd} ${scenario.scenario_id} agent-browser evidence missing file or match`,
        )
      }
      evidences.push({
        prd: scenario.prd,
        scenarioID: scenario.scenario_id,
        title: scenario.title,
        routeID: scenario.route_id,
        stateID: scenario.state_id,
        fixtures: scenario.fixtures ?? [],
        lane: 'agent-browser',
        file: path.resolve(projectRoot, evidence.file),
        match: evidence.match,
      })
    }
  }

  return evidences
}
