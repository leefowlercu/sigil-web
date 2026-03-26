import assert from 'node:assert/strict'
import { Given, Then, When } from '@cucumber/cucumber'
import { waitForBodyText, waitForCondition, waitForSelectorText } from '../support/assertions'
import type { SigilWebWorld } from '../support/world'

Given('sigil-web is running in live mode', async function (this: SigilWebWorld) {
  await this.openLive('/')
  await this.browser.waitForSelector('[data-testid="agents-workspace"]')
})

When('the user connects the mock live agent endpoint', async function (this: SigilWebWorld) {
  const mockServer = await this.ensureMockServer()
  await this.browser.fill('[data-testid="connect-agent-endpoint"]', mockServer.endpoint())
  await waitForCondition(
    async () => (await this.browser.getValue('[data-testid="connect-agent-endpoint"]')) === mockServer.endpoint(),
    'Timed out waiting for the live endpoint input to update',
  )
  await this.browser.click('[data-testid="connect-agent-button"]')
})

Given('the mock live agent initialize response is delayed', async function (this: SigilWebWorld) {
  const mockServer = await this.ensureMockServer()
  mockServer.pauseInitializeResponses()
})

Then('the live agent named {string} becomes ready', async function (this: SigilWebWorld, agentName: string) {
  await waitForSelectorText(this.browser, '[data-testid="selected-agent-name"]', agentName)
  await waitForSelectorText(this.browser, '[data-testid="selected-agent-connection-state"]', 'Ready')
})

When('the mock live agent initialize response resumes', async function (this: SigilWebWorld) {
  const mockServer = await this.ensureMockServer()
  mockServer.resumeInitializeResponses()
})

When('heartbeats stop for the live agent', async function (this: SigilWebWorld) {
  const mockServer = await this.ensureMockServer()
  mockServer.pauseHeartbeats()
})

Then('the live agent named {string} becomes degraded', async function (this: SigilWebWorld, agentName: string) {
  await waitForSelectorText(this.browser, '[data-testid="selected-agent-name"]', agentName)
  await waitForSelectorText(this.browser, '[data-testid="selected-agent-connection-state"]', 'Degraded')
})

When('heartbeats resume and the user reconnects the degraded live agent', async function (this: SigilWebWorld) {
  const mockServer = await this.ensureMockServer()
  mockServer.resumeHeartbeats()
  await this.browser.click('[title="Disconnect agent"]')
  await waitForSelectorText(this.browser, '[data-testid="selected-agent-connection-state"]', 'Disconnected')
  await this.browser.click('[title="Reconnect agent"]')
})

When('the mock live run completes', async function (this: SigilWebWorld) {
  const mockServer = await this.ensureMockServer()
  mockServer.completeRun()
})

When('the user removes the live agent session', async function (this: SigilWebWorld) {
  await this.browser.click('[title="Remove agent"]')
})

Then(
  'the fleet no longer shows the live agent named {string}',
  async function (this: SigilWebWorld, agentName: string) {
    await waitForCondition(
      async () => (await this.browser.getCount('[data-testid^="sidebar-agent-"]')) === 0,
      'Timed out waiting for the live fleet to become empty',
    )
    const fleetText = await this.browser.getText('[data-testid="agents-pane"]')
    assert.ok(!fleetText.includes(agentName))
  },
)

Then('a warning toast says {string}', async function (this: SigilWebWorld, message: string) {
  await waitForBodyText(this.browser, message)
})
