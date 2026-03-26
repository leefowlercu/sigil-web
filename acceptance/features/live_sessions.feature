Feature: Sigil-web live app-server session contracts
  Live mode reflects app-server session state and run notifications through the
  browser workspace.

  Scenario: Connects a live agent endpoint only after initialize resolves a canonical Agent Instance ID
    Given sigil-web is running in live mode
    And the mock live agent initialize response is delayed
    When the user connects the mock live agent endpoint
    Then the visible fleet card count is 0
    When the mock live agent initialize response resumes
    Then the live agent named "live-agent" becomes ready

  Scenario: Marks a live agent session degraded after missed heartbeats and recovers on reconnect
    Given sigil-web is running in live mode
    When the user connects the mock live agent endpoint
    Then the live agent named "live-agent" becomes ready
    When heartbeats stop for the live agent
    Then the live agent named "live-agent" becomes degraded
    When heartbeats resume and the user reconnects the degraded live agent
    Then the live agent named "live-agent" becomes ready

  Scenario: Applies live runs snapshot and run status notifications to the selected agent workspace
    Given sigil-web is running in live mode
    When the user connects the mock live agent endpoint
    Then the live agent named "live-agent" becomes ready
    And the selected agent workspace shows run "019d2000-0000-7000-8000-000000000001" as "running"
    When the mock live run completes
    Then the selected agent workspace shows run "019d2000-0000-7000-8000-000000000001" as "completed"

  Scenario: Removes a live agent session from the fleet when the operator requests removal
    Given sigil-web is running in live mode
    When the user connects the mock live agent endpoint
    Then the live agent named "live-agent" becomes ready
    When the user removes the live agent session
    Then the fleet no longer shows the live agent named "live-agent"

  Scenario: Rejects a duplicate live agent connection that resolves to an already-visible Agent Instance ID
    Given sigil-web is running in live mode
    When the user connects the mock live agent endpoint
    Then the live agent named "live-agent" becomes ready
    When the user connects the mock live agent endpoint
    Then the visible fleet card count is 1
    And the selected agent name is "live-agent"
    And a warning toast says "Agent with ID \"live-agent\" is already connected. Duplicate Agent ID connections are not supported."
