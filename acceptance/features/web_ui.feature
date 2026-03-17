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

  @PRD-0150
  Scenario: Keeps routed workspaces inside the application shell on supported desktop viewports
    Given the operator opens a routed sigil-web workspace on a desktop viewport at least 1280 CSS pixels wide and 800 CSS pixels tall
    When the application renders the root application shell
    Then the document does not scroll vertically
    And overflowing route content scrolls inside workspace panes

  @PRD-0150
  Scenario: Preserves access below the minimum supported desktop height
    Given the operator opens a routed sigil-web workspace on a viewport shorter than 800 CSS pixels
    When the application applies its compact-height fallback
    Then the operator can still reach primary navigation, primary context, and primary actions

  @PRD-0200
  Scenario: Deep-links the selected agent in the agents route
    Given the application can resolve a valid agent identity
    When the operator opens /agents with an agent search parameter
    Then the application preserves that selected-agent intent in the `/agents` route state
