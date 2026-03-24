import { waitFor } from '../utils.ts'
import { LIVE_TIMELINE_FINAL_SEQ, LIVE_TIMELINE_RUN_ID } from '../fixtures/live-timeline.ts'
import type {
  AgentBrowserScenarioCase,
  AgentBrowserScenarioContext,
  AgentBrowserScenarioModule,
} from '../types.ts'

type TimelineMetrics = {
  buttonVisible: boolean
  clientHeight: number
  distanceFromBottom: number
  hasTimeline: boolean
  lastSeq: number | null
  overflow: boolean
  runState: string | null
  scrollHeight: number
  scrollTop: number
}

function measureTimelineScript(runId: string) {
  return `(() => {
    const timeline = document.querySelector('[data-testid="run-detail-timeline-tab"]');
    const viewport = timeline?.querySelector('[data-slot="scroll-area-viewport"]');
    const scrollButton = document.querySelector('[data-testid="run-detail-timeline-scroll-to-bottom"]');
    const runItem = document.querySelector(${JSON.stringify(`[data-testid="run-item-${runId}"]`)});
    const seqValues = timeline instanceof HTMLElement
      ? Array.from(timeline.querySelectorAll('span'))
          .map((element) => element.textContent?.trim() ?? '')
          .filter((value) => value.startsWith('seq '))
          .map((value) => Number(value.slice(4)))
          .filter((value) => Number.isFinite(value))
      : [];
    const lastSeq = seqValues.length > 0 ? seqValues[seqValues.length - 1] : null;
    if (!(viewport instanceof HTMLDivElement)) {
      return {
        hasTimeline: false,
        lastSeq,
        scrollTop: 0,
        clientHeight: 0,
        scrollHeight: 0,
        distanceFromBottom: 0,
        overflow: false,
        buttonVisible: false,
        runState: runItem?.textContent?.trim() ?? null,
      };
    }
    return {
      hasTimeline: true,
      lastSeq,
      scrollTop: viewport.scrollTop,
      clientHeight: viewport.clientHeight,
      scrollHeight: viewport.scrollHeight,
      distanceFromBottom: viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop,
      overflow: viewport.scrollHeight > viewport.clientHeight + 1,
      buttonVisible: scrollButton instanceof HTMLElement &&
        scrollButton.getAttribute('aria-hidden') !== 'true' &&
        getComputedStyle(scrollButton).opacity !== '0',
      runState: runItem?.textContent?.trim() ?? null,
    };
  })()`
}

async function measureTimeline(context: AgentBrowserScenarioContext, runId: string) {
  return context.browser.evalJSON<TimelineMetrics>(measureTimelineScript(runId))
}

async function clampTimelineHeight(context: AgentBrowserScenarioContext) {
  await context.browser.evalJSON(
    `(() => {
      const timeline = document.querySelector('[data-testid="run-detail-timeline-tab"]');
      if (!(timeline instanceof HTMLDivElement)) {
        return false;
      }
      const content = timeline.parentElement;
      if (content instanceof HTMLDivElement) {
        content.style.height = '220px';
        content.style.minHeight = '220px';
        content.style.maxHeight = '220px';
      }
      timeline.style.height = '220px';
      timeline.style.minHeight = '220px';
      timeline.style.maxHeight = '220px';
      window.dispatchEvent(new Event('resize'));
      return true;
    })()`,
  )
}

async function connectAgent(context: AgentBrowserScenarioContext, endpoint: string) {
  await context.browser.evalJSON(
    `(() => {
      const input = Array.from(document.querySelectorAll('input')).find((element) => element.getAttribute('placeholder') === 'ws://host:port');
      if (!(input instanceof HTMLInputElement)) {
        return false;
      }
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, ${JSON.stringify(endpoint)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`,
  )

  await waitFor(
    async () => {
      const enabled = await context.browser.evalJSON<boolean>(
        `(() => {
          const button = Array.from(document.querySelectorAll('button')).find((element) => element.textContent?.trim() === 'Connect');
          return button instanceof HTMLButtonElement ? !button.disabled : false;
        })()`,
      )
      return enabled ? true : undefined
    },
    {
      description: 'connect button to enable',
      timeoutMs: 5_000,
    },
  )

  await context.browser.evalJSON(
    `(() => {
      const button = Array.from(document.querySelectorAll('button')).find((element) => element.textContent?.trim() === 'Connect');
      if (button instanceof HTMLButtonElement) {
        button.click();
        return true;
      }
      return false;
    })()`,
  )

  await waitFor(
    async () => {
      const connected = await context.browser.evalJSON<boolean>(
        `(() => document.querySelector('[data-testid^="sidebar-agent-"]') instanceof HTMLElement)()`,
      )
      return connected ? true : undefined
    },
    {
      description: 'sidebar agent to appear',
      timeoutMs: 10_000,
    },
  )
}

async function waitForRunCard(context: AgentBrowserScenarioContext, runId: string): Promise<true> {
  return waitFor(
    async () => {
      const visible = await context.browser.evalJSON<boolean>(
        `(() => document.querySelector(${JSON.stringify(
          `[data-testid="run-item-${runId}"]`,
        )}) instanceof HTMLElement)()`,
      )
      return visible ? true : undefined
    },
    {
      description: `run item ${runId}`,
      timeoutMs: 15_000,
    },
  )
}

async function waitForTimeline(
  context: AgentBrowserScenarioContext,
  runId: string,
): Promise<TimelineMetrics> {
  return waitFor(
    async () => {
      const metrics = await measureTimeline(context, runId)
      return metrics.hasTimeline ? metrics : undefined
    },
    {
      description: 'timeline viewport',
      timeoutMs: 15_000,
    },
  )
}

async function waitForOverflow(
  context: AgentBrowserScenarioContext,
  runId: string,
): Promise<TimelineMetrics> {
  return waitFor(
    async () => {
      const metrics = await measureTimeline(context, runId)
      return metrics.overflow ? metrics : undefined
    },
    {
      description: 'timeline overflow',
      timeoutMs: 20_000,
    },
  )
}

async function waitForBottom(
  context: AgentBrowserScenarioContext,
  runId: string,
): Promise<TimelineMetrics> {
  return waitFor(
    async () => {
      const metrics = await measureTimeline(context, runId)
      return metrics.hasTimeline && metrics.lastSeq != null && metrics.distanceFromBottom <= 24
        ? metrics
        : undefined
    },
    {
      description: 'timeline to stay pinned to bottom',
      timeoutMs: 10_000,
    },
  )
}

async function forceScrollToBottom(context: AgentBrowserScenarioContext) {
  await context.browser.evalJSON(
    `(() => {
      const viewport = document.querySelector('[data-testid="run-detail-timeline-tab"] [data-slot="scroll-area-viewport"]');
      if (!(viewport instanceof HTMLDivElement)) {
        return false;
      }
      viewport.scrollTop = viewport.scrollHeight;
      viewport.dispatchEvent(new Event('scroll', { bubbles: true }));
      return true;
    })()`,
  )
}

async function waitForSeqGreaterThan(
  context: AgentBrowserScenarioContext,
  runId: string,
  previousSeq: number,
): Promise<TimelineMetrics> {
  return waitFor(
    async () => {
      const metrics = await measureTimeline(context, runId)
      return (metrics.lastSeq ?? 0) > previousSeq ? metrics : undefined
    },
    {
      description: `timeline seq to exceed ${previousSeq}`,
      timeoutMs: 20_000,
    },
  )
}

async function waitForTerminalState(
  context: AgentBrowserScenarioContext,
  runId: string,
): Promise<TimelineMetrics> {
  return waitFor(
    async () => {
      const metrics = await measureTimeline(context, runId)
      return metrics.runState?.toLowerCase().includes('completed') ? metrics : undefined
    },
    {
      description: `run ${runId} to complete`,
      timeoutMs: 30_000,
    },
  )
}

async function scrollAwayFromBottom(context: AgentBrowserScenarioContext, runId: string) {
  await context.browser.evalJSON(
    `(() => {
      const viewport = document.querySelector('[data-testid="run-detail-timeline-tab"] [data-slot="scroll-area-viewport"]');
      if (!(viewport instanceof HTMLDivElement)) {
        return false;
      }
      const target = Math.max(0, viewport.scrollHeight - viewport.clientHeight - 160);
      viewport.scrollTop = target;
      viewport.dispatchEvent(new Event('scroll', { bubbles: true }));
      return true;
    })()`,
  )

  await waitFor(
    async () => {
      const metrics = await measureTimeline(context, runId)
      return metrics.buttonVisible && metrics.distanceFromBottom > 24 ? metrics : undefined
    },
    {
      description: 'scroll recovery control to appear',
      timeoutMs: 10_000,
    },
  )
}

async function clickScrollToBottom(context: AgentBrowserScenarioContext) {
  await context.browser.evalJSON(
    `(() => {
      const button = document.querySelector('[data-testid="run-detail-timeline-scroll-to-bottom"]');
      if (button instanceof HTMLButtonElement) {
        button.click();
        return true;
      }
      return false;
    })()`,
  )
}

async function openRootRoute(context: AgentBrowserScenarioContext) {
  await context.browser.open(`${context.appURL}/`)
  await context.browser.waitForLoad('networkidle')
}

async function prepareLiveTimeline(context: AgentBrowserScenarioContext) {
  const runId = LIVE_TIMELINE_RUN_ID
  await openRootRoute(context)
  await connectAgent(context, context.controller.endpoint)

  await waitForRunCard(context, runId)
  await waitForTimeline(context, runId)
  await clampTimelineHeight(context)
  await waitForOverflow(context, runId)
  await forceScrollToBottom(context)
  await waitForBottom(context, runId)
  return runId
}

const autoFollowScenario: AgentBrowserScenarioCase = async (context) => {
  const runId = await prepareLiveTimeline(context)
  const initial = await waitForBottom(context, runId)
  const initialSeq = initial.lastSeq ?? 0

  await context.controller.advance(2000)
  const liveMetrics = await waitForSeqGreaterThan(context, runId, initialSeq)
  if (liveMetrics.distanceFromBottom > 24) {
    throw new Error(
      `expected live timeline to remain pinned, got distance ${liveMetrics.distanceFromBottom}`,
    )
  }

  await context.controller.advance(4000)
  const terminal = await waitForTerminalState(context, runId)
  if ((terminal.lastSeq ?? 0) !== LIVE_TIMELINE_FINAL_SEQ) {
    throw new Error(
      `expected scripted run to reach seq ${LIVE_TIMELINE_FINAL_SEQ}, got ${terminal.lastSeq}`,
    )
  }

  const finalMetrics = await waitForBottom(context, runId)
  if (finalMetrics.buttonVisible) {
    throw new Error('expected scroll recovery control to stay hidden at terminal bottom')
  }
}

const scrollRecoveryScenario: AgentBrowserScenarioCase = async (context) => {
  const runId = await prepareLiveTimeline(context)
  const initial = await waitForBottom(context, runId)
  const initialSeq = initial.lastSeq ?? 0

  await scrollAwayFromBottom(context, runId)
  const scrolledAway = await measureTimeline(context, runId)
  if (!scrolledAway.buttonVisible) {
    throw new Error('expected scroll recovery control to be visible after scrolling away')
  }

  await context.controller.advance(1000)
  const updatedWhileDetached = await waitForSeqGreaterThan(context, runId, initialSeq)
  if (updatedWhileDetached.distanceFromBottom <= 24) {
    throw new Error(
      'expected detached timeline to remain away from bottom while live updates arrive',
    )
  }

  await clickScrollToBottom(context)
  const reattached = await waitForBottom(context, runId)
  if (reattached.buttonVisible) {
    throw new Error('expected scroll recovery control to hide after reattaching to bottom')
  }

  await context.controller.advance(5000)
  await waitForTerminalState(context, runId)
  const finalMetrics = await waitForBottom(context, runId)
  if (finalMetrics.buttonVisible) {
    throw new Error('expected terminal timeline to remain pinned with hidden recovery control')
  }
}

export const cases: AgentBrowserScenarioModule['cases'] = {
  'Auto-follows the latest event while a live run detail timeline is pinned to the bottom':
    autoFollowScenario,
  'Shows a centered scroll-to-bottom control and resumes follow when the operator has scrolled away from the latest live event':
    scrollRecoveryScenario,
}

const moduleExport: AgentBrowserScenarioModule = {
  cases,
}

export default moduleExport
