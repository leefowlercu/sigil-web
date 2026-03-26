import assert from 'node:assert/strict'
import { Given, Then } from '@cucumber/cucumber'
import type { SigilWebWorld } from '../support/world'

Given('the demo workspace is open', async function (this: SigilWebWorld) {
  await this.openDemo('/')
  await this.browser.waitForSelector('[data-testid="agents-workspace"]')
  await this.browser.waitForSelector('[data-testid="selected-agent-name"]')
})

Given('the demo workspace is open at {string}', async function (this: SigilWebWorld, path: string) {
  await this.openDemo(path)
  await this.browser.waitForSelector('[data-testid="agents-workspace"]')
  await this.browser.waitForSelector('[data-testid="selected-agent-name"]')
})

Given('the standalone run-detail route is open for run {string}', async function (this: SigilWebWorld, runId: string) {
  await this.openDemo(`/runs/${runId}`)
  await this.browser.waitForSelector('[data-testid="run-detail-workspace"]')
})

Then('the page exposes the shared application shell', async function (this: SigilWebWorld) {
  await this.browser.waitForSelector('[data-testid="app-shell"]')
  await this.browser.waitForSelector('[data-testid="app-shell-main"]')
  assert.equal(await this.browser.getCount('[data-testid="app-shell"]'), 1)
  assert.equal(await this.browser.getCount('[data-testid="app-shell-main"]'), 1)
})

Then('the root agent workspace route is visible', async function (this: SigilWebWorld) {
  await this.browser.waitForSelector('[data-testid="agents-workspace"]')
})

Then('the standalone run-detail placeholder workspace is visible', async function (this: SigilWebWorld) {
  await this.browser.waitForSelector('[data-testid="run-detail-workspace"]')
  await this.browser.waitForSelector('[data-testid="run-detail-workspace-scroll-region"]')
})
