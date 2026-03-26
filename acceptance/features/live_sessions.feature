Feature: Sigil-web live app-server session contracts
  Live mode reflects app-server session state and run notifications through the
  browser workspace.

  Scenario: Connects a live agent endpoint and exposes a ready agent session in the fleet
    Given sigil-web is running in live mode
    When the user connects the mock live agent endpoint
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
