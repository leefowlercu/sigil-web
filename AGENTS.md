# AGENTS.md

Siĝil Web is the browser-based command, control, and orchestration plane for
the Siĝil Agent Harness in App Server Mode. This subproject contains the production web
implementation that must stay aligned with the `docs/sigil-web/` ADR, PRD, and
acceptance traceability contracts in the superproject.

## Table of Contents

- [Development Commands](#development-commands)
- [Repository Layout](#repository-layout)
- [Implementation Standards](#implementation-standards)
- [Design Workflow](#design-workflow)
- [Specifications](#specifications)
- [Testing](#testing)
- [Change Control](#change-control)

## Development Commands

Use the documented local command surface before inventing ad hoc frontend or
verification flows. Run commands from the `sigil-web/` subproject root unless a
document says otherwise.

- [Development Commands Reference](.agents/rules/COMMANDS.md)

## Repository Layout

Use the layout guide to find the route shell, UI primitives, client-side
service seams, acceptance artifacts, and Paper design contract before changing
code.

- [Repository Layout Reference](.agents/rules/LAYOUT.md)

## Implementation Standards

Follow the local implementation standards for TanStack Start routes, React
state boundaries, Tailwind and ShadCN usage, and selector stability. This keeps
the web UI aligned with the repo's route and design contracts instead of
generic React defaults.

- [Implementation Standards Reference](.agents/rules/STANDARDS.md)

## Protocol Types and Data

Use the protocol and data guide to understand how upstream `sigil` app-server
wire types flow into `sigil-web`, where client-side domain types are defined,
and how to run the application with or without demo data.

- Protocol types are generated from the `sigil` binary and must not be edited
  by hand.
- Client-side types wrap or compose protocol types for domain modeling; they
  never fabricate fields absent from the wire types.
- Data values are gated behind `VITE_DATA_SOURCE` and accessed through
  `src/lib/data.ts`.
- See [Layout Reference](.agents/rules/LAYOUT.md) for the type hierarchy and
  file responsibilities.
- See [Commands Reference](.agents/rules/COMMANDS.md) for `pnpm dev` vs
  `pnpm dev:demo` and protocol type regeneration.

## Design Workflow

Use the design workflow guide when changing routed UI states or iterating on
Paper prototypes. It explains how PRDs, the scenario manifest, the design
manifest, Paper artboards, and implementation should move together.

- [Design Workflow Reference](.agents/rules/DESIGN.md)

## Specifications

Treat the superproject specs as the behavioral source of truth for this
submodule. Use the spec guide to see which ADR, PRD, matrix, acceptance, and
manifest files must move together when behavior changes.

- [Specification Reference](.agents/rules/SPECS.md)

## Testing

Use the testing guide to keep implementation checks, spec verification, and the
future browser acceptance lanes separate and deterministic. Update the failing
contract first, then run the smallest relevant verification path before broader
suites.

- [Testing Reference](.agents/rules/TESTING.md)

## Change Control

Use the change-control guide for repo-boundary, commit, and submodule-pointer
rules. It explains what can be changed locally in `sigil-web/` and which
actions still require explicit user authorization.

- [Change Control Reference](.agents/rules/CHANGES.md)
