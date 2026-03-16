Feature: Sigil Web operator workflows
  Sigil Web provides a browser-based command, control, and orchestration plane
  for the Sigil app-server running in WebSocket mode.

  Background:
    Given the operator has configured a sigil-web app-server endpoint

  @PRD-0100
  Scenario: Connects to a compatible app-server and enters a ready agents hub state
    Given the configured app-server supports the UI protocol version
    When the operator opens sigil-web
    Then the application enters a ready agents hub state with server identity and protocol details

  @PRD-0100
  Scenario: Blocks the agents hub with an incompatible-server state when protocol negotiation fails
    Given the configured app-server does not support the UI protocol version
    When the operator opens sigil-web
    Then the application blocks the agents hub with an incompatible-server state and machine-actionable error code

  @PRD-0100
  Scenario: Marks the session degraded and begins reconnecting without discarding current agent selection intent
    Given the operator is viewing a ready connected agents hub
    When the heartbeat window is missed
    Then the application marks the session degraded and begins reconnecting without losing current agent selection intent

  @PRD-0200
  Scenario: Lists connected agents in the command hub after session initialization
    Given the session is ready and the app-server exposes connected agents
    When the operator opens the agents hub
    Then the application lists connected agents together with current connection context

  @PRD-0200
  Scenario: Deep-links the selected agent in the agents hub and shows its details plus runs
    Given the session is ready and multiple connected agents are available
    When the operator opens /agents with an agent search parameter
    Then the application selects that agent in the hub and shows its details plus runs

  @PRD-0200
  Scenario: Shows a fleet empty state when no agents are connected to the app-server
    Given the session is ready and no agents are connected to the app-server
    When the operator opens the agents hub
    Then the application shows a fleet empty state with a clear next action

  @PRD-0300
  Scenario: Opens a run detail workspace from the agents hub with summary tree and timeline panes
    Given the session is ready and one selected-agent run is selected
    When the operator opens the run detail workspace from the agents hub
    Then the application shows summary tree and timeline panes for that run in one workspace

  @PRD-0300
  Scenario: Selects a node step and typed artifact without leaving the current run workspace
    Given the operator is viewing a run detail workspace with node and step data
    When the operator selects a node step and typed artifact
    Then the application shows the selected detail without leaving the current run workspace

  @PRD-0300
  Scenario: Refreshes run detail data without losing the current selection context
    Given the operator is viewing a run detail workspace with an active selection
    When the operator refreshes run detail data
    Then the application preserves the current selection context when that data remains valid

  @PRD-0400
  Scenario: Attaches a live run workspace to canonical subscription updates
    Given the session is ready and one selected run is still active
    When the operator attaches the run detail workspace to live updates
    Then the application applies canonical subscription updates within that workspace as the run progresses

  @PRD-0400
  Scenario: Resumes a live run workspace after reconnect without duplicating applied events
    Given the operator is viewing a live run workspace that already applied canonical events
    When the connection degrades reconnects and resumes the subscription
    Then the application resumes without duplicating already-applied events

  @PRD-0400
  Scenario: Transitions a subscribed run workspace into terminal completed or interrupted state
    Given the operator is viewing a live run workspace for an active run
    When the subscribed run reaches completed or interrupted terminal state
    Then the application transitions the workspace into the matching terminal state and preserves terminal context

  @PRD-0500
  Scenario: Starts a run for the selected agent from an agents-hub dialog without requiring server-local file paths
    Given the session is ready and a connected agent is selected in the agents hub
    When the operator opens the new-run dialog and submits valid inline YAML through the composer
    Then the application starts the run without requiring server-local file paths and moves into the new run context

  @PRD-0500
  Scenario: Validates malformed inline YAML in the selected agent's new run dialog before issuing run start
    Given the session is ready and a connected agent is selected in the agents hub
    When the operator opens the new-run dialog and enters malformed inline YAML
    Then the application shows validation feedback before issuing run start

  @PRD-0500
  Scenario: Stops an active run and surfaces interrupted terminal state plus stop provenance
    Given the session is ready and the operator is viewing an active run
    When the operator requests run stop and the app-server accepts the stop
    Then the application surfaces interrupted terminal state plus stop provenance
