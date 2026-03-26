import { createHash } from 'node:crypto'
import { After, AfterAll, Before, BeforeAll, setDefaultTimeout, Status } from '@cucumber/cucumber'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import {
  assertAgentBrowserAvailable,
  AgentBrowserSession,
  closeAllAgentBrowserSessions,
  hasAcceptanceReviewDelay,
} from './agent-browser'
import { AGENT_BROWSER_SOCKET_DIR, sanitizeName, TMP_ROOT } from './paths'
import type { SigilWebWorld } from './world'
import { stopManagedWebApp } from './web-app'

const agentBrowserScenarioPauseMs = parseDelayMs(process.env.AGENT_BROWSER_SCENARIO_PAUSE_MS)
const acceptanceTimeoutMs = hasAcceptanceReviewDelay() || agentBrowserScenarioPauseMs > 0 ? 60_000 : 20_000

function parseDelayMs(value: string | undefined): number {
  if (value == null || value.trim().length === 0) {
    return 0
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function pause(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

BeforeAll(async () => {
  await rm(TMP_ROOT, { recursive: true, force: true })
  await mkdir(TMP_ROOT, { recursive: true })
  await mkdir(AGENT_BROWSER_SOCKET_DIR, { recursive: true })
  await assertAgentBrowserAvailable()
})

setDefaultTimeout(acceptanceTimeoutMs)

Before(async function (this: SigilWebWorld, { pickle }) {
  const scenarioName = sanitizeName(pickle.name)
  const sessionHash = createHash('sha1').update(pickle.name).digest('hex').slice(0, 10)
  const sessionName = `ab-${Date.now().toString(36)}-${sessionHash}`
  this.artifactDir = join(TMP_ROOT, scenarioName)
  await mkdir(this.artifactDir, { recursive: true })
  this.browser = new AgentBrowserSession(sessionName, this.artifactDir)
})

After(async function (this: SigilWebWorld, { pickle, result }) {
  if (result?.status !== Status.PASSED) {
    const artifactPrefix = sanitizeName(pickle.name)
    try {
      await this.browser.captureDiagnostics(artifactPrefix)
    } catch {
      // Best effort only; browser state may already be gone on some failures.
    }
  }
  if (agentBrowserScenarioPauseMs > 0) {
    await pause(agentBrowserScenarioPauseMs)
  }
  await this.cleanup()
})

AfterAll(async () => {
  await closeAllAgentBrowserSessions()
  await stopManagedWebApp()
})
