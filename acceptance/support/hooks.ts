import { createHash } from 'node:crypto'
import { After, AfterAll, Before, BeforeAll, setDefaultTimeout, Status } from '@cucumber/cucumber'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { assertAgentBrowserAvailable, AgentBrowserSession, closeAllAgentBrowserSessions } from './agent-browser'
import { AGENT_BROWSER_SOCKET_DIR, sanitizeName, TMP_ROOT } from './paths'
import type { SigilWebWorld } from './world'
import { stopManagedWebApp } from './web-app'

BeforeAll(async () => {
  await rm(TMP_ROOT, { recursive: true, force: true })
  await mkdir(TMP_ROOT, { recursive: true })
  await mkdir(AGENT_BROWSER_SOCKET_DIR, { recursive: true })
  await assertAgentBrowserAvailable()
})

setDefaultTimeout(20_000)

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
  await this.cleanup()
})

AfterAll(async () => {
  await closeAllAgentBrowserSessions()
  await stopManagedWebApp()
})
