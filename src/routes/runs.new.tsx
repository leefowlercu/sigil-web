import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { FilePenLine, Sparkles } from 'lucide-react'
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
import { Textarea } from '#/components/ui/textarea'

export const Route = createFileRoute('/runs/new')({
  component: RunComposerRoute,
})

const starterYaml = `prompt: Investigate the latest control-plane regression
context: |
  Focus on websocket reconnect semantics and design-manifest parity.
llm:
  provider: openai
  model: gpt-5.4
`

function RunComposerRoute() {
  const [yaml, setYaml] = useState(starterYaml)
  const isInvalid = !yaml.includes('prompt:') || !yaml.includes('llm:')

  return (
    <main className="page-wrap px-4 pb-10 pt-10">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="island-shell rise-in rounded-[2rem]">
          <CardHeader className="gap-4">
            <div className="flex items-center gap-3">
              <Badge className="border border-[rgba(50,143,151,0.22)] bg-[rgba(79,184,178,0.12)] text-[var(--sea-ink)]">
                <FilePenLine className="mr-1 size-3.5" />
                Inline YAML
              </Badge>
              <Badge variant="outline">No server-local file paths</Badge>
            </div>
            <div>
              <p className="island-kicker mb-2">Run Authoring</p>
              <CardTitle className="display-title text-4xl text-[var(--sea-ink)] sm:text-5xl">
                Launch runs directly from the operator workspace.
              </CardTitle>
              <CardDescription className="mt-3 max-w-2xl text-base leading-7 text-[var(--sea-ink-soft)]">
                The bootstrap composer keeps the source-of-truth inline and
                exposes the PRD’s validation and provenance expectations early.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Textarea
              data-testid="run-composer-editor"
              value={yaml}
              onChange={(event) => setYaml(event.target.value)}
              className="min-h-[26rem] resize-y rounded-[1.5rem] border-[var(--line)] bg-white/65 p-5 font-mono text-sm leading-6 shadow-none"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                data-testid="start-run-button"
                disabled={isInvalid}
                size="lg"
              >
                Start run
              </Button>
              <p className="text-sm text-[var(--sea-ink-soft)]">
                Bootstrap note: this route is wired for inline YAML only.
              </p>
            </div>
            {isInvalid ? (
              <div
                data-testid="composer-validation-error"
                className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-[var(--sea-ink)]"
              >
                Include both <code>prompt:</code> and <code>llm:</code> blocks
                before issuing run start.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card
            className="feature-card rise-in rounded-[1.75rem]"
            style={{ animationDelay: '120ms' }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <Sparkles className="size-5 text-[var(--lagoon-deep)]" />
                <CardTitle className="text-lg text-[var(--sea-ink)]">
                  Template variables
                </CardTitle>
              </div>
              <CardDescription>
                The first bootstrap stays inline, but it still reserves a place
                for template variables and future prompt composition controls.
              </CardDescription>
            </CardHeader>
            <CardContent
              data-testid="template-vars-panel"
              className="space-y-3"
            >
              {[
                'workspace=project-sigil',
                'transport=websocket',
                'mode=control-plane',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-[var(--line)] bg-white/60 px-3 py-2 text-sm font-medium text-[var(--sea-ink)]"
                >
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card
            className="feature-card rise-in rounded-[1.75rem]"
            style={{ animationDelay: '200ms' }}
          >
            <CardHeader>
              <p className="island-kicker">Validation watch</p>
              <CardTitle className="text-lg text-[var(--sea-ink)]">
                Compose-ready, not file-path driven
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-[var(--sea-ink-soft)]">
              <p>
                The PRD requires the web UI to start runs without assuming any
                server-local config path. Inline YAML keeps that contract
                visible.
              </p>
              <Separator />
              <p className="m-0">
                Next step after bootstrap: wire this surface to{' '}
                <code>run/start</code> with fixture-backed acceptance coverage.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
