Feature: Sigil Web operator workflows
  Sigil Web provides a browser-based command, control, and orchestration plane
  for the Sigil app-server running in WebSocket mode.

  Background:
    Given the operator has configured a sigil-web app-server endpoint

  @PRD-0100
  Scenario: Redirects the root route to the agents hub
    Given the operator opens sigil-web at the root route
    When the application resolves the initial route
    Then the application redirects the operator to `/agents`

  @PRD-0200
  Scenario: Deep-links the selected agent in the agents route
    Given the application can resolve a valid agent identity
    When the operator opens /agents with an agent search parameter
    Then the application preserves that selected-agent intent in the `/agents` route state
