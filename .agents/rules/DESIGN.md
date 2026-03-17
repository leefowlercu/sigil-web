# Design

Paper is the normative visual source for routed UI states in `sigil-web`.
Implementation should move quickly, but the approved routed state must always
normalize back into the scenario manifest and, for Paper-backed scenarios, the
design manifest and Paper artboards.

## Core Workflow

- Update or confirm the owning PRD scenario first.
- Keep `docs/sigil-web/PRD/MATRIX.md`,
  `sigil-web/acceptance/features/web_ui.feature`, and
  `sigil-web/verification/scenarios/manifest.toml` mechanically aligned before
  or alongside implementation.
- Update `sigil-web/verification/design/manifest.toml` whenever a scenario adds,
  removes, or changes Paper evidence.
- Explore one routed state at a time, not an entire screen family at once.
- Prototype quickly in code when that is the fastest way to compare layouts.
- Promote only the selected direction into Paper as the approved artboard.
- Use Paper MCP for visual refinements after a direction is chosen.
- Sync the approved Paper state back into code while preserving required
  `data-testid` values and route semantics.

## Artboard Rules

- Artboards MUST follow the naming pattern
  `<prd>--<scenario-id>--<route-id>--<state-id>--<viewport-id>`.
- The current enforced viewport set is desktop-only unless the design manifest
  changes.
- Temporary exploration variants SHOULD stay out of the design manifest until a
  single direction is selected.
- Approved artboards recorded in the design manifest are the visual source of
  truth for that routed state.
- Mixed behavior-and-design scenarios MAY carry both Vitest evidence in the
  scenario manifest and Paper evidence in the design manifest.

## Working Guidance

- Start with shared shell decisions plus one real routed state, not a purely
  abstract frame.
- Prefer flex and container-driven Paper layouts so generated JSX can be
  normalized back into TanStack Start and ShadCN-friendly code without large
  semantic rewrites.
- Preserve selector contracts even when card hierarchy, spacing, typography, or
  layout changes substantially.
- Treat Paper edits as design steering and code edits as implementation of the
  approved state, not as competing sources of truth.

## Current Route Model

- `/` redirects to `/agents`
- `/agents` owns selected-agent route-state behavior
- `/runs/$runId` remains the reserved run-detail route family for future specs
