import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))

function readSource(relativePath: string) {
  return readFileSync(resolve(currentDir, relativePath), 'utf8')
}

describe('route contract', () => {
  it('generates only the spec-owned hub and run detail routes', () => {
    const routeTreeSource = readSource('./routeTree.gen.ts')

    expect(routeTreeSource).toContain("'/agents'")
    expect(routeTreeSource).toContain("'/runs/$runId'")
    expect(routeTreeSource).not.toContain("'/connect'")
    expect(routeTreeSource).not.toContain("'/runs/new'")
    expect(routeTreeSource).not.toContain("'/runs':")
  })

  it('redirects the root route into the agents hub', () => {
    const indexRouteSource = readSource('./routes/index.tsx')

    expect(indexRouteSource).toContain('Navigate to="/agents"')
  })

  it('preserves selected-agent search state in the agents route', () => {
    const agentsRouteSource = readSource('./routes/agents.tsx')

    expect(agentsRouteSource).toContain("createFileRoute('/agents')")
    expect(agentsRouteSource).toContain('validateSearch:')
    expect(agentsRouteSource).toContain("typeof search.agent === 'string'")
    expect(agentsRouteSource).toContain('search.agent.length > 0')
    expect(agentsRouteSource).toContain('agent?: string')
  })
})
