# Layout

This submodule follows a small TanStack Start application layout with routed
workflows under `src/routes/`, shared UI primitives under `src/components/`,
and routed-state governance in checked-in design and acceptance artifacts.

## Top-Level Directories

- `src/routes/`: TanStack Start file-routed workflows and application shell.
- `src/components/`: shared app chrome and non-route-specific React components.
- `src/features/`: routed workflow composition and feature-owned UI that is not
  shared across unrelated routes.
- `src/components/ui/`: ShadCN-derived UI primitives.
- `src/features/agents-workspace/`: feature-owned components for the root route
  agent workspace and embedded run inspection surfaces.
- `src/lib/`: client-side types, data access, protocol bindings, and helpers.
- `public/`: static assets served by Vite and TanStack Start.
- `verification/scenarios/`: the checked-in routed scenario registry and
  evidence lanes.
- `verification/design/`: the checked-in Paper-backed visual contract for
  scenarios with Paper evidence.
- `acceptance/features/`: Gherkin feature source of truth for web behavior.
- `.tanstack/`: generated framework state and temp files that should remain out
  of commits.
- `dist/`: generated production build output that should remain out of commits.

## Data and Type Layer (`src/lib/`)

- `protocol/`: versioned protocol type system. All imports use `#/lib/protocol`
  (the barrel `index.ts`), never internal paths.
  - `current.generated.ts`: canonical TypeScript interfaces generated from the
    `sigil` Go binary via `sigil app-server generate-ts`. This file is the
    single source of truth for the current protocol version's wire types. Do
    not edit by hand; regenerate when upstream protocol types change.
  - `adapter.ts`: the `ProtocolAdapter` interface that defines how wire data
    from any supported version is transformed into the current type shapes.
  - `adapters/v1alpha1.ts`: adapter for `sigil.appserver.v1alpha1` (identity
    adapter while v1alpha1 is current).
  - `negotiate.ts`: selects the correct adapter for a given protocol version
    string and exports the list of supported versions.
  - `index.ts`: barrel that re-exports all generated types, constants, the
    adapter interface, and the negotiation function.
- `demo-data.ts`: client-side type definitions (`AgentInstance`, `RunState`,
  `ConnectionState`, `RunDetailView`) and seeded demo data for UI development.
  Client-side types wrap or compose protocol types where appropriate. Demo data
  values use canonical wire-type shapes with realistic UUIDv7 IDs, ISO-8601
  timestamps, and canonical enum values.
- `data.ts`: data-access module that gates demo data behind the
  `VITE_DATA_SOURCE` environment variable. All route and component code imports
  data values from this module, never from `demo-data.ts` directly. Type-only
  imports may reference `demo-data.ts` for client-side type definitions.
- `demo-data.test.ts`: Vitest assertions for demo data structural invariants.

## Protocol Version Strategy

Sigil-web supports simultaneous connections to agent instances running
different protocol versions. The version adapter pattern keeps version
awareness out of UI components:

1. **Current generated types** (`protocol/current.generated.ts`) are the
   canonical internal representation. Components only see these types.
2. **Version adapters** (`protocol/adapters/`) transform wire data from older
   protocol versions into the current shapes. Each adapter is a pure function
   mapping: older wire shape in, current type out.
3. **Negotiation** (`protocol/negotiate.ts`) selects the correct adapter at
   connection time based on the `protocolVersion` in `InitializeResult`. All
   data flowing through that connection passes through the adapter before
   reaching components.
4. **Adding a new version**: generate updated `current.generated.ts` from the
   new `sigil` binary, then write an adapter for the previous version that maps
   old shapes into the new types. Update the adapter registry in
   `negotiate.ts`.
5. **Dropping an old version**: remove its adapter file and registry entry.

## Type Hierarchy

Protocol wire types flow from `sigil` into `sigil-web` through a clear
hierarchy:

1. **Generated protocol types** (`protocol/current.generated.ts`): owned by the
   `sigil` Go binary. Interfaces like `RunSummaryView`, `RunProjectionView`,
   `EventEnvelopeView`, `RunStepSummaryView`, `RunNodeProjectionView`,
   `InitializeResult`, and the `AppServerMethodMap` are the canonical wire
   shapes.
2. **Client-side domain types** (`demo-data.ts`): types that model client
   concerns not present in the protocol. `AgentInstance` wraps
   `InitializeResult` with client-managed fields (`id`, `endpoint`,
   `connectionState`). `RunDetailView` composes data from three separate
   protocol RPCs (`run/read`, `run/events/read`, `run/steps/list`) into a
   single view. `RunState` and `ConnectionState` are client-side enum aliases.
3. **Components** consume protocol types directly for display and client-side
   types for domain modeling. Never fabricate fields that do not exist in the
   wire types.

## Agents Workspace Components (`src/features/agents-workspace/`)

- `agents-pane.tsx`: `AgentsPane` (exported) + `AgentCard` (file-local).
  Manages the agent fleet sidebar with connect, filter, and agent selection.
- `agent-context-pane.tsx`: `AgentContextPane` (exported). Displays selected
  agent identity, connection state, endpoint, and instance ID.
- `runs-pane.tsx`: `RunsPane` (exported) + `RunCard` (file-local). Displays the
  run list for the selected agent with state, timestamps, and source.
- `run-detail-pane.tsx`: `RunDetailPane` (exported) + `MetaRow` (file-local).
  Tabbed detail view with Timeline, Nodes, Steps, and Meta tabs.
- `status-primitives.tsx`: shared status and connection-state display
  components (`StateDot`, `StateBadge`, `StateIcon`, `ConnectionStateDot`,
  `ConnectionStateBadge`) and their configuration records.

## Working Guidance

- Start from `src/routes/` when changing user-visible workflow behavior.
- Start from `src/features/` when changing route-owned workflow UI such as the
  root agent workspace or embedded run detail panes.
- Start from `src/components/` when changing shared shell, navigation, or
  reusable visual composition.
- Start from `src/lib/` when introducing shared client state, query helpers, or
  generated app-server type boundaries.
- Start from `protocol.generated.ts` (via `sigil app-server generate-ts`) when
  upstream protocol types change; then update client-side types and demo data
  to match.
- Start from `verification/scenarios/manifest.toml` when routed scenario
  identity, fixtures, or verification lanes change.
- Start from `verification/design/manifest.toml` when Paper artboard mappings,
  viewport requirements, or required `data-testid` values change.
- Start from `acceptance/features/web_ui.feature` when behavior is
  acceptance-driven or route-state wording changes.
