# Standards

Follow the repo's web implementation standards first. This repository is not a
place for ad hoc route, state, or design conventions.

## Required Local Patterns

- Use TanStack Start file routes as the primary workflow boundary.
- Keep `/` as a redirect to `/agents`.
- Keep selected-agent state deep-linkable with the `/agents?agent=<agent-id>`
  search parameter.
- Keep `/runs/$runId` as the dedicated run-detail workspace route.
- Keep session health as one shared application concern rather than
  reimplementing connection state independently per page.
- Keep ShadCN, Lucide, and Tailwind as the implementation palette, not the
  visual source of truth.
- Preserve stable `data-testid` values when iterating on layout or styling.
- Prefer shared client and service layers in `src/lib/` over embedding ad hoc
  protocol or transport logic directly inside route components.
- Commit `src/routeTree.gen.ts` when route structure changes, because the
  router generator owns that file.

## Repo-Specific Expectations

- Keep the `/agents` hub responsible for fleet visibility, selected-agent
  detail, and selected-agent run discovery.
- Keep new-run authoring scoped to a selected-agent dialog in `/agents` until
  the specs say otherwise.
- Keep run-detail inspection, live updates, and stop outcomes in the
  `/runs/$runId` workspace rather than splitting them across multiple pages.
- Preserve current design-manifest route IDs, state IDs, and artboard naming
  conventions unless the superproject specs change them in the same task.

## Source Documents

- Superproject agent rules: `../../AGENTS.md`
- Architecture decisions: `../../docs/sigil-web/ADR/README.md`
- Product requirements: `../../docs/sigil-web/PRD/README.md`
- Paper design contract: `../../sigil-web/design/design-manifest.toml`
