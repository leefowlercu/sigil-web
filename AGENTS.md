# AGENTS.md

Siĝil Web is the browser-based command, control, and orchestration plane for
the Siĝil Agent Harness in App Server Mode. This subproject is governed by the
active `docs/sigil-web/` ADR, PRD, and acceptance traceability suite in the
superproject.

## Table of Contents

- [Development Commands](#development-commands)
- [Repository Layout](#repository-layout)
- [Implementation Standards](#implementation-standards)
- [Specifications](#specifications)
- [Testing](#testing)
- [Change Control](#change-control)

## Development Commands

Use the documented local command surface before inventing ad hoc maintenance
flows. Run commands from the `sigil-web/` subproject root unless a document
says otherwise. Prefer the native `vp` command surface over equivalent `pnpm`
script wrappers when both exist.

- [Development Commands Reference](.agents/rules/COMMANDS.md)

## Repository Layout

Use the layout guide to find the route shell, UI primitives, and client-side
service seams before changing code.

- [Repository Layout Reference](.agents/rules/LAYOUT.md)

## Implementation Standards

Follow the local implementation standards for TanStack Start routes, React
state boundaries, Tailwind and ShadCN usage, and selector stability. This keeps
the web UI aligned with the repo's route and design contracts instead of
generic React defaults. This includes writing canonical Tailwind class forms at
authoring time instead of relying on arbitrary-value equivalents when a
canonical utility exists. When a token is exported through `src/styles.css`
`@theme inline`, prefer the named utility such as `text-foreground`,
`text-muted-foreground`, `bg-secondary`, or `border-border`; reserve
`text-(--token)` and similar forms for bespoke repo-local variables such as
`--sigil-accent`, `--surface`, or `--line`.

- [Implementation Standards Reference](.agents/rules/STANDARDS.md)

## Specifications

Treat the superproject `sigil-web` specs as the behavioral source of truth for
this submodule. Use the spec guide to see which ADR, PRD, matrix, and
acceptance files must move together when behavior changes.

- [Specification Reference](.agents/rules/SPECS.md)

## Testing

Use the testing guide to keep fast TypeScript checks separate from browser-first
acceptance coverage. Update the failing contract first, then run the narrowest
relevant verification path before broader suites.

- [Testing Reference](.agents/rules/TESTING.md)

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
- Browser acceptance uses the external `agent-browser` CLI and must not vendor a
  second browser driver inside this repo.
- See [Layout Reference](.agents/rules/LAYOUT.md) for the type hierarchy and
  file responsibilities.
- See [Commands Reference](.agents/rules/COMMANDS.md) for `vp dev` vs
  `vp dev --mode demo`, `pnpm test:unit`, `pnpm test:acceptance`,
  `agent-browser` prerequisites, canonical Tailwind lint/fmt workflows, and
  protocol type regeneration.

## Change Control

Use the change-control guide for repo-boundary, commit, and submodule-pointer
rules. It explains what can be changed locally in `sigil-web/` and which
actions still require explicit user authorization.

- [Change Control Reference](.agents/rules/CHANGES.md)
