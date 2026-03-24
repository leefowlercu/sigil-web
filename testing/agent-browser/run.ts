import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createAgentBrowserSession } from './browser.ts'
import { createLiveTimelineScenario } from './fixtures/live-timeline.ts'
import { createScriptedConnectionController } from './scripted-appserver.ts'
import { loadAgentBrowserManifest } from './manifest.ts'
import type { AgentBrowserManifestEvidence, AgentBrowserScenarioModule } from './types.ts'
import {
  ensureCleanDir,
  ensureDir,
  findFreePort,
  sanitizeForPath,
  sigilWebRoot,
  spawnLoggedProcess,
  waitForHTTPReady,
  withTimeout,
  writeJSONFile,
} from './utils.ts'

type PreviewHandle = {
  appURL: string
  stop: () => Promise<void>
}

async function settleBestEffort(description: string, work: () => Promise<void>, timeoutMs = 5_000) {
  try {
    await withTimeout(work(), { description, timeoutMs })
  } catch (error) {
    console.warn(error instanceof Error ? error.message : String(error))
  }
}

function parseArgs(argv: string[]) {
  let scenario: string | null = null

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--scenario') {
      scenario = argv[index + 1] ?? null
      index += 1
      continue
    }
  }

  return {
    scenario,
  }
}

async function startPreviewServer(): Promise<PreviewHandle> {
  const existingURL = process.env.SIGIL_WEB_ACCEPTANCE_APP_URL
  if (existingURL) {
    return {
      appURL: existingURL,
      async stop() {},
    }
  }

  const port = await findFreePort()
  const appURL = `http://127.0.0.1:${port}`
  const previewLogPath = path.join(sigilWebRoot, '.artifacts', 'agent-browser', 'preview.log')
  await ensureDir(path.dirname(previewLogPath))
  const preview = spawnLoggedProcess({
    command: 'pnpm',
    args: ['preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    cwd: sigilWebRoot,
    logPath: previewLogPath,
  })
  await waitForHTTPReady(appURL, 20_000)

  return {
    appURL,
    async stop() {
      await preview.stop()
    },
  }
}

async function loadScenarioCase(evidence: AgentBrowserManifestEvidence) {
  const imported = (await import(pathToFileURL(evidence.file).href)) as AgentBrowserScenarioModule
  if (!Object.hasOwn(imported.cases, evidence.match)) {
    throw new Error(`scenario module ${evidence.file} does not export case ${evidence.match}`)
  }
  const scenarioCase = imported.cases[evidence.match]
  return scenarioCase
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const manifestPath = path.join(sigilWebRoot, 'verification', 'scenarios', 'manifest.toml')
  const allEvidence = await loadAgentBrowserManifest(manifestPath)
  const selectedEvidence = allEvidence.filter((evidence) => {
    if (args.scenario != null) {
      return `${evidence.prd}:${evidence.scenarioID}` === args.scenario
    }
    return true
  })

  if (selectedEvidence.length === 0) {
    throw new Error('no agent-browser scenarios matched the requested filter')
  }

  const preview = await startPreviewServer()
  const failures: Array<{
    evidence: AgentBrowserManifestEvidence
    error: Error
  }> = []

  try {
    for (const evidence of selectedEvidence) {
      const slug = sanitizeForPath(`${evidence.prd}-${evidence.scenarioID}-${evidence.title}`)
      const artifactDir = path.join(sigilWebRoot, '.artifacts', 'agent-browser', slug)
      await ensureCleanDir(artifactDir)
      await writeJSONFile(path.join(artifactDir, 'evidence.json'), evidence)

      const browser = createAgentBrowserSession(
        `sw-${evidence.prd.toLowerCase()}-${evidence.scenarioID.toLowerCase()}-${Date.now().toString(36)}`,
      )
      let controller: Awaited<ReturnType<typeof createScriptedConnectionController>> | null = null

      try {
        const scenarioCase = await loadScenarioCase(evidence)
        controller = await createScriptedConnectionController({
          artifactDir,
          scenario: createLiveTimelineScenario(),
        })
        await controller.start()
        await scenarioCase({
          appURL: preview.appURL,
          artifactDir,
          browser,
          controller,
          evidence,
        })
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error(String(error))
        failures.push({ evidence, error: normalized })
        await settleBestEffort('failure screenshot capture', async () => {
          await browser.screenshot(path.join(artifactDir, 'failure.png'))
        })
      } finally {
        try {
          const snapshot = await withTimeout(browser.snapshotInteractive(), {
            description: 'interactive browser snapshot',
            timeoutMs: 5_000,
          })
          await writeJSONFile(path.join(artifactDir, 'browser-snapshot.json'), snapshot)
        } catch {
          // Best effort only.
        }
        await browser.saveCommandLog(path.join(artifactDir, 'browser-commands.log'))
        if (controller != null) {
          await controller.writeArtifacts()
        }
        await settleBestEffort('agent-browser session teardown', async () => {
          await browser.close()
        })
        if (controller != null) {
          const activeController = controller
          await settleBestEffort(
            'scripted controller teardown',
            async () => {
              await activeController.close()
            },
            2_000,
          )
        }
      }
    }
  } finally {
    await settleBestEffort('preview server teardown', async () => {
      await preview.stop()
    })
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(
        `[agent-browser] ${failure.evidence.prd}:${failure.evidence.scenarioID} failed: ${failure.error.message}`,
      )
    }
    throw new Error(`${failures.length} agent-browser scenario(s) failed`)
  }

  console.log(`[agent-browser] completed ${selectedEvidence.length} scenario evidence item(s)`)
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
