import type { ReactNode } from 'react'
import { Bot } from 'lucide-react'
import { Separator } from '#/components/ui/separator'
import type { AgentInstance } from '#/lib/demo-data'
import { ConnectionStateBadge } from './status-primitives'

type AgentContextPaneProps = {
  agent: AgentInstance
  action?: ReactNode
}

export function AgentContextPane({ agent, action }: AgentContextPaneProps) {
  return (
    <div
      data-testid="agent-context-pane"
      className="flex shrink-0 items-center gap-3 border-b border-(--line) bg-(--workspace-bg) py-2.5 pr-3 pl-4"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex shrink-0 items-center gap-3">
          <span className="flex size-7 items-center justify-center rounded-md bg-(--sigil-accent-soft)">
            <Bot className="size-3.5 text-(--sigil-accent)" />
          </span>
          <span data-testid="selected-agent-name" className="text-sm font-bold tracking-tight text-foreground">
            {agent.server.instanceName}
          </span>
        </div>

        <Separator orientation="vertical" className="h-4 shrink-0" />

        <div className="shrink-0">
          <ConnectionStateBadge state={agent.connectionState} />
        </div>

        <Separator orientation="vertical" className="h-4 shrink-0" />

        <div className="min-w-0 flex-1">
          <span className="block truncate font-mono text-[0.62rem] font-medium text-muted-foreground">
            {agent.endpoint}
          </span>
        </div>
      </div>

      {action ? <div className="ml-auto flex shrink-0 items-center">{action}</div> : null}
    </div>
  )
}
