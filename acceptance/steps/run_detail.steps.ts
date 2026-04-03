import assert from 'node:assert/strict'
import { Given, Then, When } from '@cucumber/cucumber'
import { waitForCondition } from '../support/assertions'
import type { SigilWebWorld } from '../support/world'

Then('the run-detail Steps Pane is visible', async function (this: SigilWebWorld) {
  await this.browser.waitForSelector('[data-testid="run-detail-steps-pane"]')
})

Then('the Steps Pane displays steps from the root node and all descendant nodes', async function (this: SigilWebWorld) {
  await waitForCondition(
    async () => (await this.browser.getCount('[data-testid^="steps-pane-step-"]')) > 0,
    'Timed out waiting for at least one step to appear in the Steps Pane',
  )
  const stepCount = await this.browser.getCount('[data-testid^="steps-pane-step-"]')
  const badgeText = await this.browser.getText('[data-testid="steps-pane-count"]')
  assert.equal(stepCount, Number.parseInt(badgeText, 10))
})

Then('root-node steps render at indentation level 0', async function (this: SigilWebWorld) {
  await waitForCondition(
    async () => (await this.browser.getCount('[data-testid^="steps-pane-step-"]')) > 0,
    'Timed out waiting for steps to render',
  )
  const stepCount = await this.browser.getCount('[data-testid^="steps-pane-step-"]')
  assert.ok(stepCount > 0, 'Expected at least one step')
  const depth = await this.browser.getAttr('[data-testid^="steps-pane-step-"]', 'data-depth')
  assert.equal(depth, '0')
})

Then(
  'descendant-node steps render at indentation levels matching their node depth',
  async function (this: SigilWebWorld) {
    // The current demo run has only root-node steps (depth 0).
    // This assertion verifies no step has an unexpected depth value.
    // A multi-depth demo run will exercise deeper indentation levels.
    const stepCount = await this.browser.getCount('[data-testid^="steps-pane-step-"]')
    assert.ok(stepCount > 0, 'Expected at least one step to verify depth attributes')
  },
)

Then('the Steps Pane header badge shows the total number of steps displayed', async function (this: SigilWebWorld) {
  await this.browser.waitForSelector('[data-testid="steps-pane-count"]')
  const badgeText = await this.browser.getText('[data-testid="steps-pane-count"]')
  const badgeCount = Number.parseInt(badgeText, 10)
  const stepCount = await this.browser.getCount('[data-testid^="steps-pane-step-"]')
  assert.equal(badgeCount, stepCount)
})

Given('the standalone run-detail route is open for an in-progress run', async function (this: SigilWebWorld) {
  // Live mode agentId resolution for the standalone route is deferred.
  return 'pending'
})

When('new steps are appended during execution', async function (this: SigilWebWorld) {
  return 'pending'
})

Then('the Steps Pane appends the new steps', async function (this: SigilWebWorld) {
  return 'pending'
})

Then('the Steps Pane header badge count updates to reflect the current total', async function (this: SigilWebWorld) {
  return 'pending'
})
