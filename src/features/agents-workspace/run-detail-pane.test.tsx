// @vitest-environment jsdom

import { waitFor } from '@testing-library/dom'
import * as React from 'react'
import * as ReactDOMClient from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { RunDetailPane } from './run-detail-pane'

const runDetailPaneMocks = vi.hoisted(() => ({
  useRunArtifact: vi.fn(),
  useRunSubscription: vi.fn(),
}))

vi.mock('#/lib/use-run-artifact', () => ({
  useRunArtifact: runDetailPaneMocks.useRunArtifact,
}))

vi.mock('#/lib/use-run-subscription', () => ({
  useRunSubscription: runDetailPaneMocks.useRunSubscription,
}))

vi.mock('#/features/agents-workspace/run-timeline-tab', () => ({
  RunTimelineTab() {
    return <div data-testid="run-detail-pane-timeline-tab">Timeline tab</div>
  },
}))

vi.mock('#/components/ui/scroll-area', async () => {
  const ReactModule = await import('react')
  return {
    ScrollArea({
      className,
      children,
      ...props
    }: Record<string, unknown> & {
      children?: React.ReactNode
      className?: string
    }) {
      return ReactModule.createElement(
        'div',
        {
          ...props,
          className,
          'data-slot': 'scroll-area',
        },
        children,
      )
    },
  }
})

const actEnvironmentGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
const originalActEnvironment = actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT
const mountedContainers: HTMLDivElement[] = []
const mountedRoots: ReactDOMClient.Root[] = []

function makeSubscriptionState(overrides: Record<string, unknown> = {}) {
  return {
    status: 'error',
    projection: null,
    tree: null,
    events: [],
    steps: [],
    terminal: false,
    error: 'connection lost',
    ...overrides,
  }
}

function makeProjection(overrides: Record<string, unknown> = {}) {
  return {
    runId: 'run-live',
    name: 'live-run',
    state: 'completed',
    source: 'app_server.run.start',
    executor: 'codex',
    pidStatus: 'not_running',
    maxDepth: 2,
    nodeCount: 1,
    stepCount: 1,
    actionCount: 0,
    subcallCount: 0,
    queuedAt: '2026-03-24T10:00:00Z',
    startedAt: '2026-03-24T10:00:01Z',
    terminalAt: '2026-03-24T10:00:03Z',
    nodes: [
      {
        nodeId: 'node-root-123456',
        role: 'root',
        state: 'completed',
        stepCount: 1,
      },
    ],
    ...overrides,
  }
}

describe('RunDetailPane', () => {
  beforeEach(() => {
    actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT = true
    runDetailPaneMocks.useRunArtifact.mockReset()
    runDetailPaneMocks.useRunSubscription.mockReset()
    runDetailPaneMocks.useRunArtifact.mockReturnValue({
      status: 'idle',
      payload: null,
      error: null,
    })
    runDetailPaneMocks.useRunSubscription.mockReturnValue(makeSubscriptionState())
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

  it('shows full step IDs and step durations in seconds with two decimals', async () => {
    const fullStepId = 'step-1234567890abcdefghijklmnop'
    runDetailPaneMocks.useRunSubscription.mockReturnValue(
      makeSubscriptionState({
        status: 'terminal',
        projection: makeProjection(),
        terminal: true,
        error: null,
        steps: [
          {
            nodeId: 'node-root-123456',
            stepId: fullStepId,
            nodeStepIndex: 7,
            stepStartedSeq: 3,
            schemaId: 'sigil.rlm.response.v1',
            state: 'completed',
            startedAt: '2026-03-24T10:00:01Z',
            completedAt: '2026-03-24T10:00:02Z',
            durationMs: 1234,
            decision: 'completed',
            actionCount: 1,
            subcallCount: 0,
          },
        ],
      }),
    )

    const container = document.createElement('div')
    document.body.append(container)
    mountedContainers.push(container)

    const root = ReactDOMClient.createRoot(container)
    mountedRoots.push(root)

    await React.act(async () => {
      root.render(<RunDetailPane agentId="agent-live" runId="run-live" />)
    })

    const stepsTab = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Steps',
    )
    expect(stepsTab).toBeInstanceOf(HTMLButtonElement)

    await React.act(async () => {
      stepsTab?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    })

    await waitFor(() => {
      const spanTexts = Array.from(container.querySelectorAll('span'))
        .map((element) => element.textContent)
        .filter((value): value is string => value != null)

      expect(spanTexts).toContain(fullStepId)
      expect(spanTexts).toContain('1.23s')
      expect(spanTexts).not.toContain(fullStepId.slice(0, 13))
      expect(spanTexts).not.toContain('1234ms')
    })
  })

  it('shows the final answer beneath the final answer ref on the meta tab', async () => {
    const finalAnswer =
      'token=SIGIL-NEEDLE-2026-03-03-ALPHA-OMEGA-7719; chunk=CHUNK-0539; evidence=line'
    runDetailPaneMocks.useRunArtifact.mockReturnValue({
      status: 'ready',
      payload: {
        artifactRef: 'run-artifact://node/node-root-123456/final-answer.json',
        artifactKind: 'final_answer',
        identity: { nodeId: 'node-root-123456' },
        artifact: {
          final_answer: finalAnswer,
        },
      },
      error: null,
    })
    runDetailPaneMocks.useRunSubscription.mockReturnValue(
      makeSubscriptionState({
        status: 'terminal',
        projection: makeProjection({
          finalAnswerRef: 'run-artifact://node/node-root-123456/final-answer.json',
        }),
        terminal: true,
        error: null,
      }),
    )

    const container = document.createElement('div')
    document.body.append(container)
    mountedContainers.push(container)

    const root = ReactDOMClient.createRoot(container)
    mountedRoots.push(root)

    await React.act(async () => {
      root.render(<RunDetailPane agentId="agent-live" runId="run-live" />)
    })

    const metaTab = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Meta',
    )
    expect(metaTab).toBeInstanceOf(HTMLButtonElement)

    await React.act(async () => {
      metaTab?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    })

    await waitFor(() => {
      expect(container.textContent).toContain('Final Answer Ref')
      expect(container.textContent).toContain('Final Answer')
      expect(container.textContent).toContain(finalAnswer)
    })
  })
})
