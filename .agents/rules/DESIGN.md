# Design

Paper is the normative visual source for routed UI states in `sigil-web`.
Implementation should move quickly, but the approved routed state must always
normalize back into the design manifest and Paper artboards.

## Core Workflow

- Update or confirm the owning PRD scenario first.
- Keep `docs/sigil-web/PRD/MATRIX.md`,
  `sigil-web/acceptance/features/web_ui.feature`, and
  `sigil-web/design/design-manifest.toml` mechanically aligned before or
  alongside implementation.
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
- Approved artboards in the manifest are the visual source of truth for that
  routed state.

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
- `/agents` is the command hub for connection posture, fleet visibility,
  selected-agent detail, selected-agent runs, and new-run dialog flows
- `/runs/$runId` is the dedicated run-detail workspace
