import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp, ReceiptText } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { ScrollArea, ScrollBar } from '#/components/ui/scroll-area'
import { Separator } from '#/components/ui/separator'
import type { RunArtifactStatus } from '#/lib/use-run-artifact'

type PricingKey = {
  provider?: string
  model?: string
}

type AccountingSummary = {
  currency?: string
  input_tokens?: number
  inputTokens?: number
  output_tokens?: number
  outputTokens?: number
  total_tokens?: number
  totalTokens?: number
  reasoning_tokens?: number
  reasoningTokens?: number
  known_total_cost_microusd?: number
  knownTotalCostMicrousd?: number
  token_source?: string
  tokenSource?: string
  token_status?: string
  tokenStatus?: string
  cost_source?: string
  costSource?: string
  cost_status?: string
  costStatus?: string
  pricing_key?: PricingKey
  pricingKey?: PricingKey
  pricing_version?: string
  pricingVersion?: string
  missing_token_item_count?: number
  missingTokenItemCount?: number
  missing_cost_item_count?: number
  missingCostItemCount?: number
}

type AccountingRollup = {
  model_total?: AccountingSummary
  modelTotal?: AccountingSummary
  direct_subcalls_total?: AccountingSummary
  directSubcallsTotal?: AccountingSummary
  tree_total?: AccountingSummary
  treeTotal?: AccountingSummary
}

type AccountingArtifact = {
  accounting?: AccountingRollup
}

type AccountingScope = {
  artifact?: Record<string, unknown>
  status: RunArtifactStatus
}

type DrawerSummary = {
  source?: string
  status?: string
  model?: string
  pricingVersion?: string
}

function asAccountingArtifact(artifact?: Record<string, unknown>): AccountingArtifact | null {
  if (artifact == null || typeof artifact.accounting !== 'object' || artifact.accounting == null) {
    return null
  }
  return artifact as AccountingArtifact
}

function formatTokens(value?: number): string {
  if (value == null) return 'unavailable'
  return new Intl.NumberFormat('en-US').format(value)
}

function formatCost(value?: number): string {
  if (value == null) return 'unavailable'
  return `$${(value / 1_000_000).toFixed(6)}`
}

function tokens(
  summary: AccountingSummary | undefined,
  key: 'input' | 'output' | 'reasoning' | 'total',
): number | undefined {
  if (!summary) return undefined
  switch (key) {
    case 'input':
      return summary.input_tokens ?? summary.inputTokens
    case 'output':
      return summary.output_tokens ?? summary.outputTokens
    case 'reasoning':
      return summary.reasoning_tokens ?? summary.reasoningTokens
    case 'total':
      return summary.total_tokens ?? summary.totalTokens
  }
}

function cost(summary?: AccountingSummary): number | undefined {
  return summary?.known_total_cost_microusd ?? summary?.knownTotalCostMicrousd
}

function pricingKey(summary?: AccountingSummary): PricingKey | undefined {
  return summary?.pricing_key ?? summary?.pricingKey
}

function pricingVersion(summary?: AccountingSummary): string | undefined {
  return summary?.pricing_version ?? summary?.pricingVersion
}

function rollupSummary(rollup: AccountingRollup | undefined, key: 'model' | 'directSubcalls' | 'tree') {
  if (!rollup) return undefined
  switch (key) {
    case 'model':
      return rollup.model_total ?? rollup.modelTotal
    case 'directSubcalls':
      return rollup.direct_subcalls_total ?? rollup.directSubcallsTotal
    case 'tree':
      return rollup.tree_total ?? rollup.treeTotal
  }
}

function formatStatus(summary?: AccountingSummary): string | undefined {
  if (!summary) return undefined
  const tokenStatus = summary.token_status ?? summary.tokenStatus
  const costStatus = summary.cost_status ?? summary.costStatus
  if (tokenStatus === costStatus) return tokenStatus
  return [tokenStatus, costStatus].filter(Boolean).join(' / ')
}

function formatSource(summary?: AccountingSummary): string | undefined {
  if (!summary) return undefined
  const tokenSource = summary.token_source ?? summary.tokenSource
  const costSource = summary.cost_source ?? summary.costSource
  if (tokenSource === costSource) return tokenSource
  return [tokenSource, costSource].filter(Boolean).join(' / ')
}

function summarize(artifact: AccountingArtifact | null): DrawerSummary {
  const summary = rollupSummary(artifact?.accounting, 'tree') ?? rollupSummary(artifact?.accounting, 'model')
  return {
    source: formatSource(summary),
    status: formatStatus(summary),
    model: pricingKey(summary)?.model,
    pricingVersion: pricingVersion(summary),
  }
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[0.58rem] font-bold tracking-widest whitespace-nowrap text-muted-foreground uppercase">
        {label}
      </div>
      <div className="text-xs font-bold whitespace-nowrap text-foreground tabular-nums">{value}</div>
    </div>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-5 items-center rounded-md border border-(--line) bg-secondary px-1.5 text-[0.65rem] font-semibold text-muted-foreground">
      {children}
    </span>
  )
}

function BreakdownBar({ summary }: { summary?: AccountingSummary }) {
  const input = tokens(summary, 'input') ?? 0
  const output = tokens(summary, 'output') ?? 0
  const reasoning = tokens(summary, 'reasoning') ?? 0
  const denominator = Math.max(input + output + reasoning, 1)
  const segments = [
    { label: 'input', value: input, className: 'bg-cyan-400/70' },
    { label: 'output', value: output, className: 'bg-(--sigil-accent)' },
    { label: 'reasoning', value: reasoning, className: 'bg-emerald-400/80' },
  ]

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-secondary">
        {segments.map((segment) => {
          const width = `${(segment.value / denominator) * 100}%`
          return <div key={segment.label} className={segment.className} style={{ width }} />
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.65rem] font-semibold text-muted-foreground">
        {segments.map((segment) => (
          <span key={segment.label}>
            {segment.label} <span className="text-foreground tabular-nums">{formatTokens(segment.value)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function RollupRow({ label, summary }: { label: string; summary?: AccountingSummary }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-md border border-(--line) bg-background/60 p-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-[0.65rem] font-bold tracking-widest text-(--sigil-accent) uppercase">{label}</span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {formatStatus(summary) && <Chip>{formatStatus(summary)}</Chip>}
          {formatSource(summary) && <Chip>{formatSource(summary)}</Chip>}
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-3 gap-2">
        <Metric label="tokens" value={formatTokens(tokens(summary, 'total'))} />
        <Metric label="cost" value={formatCost(cost(summary))} />
        <Metric label="reasoning" value={formatTokens(tokens(summary, 'reasoning'))} />
      </div>
      <BreakdownBar summary={summary} />
    </div>
  )
}

function ScopePanel({
  title,
  artifact,
  status,
}: {
  title: string
  artifact: AccountingArtifact | null
  status: RunArtifactStatus
}) {
  const rollup = artifact?.accounting
  const loading = status === 'loading'
  const unavailable = !loading && rollup == null

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-md border border-(--line) bg-(--surface) p-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold tracking-widest text-foreground uppercase">{title}</h2>
        {rollupSummary(rollup, 'tree') && <Chip>tree total</Chip>}
      </div>

      {loading && <span className="text-xs text-muted-foreground">Loading accounting...</span>}
      {unavailable && <span className="text-xs text-muted-foreground">Accounting unavailable for this scope.</span>}
      {rollup && (
        <div className="flex min-w-0 flex-col gap-2">
          <RollupRow label="tree_total" summary={rollupSummary(rollup, 'tree')} />
          <div className="grid gap-2 xl:grid-cols-2">
            <RollupRow label="model_total" summary={rollupSummary(rollup, 'model')} />
            <RollupRow label="direct_subcalls_total" summary={rollupSummary(rollup, 'directSubcalls')} />
          </div>
        </div>
      )}
    </section>
  )
}

export function AccountingDrawer({
  runAccounting,
  stepAccounting,
}: {
  runAccounting: AccountingScope
  stepAccounting: AccountingScope
}) {
  const [expanded, setExpanded] = useState(true)
  const runArtifact = useMemo(() => asAccountingArtifact(runAccounting.artifact), [runAccounting.artifact])
  const stepArtifact = useMemo(() => asAccountingArtifact(stepAccounting.artifact), [stepAccounting.artifact])
  const summary = summarize(stepArtifact ?? runArtifact)

  return (
    <div
      data-testid="accounting-drawer"
      className="flex max-h-[min(26rem,45dvh)] shrink-0 flex-col overflow-hidden border-t border-(--line) bg-(--workspace-bg)"
    >
      <div className="flex min-h-10 items-center gap-2 px-4 py-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-(--sigil-accent-soft)">
          <ReceiptText className="size-3.5 text-(--sigil-accent)" />
        </span>
        <span className="text-xs font-bold tracking-widest text-foreground uppercase">Accounting</span>
        {summary.status && <Chip>{summary.status}</Chip>}
        {summary.source && <Chip>{summary.source}</Chip>}
        {summary.model && (
          <span className="ml-auto truncate font-mono text-xs text-muted-foreground">{summary.model}</span>
        )}
        {summary.pricingVersion && <Chip>{summary.pricingVersion}</Chip>}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={summary.model ? '' : 'ml-auto'}
          aria-label={expanded ? 'Collapse accounting drawer' : 'Expand accounting drawer'}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
        </Button>
      </div>

      {expanded && (
        <div className="flex min-h-0 flex-1 flex-col">
          <Separator className="bg-(--line)" />
          <ScrollArea data-testid="accounting-drawer-scroll-region" className="min-h-0 flex-1">
            <div className="grid gap-3 p-4 lg:grid-cols-2">
              <ScopePanel title="Run Total" artifact={runArtifact} status={runAccounting.status} />
              <ScopePanel title="Selected Step" artifact={stepArtifact} status={stepAccounting.status} />
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
