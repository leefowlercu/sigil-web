// @vitest-environment jsdom

import * as React from 'react'
import * as ReactDOMClient from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { Separator } from './separator'

const actEnvironmentGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
const originalActEnvironment = actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT
const mountedContainers: HTMLDivElement[] = []
const mountedRoots: ReactDOMClient.Root[] = []

describe('Separator', () => {
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

  it('uses horizontal defaults by default', async () => {
    const { container } = await renderSeparator(<Separator />)
    const separator = container.querySelector('[data-slot="separator"]')

    expect(separator).not.toBeNull()
    expect(separator?.getAttribute('data-orientation')).toBe('horizontal')
    expect(separator?.className).toContain('h-px')
    expect(separator?.className).toContain('w-full')
  })

  it('allows vertical separators to keep an explicit height class', async () => {
    const { container } = await renderSeparator(
      <Separator orientation="vertical" className="h-4" />,
    )
    const separator = container.querySelector('[data-slot="separator"]')

    expect(separator).not.toBeNull()
    expect(separator?.getAttribute('data-orientation')).toBe('vertical')
    expect(separator?.className).toContain('w-px')
    expect(separator?.className).toContain('h-4')
    expect(separator?.className).not.toContain('h-full')
  })
})

async function renderSeparator(element: React.ReactNode) {
  const container = document.createElement('div')
  document.body.append(container)
  mountedContainers.push(container)

  const root = ReactDOMClient.createRoot(container)
  mountedRoots.push(root)

  await React.act(async () => {
    root.render(element)
  })

  return { container, root }
}
