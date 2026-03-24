// @vitest-environment jsdom

import { waitFor } from '@testing-library/dom'
import * as React from 'react'
import * as ReactDOMClient from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { EventEnvelopeView } from '#/lib/protocol'
import { buildLiveTimelineEvents } from '../../../testing/agent-browser/fixtures/live-timeline.ts'
import { RunTimelineTab } from './run-timeline-tab'

vi.mock('#/components/ui/button', async () => {
  const ReactModule = await import('react')
  return {
    Button({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) {
      return ReactModule.createElement('button', props, children)
    },
  }
})

vi.mock('#/components/ui/scroll-area', async () => {
  const ReactModule = await import('react')
  return {
    ScrollArea({
      className,
      children,
      viewportRef,
      ...props
    }: Record<string, unknown> & {
      children?: React.ReactNode
      className?: string
      viewportRef?: React.Ref<HTMLDivElement>
    }) {
      return ReactModule.createElement(
        'div',
        {
          ...props,
          className,
          'data-slot': 'scroll-area',
        },
        ReactModule.createElement(
          'div',
          {
            ref: viewportRef,
            'data-slot': 'scroll-area-viewport',
          },
          children,
        ),
      )
    },
  }
})

const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight')
const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight')
const originalScrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo')
const actEnvironmentGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
const originalActEnvironment = actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT
let mockClientHeight = 100
let mockScrollHeight = 400

type TimelineProps = React.ComponentProps<typeof RunTimelineTab>

const mountedContainers: HTMLDivElement[] = []
const mountedRoots: ReactDOMClient.Root[] = []

function makeEvent(seq: number): EventEnvelopeView {
  const event = buildLiveTimelineEvents(seq).at(-1)
  if (event == null) {
    throw new Error(`missing live timeline fixture event ${seq}`)
  }
  return event
}

function getViewport(container: HTMLElement): HTMLDivElement {
  const viewport = container.querySelector('[data-slot="scroll-area-viewport"]')
  if (!(viewport instanceof HTMLDivElement)) {
    throw new Error('expected scroll-area viewport')
  }
  return viewport
}

function queryScrollButton(container: HTMLElement): HTMLButtonElement | null {
  const button = container.querySelector('[data-testid="run-detail-timeline-scroll-to-bottom"]')
  return button instanceof HTMLButtonElement && button.getAttribute('aria-hidden') !== 'true'
    ? button
    : null
}

function expectScrollButtonLabel(container: HTMLElement, expectedLabel: string) {
  const button = queryScrollButton(container)
  expect(button).not.toBe(null)
  expect(button?.getAttribute('aria-label')).toBe(expectedLabel)
  expect(button?.getAttribute('title')).toBe(expectedLabel)
  expect(button?.textContent).toBe('')
}

async function flushEffects() {
  await React.act(async () => {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 0)
    })
  })
}

async function renderTimeline(props: TimelineProps) {
  const container = document.createElement('div')
  document.body.append(container)
  mountedContainers.push(container)

  const root = ReactDOMClient.createRoot(container)
  mountedRoots.push(root)

  await React.act(async () => {
    root.render(<RunTimelineTab {...props} />)
  })
  await flushEffects()

  return {
    container,
    rerender: async (nextProps: TimelineProps) => {
      await React.act(async () => {
        root.render(<RunTimelineTab {...nextProps} />)
      })
      await flushEffects()
    },
  }
}

describe('RunTimelineTab', () => {
  beforeEach(() => {
    actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT = true
    mockClientHeight = 100
    mockScrollHeight = 400
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(0), 0),
    )
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      window.clearTimeout(id)
    })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        return mockClientHeight
      },
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return mockScrollHeight
      },
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: function scrollTo({ top }: { top?: number }) {
        this.scrollTop = top ?? 0
      },
    })
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
      const container = mountedContainers.pop()
      container?.remove()
    }

    actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment
    vi.unstubAllGlobals()
    if (originalClientHeight) {
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight)
    }
    if (originalScrollHeight) {
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight)
    }
    if (originalScrollTo) {
      Object.defineProperty(HTMLElement.prototype, 'scrollTo', originalScrollTo)
    }
  })

  it('Auto-follows the latest event while a live run detail timeline is pinned to the bottom', async () => {
    const rendered = await renderTimeline({
      events: [makeEvent(1), makeEvent(2)],
      isLive: true,
      runId: 'run-live',
      turnTokenMap: new Map(),
    })

    const viewport = getViewport(rendered.container)
    await waitFor(() => {
      expect(viewport.scrollTop).toBe(400)
    })
    expect(queryScrollButton(rendered.container)).toBe(null)
  })

  it('repositions live timelines when switching runs with unchanged event counts', async () => {
    const rendered = await renderTimeline({
      events: [makeEvent(1), makeEvent(2)],
      isLive: true,
      runId: 'run-live-a',
      turnTokenMap: new Map(),
    })

    const viewport = getViewport(rendered.container)
    await waitFor(() => {
      expect(viewport.scrollTop).toBe(400)
    })

    mockScrollHeight = 640

    await rendered.rerender({
      events: [makeEvent(1), makeEvent(2)],
      isLive: true,
      runId: 'run-live-b',
      turnTokenMap: new Map(),
    })

    await waitFor(() => {
      expect(viewport.scrollTop).toBe(640)
    })
    expect(queryScrollButton(rendered.container)).toBe(null)
  })

  it('shows each event identifier in full for both run-scoped and node-scoped events', async () => {
    const runScopedEvent = makeEvent(1)
    const nodeScopedEvent = makeEvent(3)
    const nodeScopedNodeId = nodeScopedEvent.nodeId

    expect(nodeScopedNodeId).toBeDefined()

    const rendered = await renderTimeline({
      events: [runScopedEvent, nodeScopedEvent],
      isLive: true,
      runId: 'run-identifiers',
      turnTokenMap: new Map(),
    })

    await waitFor(() => {
      expect(rendered.container.textContent).toContain(runScopedEvent.eventId)
      expect(rendered.container.textContent).toContain(nodeScopedEvent.eventId)
    })

    const runScopedEventIdSpan = Array.from(rendered.container.querySelectorAll('span')).find(
      (element) => element.textContent === runScopedEvent.eventId,
    )
    expect(runScopedEventIdSpan).not.toBeUndefined()
    expect(runScopedEventIdSpan?.className).not.toContain('basis-full')
    expect(runScopedEventIdSpan?.className).not.toContain('break-all')

    expect(rendered.container.textContent).not.toContain(`seq ${runScopedEvent.seq}`)
    expect(rendered.container.textContent).not.toContain(`seq ${nodeScopedEvent.seq}`)
    expect(rendered.container.textContent).not.toContain(nodeScopedNodeId!)
    expect(rendered.container.textContent).not.toContain(nodeScopedNodeId!.slice(0, 13))
  })

  it('Shows a centered scroll-to-bottom control and resumes follow when the operator has scrolled away from the latest live event', async () => {
    const rendered = await renderTimeline({
      events: [makeEvent(1), makeEvent(2)],
      isLive: true,
      runId: 'run-live',
      turnTokenMap: new Map(),
    })

    const viewport = getViewport(rendered.container)
    await waitFor(() => {
      expect(viewport.scrollTop).toBe(400)
    })

    viewport.scrollTop = 40
    await React.act(async () => {
      viewport.dispatchEvent(new Event('scroll', { bubbles: true }))
    })
    await flushEffects()

    const button = queryScrollButton(rendered.container)
    expect(button).not.toBe(null)
    expectScrollButtonLabel(rendered.container, 'Follow latest event')

    await rendered.rerender({
      events: [makeEvent(1), makeEvent(2), makeEvent(3)],
      isLive: true,
      runId: 'run-live',
      turnTokenMap: new Map(),
    })

    await waitFor(() => {
      expect(viewport.scrollTop).toBe(40)
    })

    await React.act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flushEffects()

    await waitFor(() => {
      expect(viewport.scrollTop).toBe(400)
    })
    expect(queryScrollButton(rendered.container)).toBe(null)

    await rendered.rerender({
      events: [makeEvent(1), makeEvent(2), makeEvent(3), makeEvent(4)],
      isLive: true,
      runId: 'run-live',
      turnTokenMap: new Map(),
    })

    await waitFor(() => {
      expect(viewport.scrollTop).toBe(400)
    })
  })

  it('keeps terminal timelines on one-shot scroll behavior', async () => {
    const rendered = await renderTimeline({
      events: [makeEvent(1), makeEvent(2)],
      isLive: false,
      runId: 'run-terminal',
      turnTokenMap: new Map(),
    })

    const viewport = getViewport(rendered.container)
    await waitFor(() => {
      expect(queryScrollButton(rendered.container)).not.toBe(null)
    })
    expectScrollButtonLabel(rendered.container, 'Scroll to bottom')

    await React.act(async () => {
      queryScrollButton(rendered.container)?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
    })
    await flushEffects()

    await waitFor(() => {
      expect(viewport.scrollTop).toBe(400)
    })

    viewport.scrollTop = 40
    await React.act(async () => {
      viewport.dispatchEvent(new Event('scroll', { bubbles: true }))
    })
    await flushEffects()

    await rendered.rerender({
      events: [makeEvent(1), makeEvent(2), makeEvent(3)],
      isLive: false,
      runId: 'run-terminal',
      turnTokenMap: new Map(),
    })

    await waitFor(() => {
      expect(viewport.scrollTop).toBe(40)
    })
  })

  it('keeps the scroll control hidden while a button-initiated smooth scroll is settling', async () => {
    const rendered = await renderTimeline({
      events: [makeEvent(1), makeEvent(2)],
      isLive: false,
      runId: 'run-terminal-smooth',
      turnTokenMap: new Map(),
    })

    const viewport = getViewport(rendered.container)
    await waitFor(() => {
      expect(queryScrollButton(rendered.container)).not.toBe(null)
    })

    Object.defineProperty(viewport, 'scrollTo', {
      configurable: true,
      value: ({ top }: { top?: number }) => {
        viewport.scrollTop = 240
        viewport.dispatchEvent(new Event('scroll', { bubbles: true }))

        window.setTimeout(() => {
          viewport.scrollTop = top ?? 0
          viewport.dispatchEvent(new Event('scroll', { bubbles: true }))
        }, 0)
      },
    })

    await React.act(async () => {
      queryScrollButton(rendered.container)?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
    })

    expect(queryScrollButton(rendered.container)).toBe(null)

    await flushEffects()

    expect(queryScrollButton(rendered.container)).toBe(null)

    await waitFor(() => {
      expect(viewport.scrollTop).toBe(400)
    })
    expect(queryScrollButton(rendered.container)).toBe(null)
  })

  it('keeps live follow armed for the final event when the run turns terminal', async () => {
    const rendered = await renderTimeline({
      events: [makeEvent(1), makeEvent(2)],
      isLive: true,
      runId: 'run-live-final',
      turnTokenMap: new Map(),
    })

    const viewport = getViewport(rendered.container)
    await waitFor(() => {
      expect(viewport.scrollTop).toBe(400)
    })

    viewport.scrollTop = 40
    await React.act(async () => {
      viewport.dispatchEvent(new Event('scroll', { bubbles: true }))
    })
    await flushEffects()

    await React.act(async () => {
      queryScrollButton(rendered.container)?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
    })
    await flushEffects()

    await waitFor(() => {
      expect(viewport.scrollTop).toBe(400)
    })

    viewport.scrollTop = 240

    await rendered.rerender({
      events: [makeEvent(1), makeEvent(2), makeEvent(3)],
      isLive: false,
      runId: 'run-live-final',
      turnTokenMap: new Map(),
    })

    await waitFor(() => {
      expect(viewport.scrollTop).toBe(400)
    })
  })
})
