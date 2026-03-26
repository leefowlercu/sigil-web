import assert from 'node:assert/strict'
import { Then, When } from '@cucumber/cucumber'
import { waitForCondition, waitForSelectorText, waitForUrlSuffix } from '../support/assertions'
import type { SigilWebWorld } from '../support/world'

Then('the selected agent name is {string}', async function (this: SigilWebWorld, expectedName: string) {
  await waitForSelectorText(this.browser, '[data-testid="selected-agent-name"]', expectedName)
})

Then('the hidden agent search value is {string}', async function (this: SigilWebWorld, expectedValue: string) {
  await waitForCondition(
    async () => (await this.browser.getValue('[data-testid="agent-search-param"]')) === expectedValue,
    `Timed out waiting for hidden agent search value ${expectedValue}`,
  )
})

When('the user selects agent card {string}', async function (this: SigilWebWorld, agentId: string) {
  await this.browser.waitForSelector(`[data-testid="sidebar-agent-${agentId}"]`)
  await this.browser.click(`[data-testid="sidebar-agent-${agentId}"]`)
})

When('the user filters the fleet by {string}', async function (this: SigilWebWorld, filterText: string) {
  await this.browser.fill('[data-testid="fleet-filter"]', filterText)
})

Then('the visible fleet card count is {int}', async function (this: SigilWebWorld, expectedCount: number) {
  await waitForCondition(
    async () => (await this.browser.getCount('[data-testid^="sidebar-agent-"]')) === expectedCount,
    `Timed out waiting for ${expectedCount} visible fleet cards`,
  )
})

Then('the fleet badge count is {int}', async function (this: SigilWebWorld, expectedCount: number) {
  assert.equal(Number.parseInt(await this.browser.getText('[data-testid="fleet-count"]'), 10), expectedCount)
})

When('the user connects the demo endpoint {string}', async function (this: SigilWebWorld, endpoint: string) {
  await this.browser.fill('[data-testid="connect-agent-endpoint"]', endpoint)
  await waitForCondition(
    async () => (await this.browser.getValue('[data-testid="connect-agent-endpoint"]')) === endpoint,
    `Timed out waiting for the demo endpoint input ${endpoint}`,
  )
  await this.browser.click('[data-testid="connect-agent-button"]')
})

When('the user selects the agent card named {string}', async function (this: SigilWebWorld, agentName: string) {
  await this.browser.fill('[data-testid="fleet-filter"]', agentName)
  await waitForCondition(
    async () => (await this.browser.getCount('[data-testid^="sidebar-agent-"]')) === 1,
    `Timed out waiting for a single visible fleet card matching ${agentName}`,
  )
  await this.browser.click('[data-testid^="sidebar-agent-"]')
})

Then('the runs empty state is visible', async function (this: SigilWebWorld) {
  await this.browser.waitForSelector('[data-testid="runs-empty-state"]')
  await waitForSelectorText(this.browser, '[data-testid="runs-empty-state"]', 'No runs for this agent.')
})

Then('the root run-detail empty prompt is visible', async function (this: SigilWebWorld) {
  await this.browser.waitForSelector('[data-testid="run-detail-empty-state"]')
  await waitForSelectorText(this.browser, '[data-testid="run-detail-empty-state"]', 'Select a run to view details.')
})

Then('the root run detail tabs are visible', async function (this: SigilWebWorld) {
  await this.browser.waitForSelector('[data-testid="run-detail-tabs"]')
  const tabText = await this.browser.getText('[data-testid="run-detail-tabs"]')
  for (const label of ['Timeline', 'Nodes', 'Steps', 'Meta']) {
    assert.match(tabText, new RegExp(label))
  }
})

When('the user selects run {string}', async function (this: SigilWebWorld, runId: string) {
  await this.browser.click(`[data-testid="run-item-${runId}"]`)
})

When('the user opens the selected run detail route', async function (this: SigilWebWorld) {
  await this.browser.waitForSelector('[data-testid="open-run-detail"]')
  await this.browser.click('[data-testid="open-run-detail"]')
})

Then('the browser URL ends with {string}', async function (this: SigilWebWorld, expectedSuffix: string) {
  await waitForUrlSuffix(this.browser, expectedSuffix)
})

Then(
  'the selected agent workspace shows run {string} as {string}',
  async function (this: SigilWebWorld, runId: string, expectedState: string) {
    const normalizedState = expectedState.toLowerCase()
    const label = normalizedState.charAt(0).toUpperCase() + normalizedState.slice(1)
    await waitForSelectorText(this.browser, `[data-testid="run-item-${runId}"]`, label)
    if (normalizedState === 'completed') {
      await this.browser.click('[data-testid="run-detail-tab-meta"]')
      await waitForSelectorText(this.browser, '[data-testid="run-detail-meta-panel"]', normalizedState)
    }
  },
)
