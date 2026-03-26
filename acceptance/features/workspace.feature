Feature: Sigil-web root workspace contracts
  The root workspace keeps agent selection, run detail, and fleet visibility
  behavior stable for the current product surface.

  Scenario: Defaults the root workspace selection to the first available agent and reflects it in the agent search param
    Given the demo workspace is open
    Then the selected agent name is "needle-search"
    And the hidden agent search value is "needle_search"

  Scenario: Resolves canonical agent search values with or without the agent_ prefix
    Given the demo workspace is open at "/?agent=needle_search"
    Then the selected agent name is "needle-search"
    Given the demo workspace is open at "/?agent=agent_needle_search"
    Then the selected agent name is "needle-search"

  Scenario: Updates root workspace selection when a different agent card is chosen
    Given the demo workspace is open
    When the user selects agent card "agent_mrcr_2needle"
    Then the selected agent name is "mrcr-2needle"
    And the hidden agent search value is "mrcr_2needle"

  Scenario: Filters agent cards by instance name or endpoint without mutating the underlying fleet
    Given the demo workspace is open
    When the user filters the fleet by "mrcr-4needle"
    Then the visible fleet card count is 1
    And the fleet badge count is 3

  Scenario: Loads the selected run detail in the root workspace when the selected agent has runs
    Given the demo workspace is open
    When the user selects agent card "agent_needle_search"
    Then the root run detail tabs are visible
    And the selected agent workspace shows run "019d1767-410f-7659-8f98-5657c78271de" as "completed"

  Scenario: Shows an empty run-detail prompt when the selected agent has no runs
    Given the demo workspace is open
    When the user connects the demo endpoint "ws://empty-agent.local:8765/app-server"
    And the user selects the agent card named "empty-agent.local"
    Then the runs empty state is visible
    And the root run-detail empty prompt is visible

  Scenario: Opens the selected run in the standalone run-detail route from the root workspace
    Given the demo workspace is open
    When the user selects run "019d1767-410f-7659-8f98-5657c78271de"
    And the user opens the selected run detail route
    Then the browser URL ends with "/runs/019d1767-410f-7659-8f98-5657c78271de"
