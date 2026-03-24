import { useState } from 'react'
import { Cable, Search, Radio, Unplug, PlugZap, Trash2 } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { ScrollArea } from '#/components/ui/scroll-area'
import { Separator } from '#/components/ui/separator'
import type { AgentInstance } from '#/lib/demo-data'
import { CONNECTION_STATE_CONFIG, ConnectionStateDot } from './status-primitives'

/* ------------------------------------------------------------------ */
/*  Agent Card (file-local)                                            */
/* ------------------------------------------------------------------ */

function AgentCard({
  agent,
  isSelected,
  onSelect,
  onDisconnect,
  onReconnect,
  onRemove,
}: {
  agent: AgentInstance
  isSelected: boolean
  onSelect: () => void
  onDisconnect: () => void
  onReconnect: () => void
  onRemove: () => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      data-testid={`sidebar-agent-${agent.id}`}
      className={`group relative flex w-full cursor-pointer flex-col gap-1.5 rounded-lg px-3 py-2.5 text-left transition-all ${
        isSelected
          ? 'bg-(--sigil-accent-soft) ring-1 ring-(--sigil-accent-border)'
          : 'hover:bg-(--surface-hover)'
      }`}
    >
      {/* Active edge indicator -- color matches connection state */}
      {isSelected && (
        <span
          className={`absolute top-2 bottom-2 left-0 w-0.75 rounded-r-full ${CONNECTION_STATE_CONFIG[agent.connectionState].dotClass}`}
        />
      )}

      <div className="flex items-start gap-2">
        {/* Left: name + endpoint */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center gap-2">
            <ConnectionStateDot state={agent.connectionState} />
            <span
              className={`text-sm font-bold tracking-tight ${
                isSelected ? 'text-foreground' : 'text-foreground'
              }`}
            >
              {agent.server.instanceName}
            </span>
          </div>
          <span className="truncate pl-4 font-mono text-xs font-medium text-muted-foreground">
            {agent.endpoint}
          </span>
        </div>

        {/* Right: action buttons stacked */}
        <div className="flex shrink-0 flex-col gap-1">
          {agent.connectionState === 'disconnected' ? (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Reconnect agent"
              className="size-6 text-muted-foreground hover:text-(--connection-ready)"
              onClick={(e) => {
                e.stopPropagation()
                onReconnect()
              }}
            >
              <PlugZap className="size-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Disconnect agent"
              className="size-6 text-muted-foreground hover:text-(--connection-degraded)"
              onClick={(e) => {
                e.stopPropagation()
                onDisconnect()
              }}
            >
              <Unplug className="size-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            title="Remove agent"
            className="size-6 text-muted-foreground hover:text-(--status-failed)"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Agents Pane                                                         */
/* ------------------------------------------------------------------ */

export function AgentsPane({
  agents,
  selectedId,
  onSelect,
  onConnect,
  onDisconnect,
  onReconnect,
  onRemove,
}: {
  agents: AgentInstance[]
  selectedId: string
  onSelect: (id: string) => void
  onConnect: (endpoint: string) => void
  onDisconnect: (agentId: string) => void
  onReconnect: (agentId: string) => void
  onRemove: (agentId: string) => void
}) {
  const [filter, setFilter] = useState('')
  const [connectEndpoint, setConnectEndpoint] = useState('')

  const filtered = agents.filter(
    (a) =>
      a.server.instanceName.toLowerCase().includes(filter.toLowerCase()) ||
      a.endpoint.toLowerCase().includes(filter.toLowerCase()),
  )

  return (
    <aside
      data-testid="agents-pane"
      className="flex w-[320px] shrink-0 flex-col border-r border-(--line) bg-(--sidebar-bg)"
    >
      {/* Sidebar header */}
      <div className="flex flex-col gap-3 px-4 pt-2.5 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-(--sigil-accent-soft)">
            <Radio className="size-3.5 text-(--sigil-accent)" />
          </div>
          <span className="text-sm font-bold text-foreground uppercase">Agent Fleet</span>
          <Badge
            variant="outline"
            className="ml-auto border-border bg-secondary text-[0.58rem] font-bold text-muted-foreground"
          >
            {agents.length}
          </Badge>
        </div>

        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Cable className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ws://host:port"
              value={connectEndpoint}
              onChange={(e) => setConnectEndpoint(e.target.value)}
              className="h-8 border-(--input-border) bg-(--input-bg) pl-8 font-mono text-xs text-(--input-text) placeholder:text-(--input-placeholder) focus-visible:border-(--sigil-accent-focus-border) focus-visible:ring-(--sigil-accent-focus-ring)"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={!connectEndpoint.trim()}
            className="h-8 shrink-0 px-2.5 text-[0.65rem] font-semibold tracking-widest uppercase"
            onClick={() => {
              onConnect(connectEndpoint.trim())
              setConnectEndpoint('')
            }}
          >
            Connect
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter agents..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 border-(--input-border) bg-(--input-bg) pl-8 text-xs text-(--input-text) placeholder:text-(--input-placeholder) focus-visible:border-(--sigil-accent-focus-border) focus-visible:ring-(--sigil-accent-focus-ring)"
          />
        </div>
      </div>

      <Separator className="bg-(--line)" />

      {/* Agent list */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-2">
          {filtered.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={agent.id === selectedId}
              onSelect={() => onSelect(agent.id)}
              onDisconnect={() => onDisconnect(agent.id)}
              onReconnect={() => onReconnect(agent.id)}
              onRemove={() => onRemove(agent.id)}
            />
          ))}

          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No agents match filter.
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
