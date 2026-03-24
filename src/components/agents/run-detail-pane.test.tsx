// @vitest-environment jsdom

import * as React from 'react'
import * as ReactDOMClient from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { RunDetailPane } from './run-detail-pane'

vi.mock('#/lib/use-run-subscription', () => ({
  useRunSubscription: vi.fn(() => ({
    status: 'error',
    projection: null,
    tree: null,
    events: [],
    steps: [],
    terminal: false,
    error: 'connection lost',
  })),
}))

const actEnvironmentGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
const originalActEnvironment = actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT
const mountedContainers: HTMLDivElement[] = []
const mountedRoots: ReactDOMClient.Root[] = []

describe('RunDetailPane', () => {
  beforeEach(() => {
    actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT = true
  })

  afterEach(async () => {
    while (mountedRoots.length > 0) {
      const root = mountedRoots.pop()
      if (root) {
        await React.act(async () => {
          root.unmount()
        })
      }
    }
    while (mountedContainers.length > 0) {
      mountedContainers.pop()?.remove()
    }
    actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment
  })

  it('shows the error state when the initial live load fails before a projection exists', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    mountedContainers.push(container)

    const root = ReactDOMClient.createRoot(container)
    mountedRoots.push(root)

    await React.act(async () => {
      root.render(<RunDetailPane agentId="agent-live" runId="run-live" />)
    })

    expect(container.textContent).toContain('Failed to load run detail.')
    expect(container.textContent).not.toContain('Loading run detail...')
  })
})
