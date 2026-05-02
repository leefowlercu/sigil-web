import assert from 'node:assert/strict'
import { Given, Then, When } from '@cucumber/cucumber'
import { waitForCondition } from '../support/assertions'
import type { SigilWebWorld } from '../support/world'

When('the operator selects a step in the Steps Pane', async function (this: SigilWebWorld) {
  await this.browser.waitForSelector('[data-testid^="steps-pane-step-"]')
  await this.browser.click('[data-testid^="steps-pane-step-"]')
})

When('the operator selects a step with an action in the Steps Pane', async function (this: SigilWebWorld) {
  await this.browser.waitForSelector('[data-testid^="steps-pane-step-"]')
  await this.browser.click('[data-testid^="steps-pane-step-"]')
})

When('the operator selects a step with no actions in the Steps Pane', async function (this: SigilWebWorld) {
  // Step 019d1768-575b-738e-9366-f385d3839c6e is the final decision step (0 actions) in the test run
  const stepTestId = '[data-testid="steps-pane-step-019d1768-575b-738e-9366-f385d3839c6e"]'
  await this.browser.waitForSelector(stepTestId)
  await this.browser.click(stepTestId)
})

When('the operator selects the multi-action step', async function (this: SigilWebWorld) {
  return 'pending'
})

When('the operator selects the step with subcalls', async function (this: SigilWebWorld) {
  return 'pending'
})

When('the selected step transitions from running to completed', async function (this: SigilWebWorld) {
  return 'pending'
})

Given(
  'the standalone run-detail route is open for a run with a multi-action step',
  async function (this: SigilWebWorld) {
    return 'pending'
  },
)

Given('the standalone run-detail route is open for a run with no steps', async function (this: SigilWebWorld) {
  return 'pending'
})

Given('the standalone run-detail route is open for a run with subcalls', async function (this: SigilWebWorld) {
  return 'pending'
})

Then(
  "the right content area displays the selected step's context pane, code pane, and action output pane",
  async function (this: SigilWebWorld) {
    await this.browser.waitForSelector('[data-testid="step-context-pane"]')
    await this.browser.waitForSelector('[data-testid="step-code-pane"]')
    await this.browser.waitForSelector('[data-testid="step-action-output-pane"]')
  },
)

Then('the right content area displays an empty step-selection prompt', async function (this: SigilWebWorld) {
  await this.browser.waitForSelector('[data-testid="step-empty-state"]')
})

Then(
  'the Step Context Pane displays the step number, node ID, status, and duration',
  async function (this: SigilWebWorld) {
    await this.browser.waitForSelector('[data-testid="step-context-pane"]')
    const text = await this.browser.getText('[data-testid="step-context-pane"]')
    assert.match(text, /Step #/)
    assert.match(text, /completed/i)
  },
)

Then('the Accounting Drawer displays run-level totals and selected-step totals', async function (this: SigilWebWorld) {
  await this.browser.waitForSelector('[data-testid="accounting-drawer"]')
  await waitForCondition(
    async () => {
      const text = await this.browser.getText('[data-testid="accounting-drawer"]')
      const normalized = text.toLowerCase()
      return (
        normalized.includes('accounting') &&
        normalized.includes('run total') &&
        normalized.includes('selected step') &&
        normalized.includes('tree total')
      )
    },
    'Timed out waiting for accounting drawer totals to appear',
    15_000,
  )
})

Then('the Accounting Drawer content is contained in a scroll region', async function (this: SigilWebWorld) {
  await this.browser.waitForSelector('[data-testid="accounting-drawer-scroll-region"]')
})

Then(
  'the Step Context Pane displays a pagination control showing the current action index and total action count',
  async function (this: SigilWebWorld) {
    return 'pending'
  },
)

Then('the Code Pane displays the action source code with syntax highlighting', async function (this: SigilWebWorld) {
  await this.browser.waitForSelector('[data-testid="step-code-pane"]')
  await waitForCondition(
    async () => {
      const text = await this.browser.getText('[data-testid="step-code-pane"]')
      return text.includes('package main')
    },
    'Timed out waiting for syntax-highlighted code to appear',
    15_000,
  )
})

Then('the Action Output Pane displays the action stdout and stderr', async function (this: SigilWebWorld) {
  await this.browser.waitForSelector('[data-testid="step-action-output-pane"]')
  await waitForCondition(
    async () => {
      const text = await this.browser.getText('[data-testid="step-action-output-pane"]')
      return text.toLowerCase().includes('stdout')
    },
    'Timed out waiting for action output to appear',
    15_000,
  )
})

Then(
  'the code and output panes display an empty state indicating no action was executed',
  async function (this: SigilWebWorld) {
    await this.browser.waitForSelector('[data-testid="step-code-pane-empty"]')
    await this.browser.waitForSelector('[data-testid="step-action-output-pane-empty"]')
  },
)

Then('the first step is automatically selected and its detail is displayed', async function (this: SigilWebWorld) {
  await this.browser.waitForSelector('[data-testid="step-context-pane"]')
  const text = await this.browser.getText('[data-testid="step-context-pane"]')
  assert.match(text, /Step #/)
})

Then(
  'the Action Output Pane displays the subcall list with index, type, status, and duration',
  async function (this: SigilWebWorld) {
    return 'pending'
  },
)

Then(
  'the Step Context Pane updates to reflect the completed status and final duration',
  async function (this: SigilWebWorld) {
    return 'pending'
  },
)
