Feature: Sigil Web operator workflows
  Sigil Web provides a browser-based command, control, and orchestration plane
  for the Sigil app-server running in WebSocket mode.

  Background:
    Given the operator has configured a sigil-web app-server endpoint

  @PRD-0100
  Scenario: Connects to a compatible app-server and enters ready operator state
    Given the configured app-server supports the UI protocol version
    When the operator opens sigil-web
    Then the application enters a ready operator state with server identity and protocol details

  @PRD-0100
  Scenario: Blocks the workspace with an incompatible-server state when protocol negotiation fails
    Given the configured app-server does not support the UI protocol version
    When the operator opens sigil-web
    Then the application blocks the workspace with an incompatible-server state and machine-actionable error code

  @PRD-0100
  Scenario: Marks the session degraded and begins reconnecting after a missed heartbeat
    Given the operator is viewing a ready connected workspace
    When the heartbeat window is missed
    Then the application marks the session degraded and begins reconnecting without losing workspace intent

  @PRD-0200
  Scenario: Lists persisted runs after session initialization
    Given the session is ready and the app-server run corpus contains persisted runs
    When the operator opens the run list view
    Then the application lists persisted runs together with current connection context

  @PRD-0200
  Scenario: Paginates the run list without losing current connection context
    Given the session is ready and the run corpus spans multiple pages
    When the operator requests the next page of runs
    Then the application loads the next page without losing current connection context

  @PRD-0200
  Scenario: Shows an empty-state call to action when the run corpus has no runs
    Given the session is ready and the app-server run corpus has no runs
    When the operator opens the run list view
    Then the application shows an empty-state call to action for starting or creating a run

  @PRD-0300
  Scenario: Opens a run detail workspace with summary tree and timeline panes
    Given the session is ready and one persisted run is selected
    When the operator opens the run detail workspace
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
  Scenario: Resumes a live run subscription after reconnect without duplicating applied events
    Given the operator is viewing a live run workspace that already applied canonical events
    When the connection degrades reconnects and resumes the subscription
    Then the application resumes without duplicating already-applied events

  @PRD-0400
  Scenario: Transitions a subscribed run workspace into terminal completed or interrupted state
    Given the operator is viewing a live run workspace for an active run
    When the subscribed run reaches completed or interrupted terminal state
    Then the application transitions the workspace into the matching terminal state and preserves terminal context

  @PRD-0500
  Scenario: Starts a run from an inline YAML composer without requiring server-local file paths
    Given the session is ready and the operator opens the run authoring workflow
    When the operator submits valid inline YAML through the composer
    Then the application starts the run without requiring server-local file paths and moves into the new run context

  @PRD-0500
  Scenario: Validates malformed inline YAML before issuing run start
    Given the session is ready and the operator opens the run authoring workflow
    When the operator enters malformed inline YAML
    Then the application shows validation feedback before issuing run start

  @PRD-0500
  Scenario: Stops an active run and surfaces interrupted terminal state plus stop provenance
    Given the session is ready and the operator is viewing an active run
    When the operator requests run stop and the app-server accepts the stop
    Then the application surfaces interrupted terminal state plus stop provenance
