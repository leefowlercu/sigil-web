import { Bot, Hash } from 'lucide-react'
import { Separator } from '#/components/ui/separator'
import type { AgentInstance } from '#/lib/demo-data'
import { ConnectionStateBadge } from './status-primitives'

export function AgentContextPane({ agent }: { agent: AgentInstance }) {
  return (
    <div
      data-testid="agent-context-pane"
      className="flex shrink-0 items-center gap-3 border-b border-(--line) bg-(--surface) py-2.5 pl-4"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-7 items-center justify-center rounded-md bg-(--sigil-accent-soft)">
          <Bot className="size-3.5 text-(--sigil-accent)" />
        </span>
        <span
          data-testid="selected-agent-name"
          className="text-sm font-bold tracking-tight text-foreground"
        >
          {agent.server.instanceName}
        </span>
      </div>

      <Separator orientation="vertical" className="h-4" />

      <ConnectionStateBadge state={agent.connectionState} />

      <Separator orientation="vertical" className="h-4" />

      <span className="font-mono text-[0.62rem] font-medium text-muted-foreground">
        {agent.endpoint}
      </span>

      <span className="ml-auto inline-flex items-center gap-1 text-[0.58rem] font-semibold text-muted-foreground">
        <Hash className="size-2.5" />
        {agent.server.instanceId}
      </span>
    </div>
  )
}
