import { Link } from '@tanstack/react-router'
import { Compass, FileStack, PlugZap, Radar, Waypoints } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { sessionSummary } from '#/lib/demo-data'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4">
        <h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
          <Link
            to="/connect"
            className="inline-flex items-center gap-3 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-2 text-sm text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(79,184,178,0.95),rgba(47,106,74,0.9))] text-white">
              <Radar className="size-4" />
            </span>
            <span className="flex flex-col text-left leading-tight">
              <span className="text-sm font-semibold tracking-tight">
                Sigil Web
              </span>
              <span className="text-[0.68rem] font-medium uppercase tracking-[0.22em] text-[var(--sea-ink-soft)]">
                Command Plane
              </span>
            </span>
          </Link>
        </h2>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <div className="hidden items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:flex">
            <Badge
              variant="secondary"
              data-testid="connection-status"
              className="border border-emerald-400/30 bg-emerald-400/12 text-[var(--sea-ink)]"
            >
              <PlugZap className="size-3.5" />
              {sessionSummary.status}
            </Badge>
            <span
              data-testid="connection-instance-name"
              className="text-xs font-semibold tracking-[0.18em] text-[var(--sea-ink-soft)] uppercase"
            >
              {sessionSummary.instanceName}
            </span>
          </div>
          <ThemeToggle />
        </div>

        <div className="order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-2 pb-1 text-sm font-semibold sm:order-2 sm:w-auto sm:flex-nowrap sm:pb-0">
          <Link
            to="/connect"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Compass className="size-4" />
              Connect
            </span>
          </Link>
          <Link
            to="/runs"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Waypoints className="size-4" />
              Runs
            </span>
          </Link>
          <Link
            to="/runs/new"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            <span className="inline-flex items-center gap-1.5">
              <FileStack className="size-4" />
              New Run
            </span>
          </Link>
        </div>
      </nav>
    </header>
  )
}
