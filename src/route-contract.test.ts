import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'

const currentDir = dirname(fileURLToPath(import.meta.url))

function readSource(relativePath: string) {
  return readFileSync(resolve(currentDir, relativePath), 'utf8')
}

describe('route contract', () => {
  it('generates only the spec-owned root and run detail routes', () => {
    const routeTreeSource = readSource('./routeTree.gen.ts')

    expect(routeTreeSource).toContain("'/': typeof IndexRoute")
    expect(routeTreeSource).toContain("'/runs/$runId'")
    expect(routeTreeSource).not.toContain("'/agents'")
    expect(routeTreeSource).not.toContain("'/connect'")
    expect(routeTreeSource).not.toContain("'/runs/new'")
    expect(routeTreeSource).not.toContain("'/runs':")
  })

  it('renders the primary agent workspace at the root route', () => {
    const indexRouteSource = readSource('./routes/index.tsx')

    expect(indexRouteSource).toContain("createFileRoute('/')")
    expect(indexRouteSource).toContain('data-testid="agents-workspace"')
    expect(indexRouteSource).toContain('data-testid="agents-workspace-scroll-region"')
    expect(indexRouteSource).not.toContain('Navigate to="/agents"')
  })

  it('keeps routed workspaces inside the application shell on supported desktop viewports', () => {
    const rootRouteSource = readSource('./routes/__root.tsx')
    const stylesSource = readSource('./styles.css')

    expect(rootRouteSource).toContain('data-testid="app-shell"')
    expect(rootRouteSource).toContain('data-testid="app-shell-main"')
    expect(stylesSource).toContain('--app-shell-min-height: 800px;')
    expect(stylesSource).toMatch(
      /@media \(min-height: 800px\) \{[\s\S]*body \{[\s\S]*overflow-y: hidden;/,
    )
    expect(stylesSource).toContain('.workspace-scroll-region')
    expect(stylesSource).toContain('overflow: auto;')
  })

  it('preserves access below the minimum supported desktop height', () => {
    const stylesSource = readSource('./styles.css')

    expect(stylesSource).toMatch(
      /@media \(max-height: 799px\) \{[\s\S]*body \{[\s\S]*overflow-y: auto;/,
    )
    expect(stylesSource).toContain('min-height: var(--app-shell-min-height);')
  })

  it('preserves selected-agent search state in the root route', () => {
    const indexRouteSource = readSource('./routes/index.tsx')

    expect(indexRouteSource).toContain('validateSearch:')
    expect(indexRouteSource).toContain("typeof search.agent === 'string'")
    expect(indexRouteSource).toContain('search.agent.length > 0')
    expect(indexRouteSource).toContain("useSearch({ from: '/' })")
    expect(indexRouteSource).toContain("useNavigate({ from: '/' })")
    expect(indexRouteSource).toContain('data-testid="selected-agent-panel"')
    expect(indexRouteSource).toContain('data-testid="agent-search-param"')
  })
})
