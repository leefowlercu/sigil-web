import { Link, createFileRoute } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowRight,
  PlugZap,
  RefreshCcw,
  ShieldCheck,
  Waypoints,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Separator } from '#/components/ui/separator'
import { sessionSummary } from '#/lib/demo-data'

export const Route = createFileRoute('/connect')({
  component: ConnectRoute,
})

function ConnectRoute() {
  return (
    <main className="page-wrap px-4 pb-10 pt-10">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="island-shell rise-in overflow-hidden rounded-[2rem] border-[rgba(23,58,64,0.12)] shadow-[0_24px_54px_rgba(18,43,47,0.12)]">
          <CardHeader className="gap-4 px-7 pt-7 sm:px-9 sm:pt-9">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                data-testid="connection-status"
                className="border border-emerald-400/25 bg-emerald-400/12 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--sea-ink)]"
              >
                <PlugZap className="mr-1 size-3.5" />
                {sessionSummary.status}
              </Badge>
              <span
                data-testid="connection-instance-name"
                className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--sea-ink-soft)]"
              >
                {sessionSummary.instanceName}
              </span>
            </div>
            <div className="space-y-4">
              <p className="island-kicker">Session Bootstrap</p>
              <div className="space-y-3">
                <CardTitle className="display-title max-w-3xl text-4xl leading-[0.98] tracking-tight text-[var(--sea-ink)] sm:text-6xl">
                  Desktop-first command-plane shell for the Sigil app-server.
                </CardTitle>
                <CardDescription className="max-w-2xl text-base leading-7 text-[var(--sea-ink-soft)] sm:text-lg">
                  This route anchors the compatible, incompatible, and
                  reconnecting states defined in the PRDs. It is the operator’s
                  first checkpoint before any run orchestration begins.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 px-7 pb-8 sm:px-9 sm:pb-9">
            <div className="grid gap-4 rounded-[1.5rem] border border-[var(--line)] bg-white/55 p-5 md:grid-cols-3">
              <div>
                <p className="island-kicker mb-2">Endpoint</p>
                <p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">
                  {sessionSummary.endpoint}
                </p>
              </div>
              <div>
                <p className="island-kicker mb-2">Protocol</p>
                <p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">
                  {sessionSummary.protocolVersion}
                </p>
              </div>
              <div>
                <p className="island-kicker mb-2">Config Envelope</p>
                <p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">
                  capabilities.config={sessionSummary.capabilitiesConfig}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" data-testid="runs-nav-link">
                <Link to="/runs">
                  Open run index
                  <Waypoints className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/runs/new">
                  Open inline YAML composer
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card
            className="feature-card rise-in rounded-[1.75rem]"
            style={{ animationDelay: '80ms' }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-emerald-700" />
                <CardTitle className="text-lg text-[var(--sea-ink)]">
                  Compatible session
                </CardTitle>
              </div>
              <CardDescription>
                The workspace unlocks list, detail, and control routes after
                `initialize` and `initialized`.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="feature-card rise-in rounded-[1.75rem]"
            style={{ animationDelay: '150ms' }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="size-5 text-amber-700" />
                <CardTitle className="text-lg text-[var(--sea-ink)]">
                  Incompatible guardrail
                </CardTitle>
              </div>
              <CardDescription>
                Protocol mismatches block the workspace immediately instead of
                retrying in the background.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 p-4">
                <p className="island-kicker mb-2">Example domain code</p>
                <p
                  data-testid="connection-error-code"
                  className="m-0 text-sm font-semibold text-[var(--sea-ink)]"
                >
                  unsupported_protocol_version
                </p>
              </div>
              <Button
                variant="outline"
                className="mt-4 w-full"
                data-testid="retry-connection-button"
              >
                Retry negotiation
              </Button>
            </CardContent>
          </Card>

          <Card
            className="feature-card rise-in rounded-[1.75rem]"
            style={{ animationDelay: '220ms' }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <RefreshCcw className="size-5 text-sky-700" />
                <CardTitle className="text-lg text-[var(--sea-ink)]">
                  Heartbeat recovery
                </CardTitle>
              </div>
              <CardDescription>
                Reconnect keeps the operator oriented around the last meaningful
                route instead of dropping them back at boot.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div
                data-testid="reconnect-banner"
                className="rounded-2xl border border-sky-500/20 bg-sky-500/8 p-4 text-sm text-[var(--sea-ink)]"
              >
                Session degraded. Resume from the last applied sequence after
                the next heartbeat handshake.
              </div>
              <Separator className="my-4" />
              <Button
                variant="secondary"
                className="w-full"
                data-testid="resume-last-route-button"
              >
                Resume last workspace route
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
