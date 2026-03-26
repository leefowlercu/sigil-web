import assert from 'node:assert/strict'
import type { AgentBrowserSession } from './agent-browser'

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export async function waitForCondition(callback: () => Promise<boolean>, message: string, timeoutMs = 10_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await callback()) {
      return
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 100)
    })
  }
  assert.fail(message)
}

export async function waitForSelectorText(
  browser: AgentBrowserSession,
  selector: string,
  expected: string,
  timeoutMs = 10_000,
) {
  const normalizedExpected = normalizeWhitespace(expected).toLowerCase()
  await waitForCondition(
    async () => {
      try {
        const text = await browser.getText(selector)
        return normalizeWhitespace(text).toLowerCase().includes(normalizedExpected)
      } catch {
        return false
      }
    },
    `Timed out waiting for ${selector} to contain ${expected}`,
    timeoutMs,
  )
}

export async function waitForBodyText(browser: AgentBrowserSession, expected: string, timeoutMs = 10_000) {
  const normalizedExpected = normalizeWhitespace(expected).toLowerCase()
  await waitForCondition(
    async () => {
      try {
        const text = await browser.getText('body')
        return normalizeWhitespace(text).toLowerCase().includes(normalizedExpected)
      } catch {
        return false
      }
    },
    `Timed out waiting for the page body to contain ${expected}`,
    timeoutMs,
  )
}

export async function waitForUrlSuffix(browser: AgentBrowserSession, expectedSuffix: string, timeoutMs = 10_000) {
  await waitForCondition(
    async () => {
      try {
        return (await browser.getUrl()).endsWith(expectedSuffix)
      } catch {
        return false
      }
    },
    `Timed out waiting for URL to end with ${expectedSuffix}`,
    timeoutMs,
  )
}
