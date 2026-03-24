import type { EventEnvelopeView } from './protocol'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type EventCategory = 'run' | 'node' | 'step' | 'turn' | 'action'

export type EventDisplayInfo = {
  category: EventCategory
  label: string
  summary: string
  dotColorClass: string
  isTerminal: boolean
}

/* ------------------------------------------------------------------ */
/*  Category derivation                                                */
/* ------------------------------------------------------------------ */

export function getEventCategory(eventType: string): EventCategory {
  if (eventType.startsWith('run.')) return 'run'
  if (eventType.startsWith('node.step.')) return 'step'
  if (eventType.startsWith('node.turn.')) return 'turn'
  if (eventType.startsWith('node.action.') || eventType.startsWith('node.subcall.')) return 'action'
  if (eventType === 'node.started' || eventType === 'node.completed' || eventType === 'node.failed')
    return 'node'
  return 'step'
}

/* ------------------------------------------------------------------ */
/*  Human-readable labels                                              */
/* ------------------------------------------------------------------ */

const LABEL_MAP: Record<string, string> = {
  'run.queued': 'Run queued',
  'run.running': 'Run started',
  'run.completed': 'Run completed',
  'run.failed': 'Run failed',
  'run.interrupted': 'Run interrupted',
  'node.started': 'Node started',
  'node.completed': 'Node completed',
  'node.failed': 'Node failed',
  'node.step.started': 'Step started',
  'node.step.completed': 'Step completed',
  'node.turn.user': 'User turn',
  'node.turn.model': 'Model turn',
  'node.action.executed': 'Action executed',
  'node.subcall.executed': 'Subcall executed',
}

export function getEventLabel(eventType: string): string {
  return LABEL_MAP[eventType] ?? eventType
}

/* ------------------------------------------------------------------ */
/*  Duration formatting                                                */
/* ------------------------------------------------------------------ */

export function formatDuration(ms: unknown): string {
  if (ms == null || typeof ms !== 'number') return ''
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/* ------------------------------------------------------------------ */
/*  Turn token correlation                                             */
/* ------------------------------------------------------------------ */

export type TurnTokens = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  reasoningTokens?: number
}

/**
 * Builds a lookup from stepId to model turn token data. Used to correlate
 * input token counts back to user turn events via shared stepId.
 */
export function buildTurnTokenMap(events: EventEnvelopeView[]): Map<string, TurnTokens> {
  const map = new Map<string, TurnTokens>()
  for (const event of events) {
    if (event.type !== 'node.turn.model') continue
    const p = event.payload
    if (p.inputTokens == null && p.outputTokens == null) continue
    const stepId = p.stepId as string | undefined
    if (!stepId) continue
    map.set(stepId, {
      inputTokens: Number(p.inputTokens ?? 0),
      outputTokens: Number(p.outputTokens ?? 0),
      totalTokens: Number(p.totalTokens ?? 0),
      reasoningTokens: p.reasoningTokens != null ? Number(p.reasoningTokens) : undefined,
    })
  }
  return map
}

/* ------------------------------------------------------------------ */
/*  Token formatting                                                   */
/* ------------------------------------------------------------------ */

export function formatTokenCount(n: number): string {
  return n.toLocaleString('en-US')
}

/* ------------------------------------------------------------------ */
/*  Payload summary                                                    */
/* ------------------------------------------------------------------ */

function str(v: unknown): string {
  return v != null ? String(v) : ''
}

function humanizeReason(reason: unknown): string {
  const s = str(reason)
  return s.replace(/_/g, ' ')
}

export function getEventSummary(
  eventType: string,
  payload: Record<string, unknown>,
  turnTokenMap?: Map<string, TurnTokens>,
): string {
  switch (eventType) {
    case 'run.queued': {
      const source = str(payload.source)
      return source ? `from ${source}` : ''
    }
    case 'run.running': {
      const parts: string[] = []
      if (payload.executor) parts.push(`executor: ${str(payload.executor)}`)
      if (payload.maxDepth != null) parts.push(`max depth: ${str(payload.maxDepth)}`)
      return parts.join(', ')
    }
    case 'run.completed': {
      return formatDuration(payload.durationMs)
    }
    case 'run.failed': {
      const code = str(payload.errorCode)
      const msg = str(payload.errorMessage)
      if (code && msg) return `${code}: ${msg}`
      return code || msg || str(payload.status)
    }
    case 'run.interrupted': {
      const reason = humanizeReason(payload.reason)
      const by = str(payload.interruptedBy)
      if (reason && by) return `${reason} via ${by}`
      return reason || by || ''
    }
    case 'node.started': {
      const role = str(payload.role)
      const depth = payload.depth != null ? str(payload.depth) : ''
      if (role && depth) return `${role} node, depth ${depth}`
      return role || ''
    }
    case 'node.completed': {
      return formatDuration(payload.durationMs)
    }
    case 'node.failed': {
      const code = str(payload.errorCode)
      const msg = str(payload.errorMessage)
      if (code && msg) return `${code}: ${msg}`
      return code || msg || ''
    }
    case 'node.step.started': {
      const idx = payload.stepIndex != null ? str(payload.stepIndex) : ''
      const schema = str(payload.schemaId)
      if (idx && schema) return `step #${idx} (${schema})`
      return schema || ''
    }
    case 'node.step.completed': {
      const parts: string[] = []
      if (payload.decision) parts.push(str(payload.decision))
      if (payload.actionCount != null) {
        const n = Number(payload.actionCount)
        parts.push(`${n} action${n !== 1 ? 's' : ''}`)
      }
      const dur = formatDuration(payload.durationMs)
      if (dur) parts.push(dur)
      return parts.join(', ')
    }
    case 'node.turn.user': {
      const stepId = payload.stepId as string | undefined
      if (!stepId || !turnTokenMap) return 'awaiting response...'
      const tokens = turnTokenMap.get(stepId)
      if (!tokens) return 'awaiting response...'
      return `${formatTokenCount(tokens.inputTokens)} input tokens`
    }
    case 'node.turn.model': {
      const out = payload.outputTokens
      if (out == null) return ''
      const reasoning = payload.reasoningTokens
      if (reasoning != null) {
        return `${formatTokenCount(Number(out))} output tokens (${formatTokenCount(Number(reasoning))} reasoning)`
      }
      return `${formatTokenCount(Number(out))} output tokens`
    }
    case 'node.action.executed': {
      const parts: string[] = []
      const actionType = str(payload.actionType)
      const lang = str(payload.language)
      if (actionType && lang) parts.push(`${actionType} (${lang})`)
      else if (actionType) parts.push(actionType)
      if (payload.status) parts.push(str(payload.status))
      const dur = formatDuration(payload.durationMs)
      if (dur) parts.push(dur)
      return parts.join(', ')
    }
    case 'node.subcall.executed': {
      const parts: string[] = []
      const subcallType = str(payload.subcallType)
      const model = str(payload.model)
      if (subcallType && model) parts.push(`${subcallType} (${model})`)
      else if (subcallType) parts.push(subcallType)
      if (payload.status) parts.push(str(payload.status))
      const dur = formatDuration(payload.durationMs)
      if (dur) parts.push(dur)
      return parts.join(', ')
    }
    default:
      return ''
  }
}

/* ------------------------------------------------------------------ */
/*  Dot color class                                                    */
/* ------------------------------------------------------------------ */

const DOT_COLOR_BY_TYPE: Record<string, string> = {
  'run.queued': 'bg-[var(--run-status-queued)]',
  'run.running': 'bg-[var(--run-status-running)]',
  'run.completed': 'bg-[var(--run-status-completed)]',
  'run.failed': 'bg-[var(--run-status-failed)]',
  'run.interrupted': 'bg-[var(--run-status-interrupted)]',
}

const DOT_COLOR_BY_CATEGORY: Record<EventCategory, string> = {
  run: 'bg-[var(--sigil-accent)]',
  node: 'bg-[var(--run-status-running)]',
  step: 'bg-[var(--foreground)]',
  turn: 'bg-[var(--muted-foreground)]',
  action: 'bg-[var(--run-status-interrupted)]',
}

export function getDotColorClass(eventType: string, category: EventCategory): string {
  return DOT_COLOR_BY_TYPE[eventType] ?? DOT_COLOR_BY_CATEGORY[category]
}

/* ------------------------------------------------------------------ */
/*  Terminal detection                                                 */
/* ------------------------------------------------------------------ */

const TERMINAL_TYPES = new Set(['run.completed', 'run.failed', 'run.interrupted'])

/* ------------------------------------------------------------------ */
/*  Compositor                                                         */
/* ------------------------------------------------------------------ */

export function getEventDisplayInfo(
  event: EventEnvelopeView,
  turnTokenMap?: Map<string, TurnTokens>,
): EventDisplayInfo {
  const category = getEventCategory(event.type)
  return {
    category,
    label: getEventLabel(event.type),
    summary: getEventSummary(event.type, event.payload, turnTokenMap),
    dotColorClass: getDotColorClass(event.type, category),
    isTerminal: TERMINAL_TYPES.has(event.type),
  }
}
