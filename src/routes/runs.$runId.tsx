import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Footprints } from 'lucide-react'
import { AccountingDrawer } from '#/features/run-detail/accounting-drawer'
import { ActionOutputPane, ActionOutputPaneEmpty } from '#/features/run-detail/action-output-pane'
import { CodePane, CodePaneEmpty } from '#/features/run-detail/code-pane'
import { StepContextPane } from '#/features/run-detail/step-context-pane'
import { StepsPane } from '#/features/run-detail/steps-pane'
import type { RunProjectionView, RunStepDetailView, RunStepSummaryView } from '#/lib/protocol'
import { useRunArtifact } from '#/lib/use-run-artifact'
import { useRunSubscription } from '#/lib/use-run-subscription'
import { useStepDetail } from '#/lib/use-step-detail'

type RunDetailSearch = {
  agent?: string
}

export const Route = createFileRoute('/runs/$runId')({
  validateSearch: (search: Record<string, unknown>): RunDetailSearch => ({
    agent: typeof search.agent === 'string' && search.agent.length > 0 ? search.agent : undefined,
  }),
  component: RunDetailRoute,
})

function buildActionRefs(nodeId: string, stepId: string, actionCount: number): string[] {
  const refs: string[] = []
  for (let i = 1; i <= actionCount; i++) {
    refs.push(`run-artifact://node/${nodeId}/step/${stepId}/action-${i}.json`)
  }
  return refs
}

function mergeStepDetail(detail: RunStepDetailView | null, summary: RunStepSummaryView): RunStepDetailView {
  const actionRefs = buildActionRefs(summary.nodeId, summary.stepId, summary.actionCount)
  if (detail) {
    return {
      ...detail,
      state: summary.state,
      durationMs: summary.durationMs ?? detail.durationMs,
      completedAt: summary.completedAt ?? detail.completedAt,
      decision: summary.decision ?? detail.decision,
      actionCount: summary.actionCount,
      actionRefs,
    }
  }
  return { ...summary, actionRefs }
}

function StepEmptyState() {
  return (
    <div
      data-testid="step-empty-state"
      className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground"
    >
      <Footprints className="size-6 opacity-40" />
      <span className="text-xs font-semibold">Select a step to view details.</span>
    </div>
  )
}

function StepInspection({
  agentId,
  projection,
  runId,
  stepSummary,
}: {
  agentId: string
  projection: RunProjectionView
  runId: string
  stepSummary: RunStepSummaryView
}) {
  const [actionIndex, setActionIndex] = useState(0)
  const { step: fetchedStep } = useStepDetail(agentId, runId, stepSummary.nodeId, stepSummary.stepId)
  const step = useMemo(() => mergeStepDetail(fetchedStep, stepSummary), [fetchedStep, stepSummary])

  const actionRef = step.actionRefs?.[actionIndex]
  const actionState = useRunArtifact(agentId, runId, actionRef)
  const runAccountingState = useRunArtifact(agentId, runId, projection.accountingRef)
  const stepAccountingState = useRunArtifact(agentId, runId, step.accountingRef)
  const artifact = actionState.payload?.artifact as Record<string, unknown> | undefined

  const hasActions = (step.actionRefs?.length ?? 0) > 0
  const code = typeof artifact?.code === 'string' ? artifact.code : ''
  const language = typeof artifact?.language === 'string' ? artifact.language : 'text'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <StepContextPane step={step} actionIndex={actionIndex} onActionIndexChange={setActionIndex} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div data-testid="step-inspection-panes" className="flex min-h-0 flex-1 overflow-hidden">
          {hasActions && artifact ? (
            <>
              <CodePane code={code} language={language} />
              <ActionOutputPane artifact={artifact} />
            </>
          ) : (
            <>
              <CodePaneEmpty />
              <ActionOutputPaneEmpty />
            </>
          )}
        </div>
        <AccountingDrawer
          runAccounting={{
            status: runAccountingState.status,
            artifact: runAccountingState.payload?.artifact as Record<string, unknown> | undefined,
          }}
          stepAccounting={{
            status: stepAccountingState.status,
            artifact: stepAccountingState.payload?.artifact as Record<string, unknown> | undefined,
          }}
        />
      </div>
    </div>
  )
}

function RunDetailRoute() {
  const { runId } = Route.useParams()
  const { agent } = Route.useSearch()
  const agentId = agent ?? ''
  const { status, projection, steps } = useRunSubscription(agentId, runId)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)

  // Auto-select first step when steps load
  useEffect(() => {
    if (selectedStepId == null && steps.length > 0) {
      setSelectedStepId(steps[0].stepId)
    }
  }, [selectedStepId, steps])

  if (status === 'error') {
    return (
      <main data-testid="run-detail-workspace" className="workspace-route">
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Failed to load run detail.
        </div>
      </main>
    )
  }

  if (status === 'loading' || !projection) {
    return (
      <main data-testid="run-detail-workspace" className="workspace-route">
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading run detail...
        </div>
      </main>
    )
  }

  const selectedStep = steps.find((s) => s.stepId === selectedStepId)

  return (
    <main data-testid="run-detail-workspace" className="workspace-route">
      <StepsPane
        steps={steps}
        nodes={projection.nodes}
        selectedStepId={selectedStepId}
        onSelectStep={setSelectedStepId}
      />

      <div
        data-testid="run-detail-workspace-scroll-region"
        className="flex flex-1 flex-col overflow-hidden bg-(--workspace-bg)"
      >
        {selectedStep ? (
          <StepInspection agentId={agentId} projection={projection} runId={runId} stepSummary={selectedStep} />
        ) : (
          <StepEmptyState />
        )}
      </div>
    </main>
  )
}
