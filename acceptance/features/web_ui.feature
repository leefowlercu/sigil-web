Feature: Sigil Web operator workflows
  Sigil Web provides a browser-based command, control, and orchestration plane
  for the Sigil app-server running in WebSocket mode.

  Background:
    Given the operator has configured a sigil-web app-server endpoint

  @PRD-0100
  Scenario: Renders the primary agent workspace at the root route
    Given the operator opens sigil-web at the root route
    When the application resolves the initial route
    Then the application renders the primary agent workspace without redirecting the operator to another route

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

  @PRD-0100
  Scenario: Deep-links the selected agent in the root route
    Given the application can resolve a valid agent identity
    When the operator opens / with an agent search parameter
    Then the application preserves that selected-agent intent in the `/` route state

  @PRD-0300
  Scenario: Auto-follows the latest event while a live run detail timeline is pinned to the bottom
    Given the operator is viewing a live run detail timeline at its latest event
    When new live run events append to the timeline
    Then the timeline keeps the latest event visible without additional operator input

  @PRD-0300
  Scenario: Shows a centered scroll-to-bottom control and resumes follow when the operator has scrolled away from the latest live event
    Given the operator is viewing an overflowing live run detail timeline above its latest event
    When the operator has scrolled away from the bottom of the timeline
    Then the timeline shows a centered floating `Scroll to bottom` control near the bottom of the pane
    And activating that control returns the timeline to the latest event
    And the timeline resumes automatic live following for subsequent appended events
