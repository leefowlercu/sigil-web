# Standards

Follow the repo's web implementation standards first. This repository is not a
place for ad hoc route, state, or design conventions.

## Required Local Patterns

- Use TanStack Start file routes as the primary workflow boundary.
- Keep `/` as the primary operator workspace route.
- Keep selected-agent state deep-linkable with the `/?agent=<agent-id>`
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
- Write Tailwind utilities in canonical form at authoring time whenever
  Tailwind provides one.
- Prefer named theme utilities when the token is exported through
  `src/styles.css` `@theme inline`, for example `bg-background`,
  `text-foreground`, `bg-secondary`, `text-muted-foreground`,
  `border-border`, and `ring-ring`.
- Prefer CSS-variable shorthands like `bg-(--token)`, `text-(--token)`, and
  `border-(--token)` over `bg-[var(--token)]`, `text-[var(--token)]`, and
  `border-[var(--token)]`.
- Reserve `bg-(--token)`, `text-(--token)`, `border-(--token)`, and
  `ring-(--token)` for bespoke repo-local variables that are not exported as
  Tailwind theme utilities, for example `--sigil-accent`, `--surface`,
  `--surface-strong`, `--line`, and the run-status or connection-status
  tokens.
- Prefer canonical spacing and sizing utilities over arbitrary equivalents when
  they are exact matches, for example `mr-1` over `mr-[4px]`, `py-1.75` over
  `py-[7px]`, and `tracking-widest` over `tracking-[0.1em]`.
- Treat `vp fmt --write` as the canonical class-sorting path and
  `vp lint --fix --fix-suggestions` as the canonical Tailwind class rewrite
  path after broad styling edits.
- Treat VSCode Tailwind CSS `suggestCanonicalClasses` diagnostics as required
  style-review feedback even when `vp lint --fix --fix-suggestions` leaves a
  class unchanged; theme-alias rewrites such as `text-(--foreground)` to
  `text-foreground` may still require manual cleanup.

## Repo-Specific Expectations

- Keep the root route responsible for fleet visibility, selected-agent detail,
  and selected-agent run discovery.
- Keep new-run authoring scoped to a selected-agent dialog in the root route
  workspace until the specs say otherwise.
- Keep run-detail inspection, live updates, and stop outcomes in the
  `/runs/$runId` workspace rather than splitting them across multiple pages.
- Preserve current scenario-manifest route IDs and state IDs plus
  design-manifest paper-artboard naming conventions unless the superproject
  specs change them in the same task.

## Source Documents

- Superproject agent rules: `../../AGENTS.md`
- Architecture decisions: `../../docs/sigil-web/ADR/README.md`
- Product requirements: `../../docs/sigil-web/PRD/README.md`
- Scenario contract: `../../sigil-web/verification/scenarios/manifest.toml`
- Paper design contract: `../../sigil-web/verification/design/manifest.toml`
