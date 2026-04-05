import { AlertTriangle, Terminal } from 'lucide-react'
import { ScrollArea, ScrollBar } from '#/components/ui/scroll-area'
import { Separator } from '#/components/ui/separator'

type ActionSubcallTrace = {
  subcall_index?: number
  subcall_type?: string
  execution_mode?: string
  status?: string
  provider?: string
  model?: string
  prompt_bytes?: number
  context_bytes?: number
  answer_bytes?: number
  duration_ms?: number
  child_node_id?: string
  error_code?: string
  error_message?: string
}

type ActionArtifact = {
  stdout?: string
  stderr?: string
  status?: string
  duration_ms?: number
  error_code?: string
  error_message?: string
  error_detail?: {
    stage?: string
    message?: string
    line?: number
    column?: number
    symbol?: string
    source_line?: string
  }
  subcalls?: ActionSubcallTrace[]
}

function OutputSection({ label, content }: { label: string; content?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-muted-foreground uppercase">{label}</span>
      {content ? (
        <pre className="overflow-x-auto rounded-lg bg-secondary p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground">
          {content}
        </pre>
      ) : (
        <span className="text-xs text-muted-foreground italic">No output.</span>
      )}
    </div>
  )
}

function ErrorSection({ artifact }: { artifact: ActionArtifact }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-(--run-status-failed) uppercase">
        <AlertTriangle className="size-3" />
        Error
      </span>
      {artifact.error_code && <span className="font-mono text-xs text-muted-foreground">{artifact.error_code}</span>}
      {artifact.error_message && (
        <pre className="overflow-x-auto rounded-lg bg-secondary p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground">
          {artifact.error_message}
        </pre>
      )}
      {artifact.error_detail && (
        <div className="flex flex-col gap-1 rounded-lg bg-secondary p-3 font-mono text-xs text-muted-foreground">
          {artifact.error_detail.stage && <span>stage: {artifact.error_detail.stage}</span>}
          {artifact.error_detail.message && <span>message: {artifact.error_detail.message}</span>}
          {artifact.error_detail.line != null && <span>line: {artifact.error_detail.line}</span>}
          {artifact.error_detail.source_line && <span>source: {artifact.error_detail.source_line}</span>}
        </div>
      )}
    </div>
  )
}

function SubcallsSection({ subcalls }: { subcalls: ActionSubcallTrace[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-muted-foreground uppercase">Subcalls ({subcalls.length})</span>
      <div className="flex flex-col gap-2">
        {subcalls.map((sc, i) => (
          <div
            key={sc.subcall_index ?? i}
            className="flex flex-col gap-1 rounded-lg bg-secondary p-3 font-mono text-xs text-muted-foreground"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-foreground">#{sc.subcall_index ?? i + 1}</span>
              {sc.subcall_type && <span>{sc.subcall_type}</span>}
              {sc.status && <span>{sc.status}</span>}
              {sc.duration_ms != null && <span className="tabular-nums">{sc.duration_ms}ms</span>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {sc.provider && <span>provider: {sc.provider}</span>}
              {sc.model && <span>model: {sc.model}</span>}
              {sc.execution_mode && <span>mode: {sc.execution_mode}</span>}
            </div>
            {sc.child_node_id && <span>child node: {sc.child_node_id}</span>}
            {sc.error_code && <span className="text-(--run-status-failed)">error: {sc.error_code}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ActionOutputPane({ artifact }: { artifact: ActionArtifact }) {
  const hasError = artifact.error_code || artifact.error_message || artifact.error_detail
  const subcalls = Array.isArray(artifact.subcalls) && artifact.subcalls.length > 0 ? artifact.subcalls : null

  return (
    <div data-testid="step-action-output-pane" className="flex min-h-0 min-w-0 basis-1/2 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-(--line) px-4 py-2">
        <Terminal className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-bold text-foreground uppercase">Output</span>
        {artifact.status && (
          <span className="text-xs font-semibold text-muted-foreground uppercase">{artifact.status}</span>
        )}
        {artifact.duration_ms != null && (
          <span className="text-xs text-muted-foreground tabular-nums">{artifact.duration_ms}ms</span>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-4">
          <OutputSection label="stdout" content={artifact.stdout} />
          <OutputSection label="stderr" content={artifact.stderr} />

          {hasError && (
            <>
              <Separator className="bg-(--line)" />
              <ErrorSection artifact={artifact} />
            </>
          )}

          {subcalls && (
            <>
              <Separator className="bg-(--line)" />
              <SubcallsSection subcalls={subcalls} />
            </>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

export function ActionOutputPaneEmpty() {
  return (
    <div
      data-testid="step-action-output-pane-empty"
      className="flex min-h-0 flex-1 flex-col items-center justify-center"
    >
      <span className="text-xs text-muted-foreground">No action executed in this step.</span>
    </div>
  )
}
