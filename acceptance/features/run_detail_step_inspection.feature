Feature: Sigil-web standalone run-detail step inspection contracts
  The standalone run-detail page allows operators to select a step and inspect
  its metadata, executed code, action output, and accounting.

  Scenario: Displays step detail in the right content area when a step is selected in the Steps Pane
    Given the standalone run-detail route is open for run "019d1767-410f-7659-8f98-5657c78271de"
    When the operator selects a step in the Steps Pane
    Then the right content area displays the selected step's context pane, code pane, and action output pane

  Scenario: Shows an empty prompt in the right content area when no step is selected
    Given the standalone run-detail route is open for a run with no steps
    Then the right content area displays an empty step-selection prompt

  Scenario: Displays selected step metadata in the Step Context Pane
    Given the standalone run-detail route is open for run "019d1767-410f-7659-8f98-5657c78271de"
    When the operator selects a step in the Steps Pane
    Then the Step Context Pane displays the step number, node ID, status, and duration

  Scenario: Displays action pagination when the selected step has multiple actions
    Given the standalone run-detail route is open for a run with a multi-action step
    When the operator selects the multi-action step
    Then the Step Context Pane displays a pagination control showing the current action index and total action count

  Scenario: Displays syntax-highlighted source code in the Code Pane
    Given the standalone run-detail route is open for run "019d1767-410f-7659-8f98-5657c78271de"
    When the operator selects a step with an action in the Steps Pane
    Then the Code Pane displays the action source code with syntax highlighting

  Scenario: Displays stdout and stderr in the Action Output Pane
    Given the standalone run-detail route is open for run "019d1767-410f-7659-8f98-5657c78271de"
    When the operator selects a step with an action in the Steps Pane
    Then the Action Output Pane displays the action stdout and stderr

  Scenario: Shows an empty state in the code and output panes when the selected step has no actions
    Given the standalone run-detail route is open for run "019d1767-410f-7659-8f98-5657c78271de"
    When the operator selects a step with no actions in the Steps Pane
    Then the code and output panes display an empty state indicating no action was executed

  Scenario: Auto-selects the first step when the run-detail page loads with steps available
    Given the standalone run-detail route is open for run "019d1767-410f-7659-8f98-5657c78271de"
    Then the first step is automatically selected and its detail is displayed

  Scenario: Displays subcall traces in the Action Output Pane when the action has subcalls
    Given the standalone run-detail route is open for a run with subcalls
    When the operator selects the step with subcalls
    Then the Action Output Pane displays the subcall list with index, type, status, and duration

  Scenario: Dynamically updates step status in the Step Context Pane when the selected step completes
    Given the standalone run-detail route is open for an in-progress run
    When the selected step transitions from running to completed
    Then the Step Context Pane updates to reflect the completed status and final duration

  Scenario: Displays run and selected-step accounting in the bottom drawer when available
    Given the standalone run-detail route is open for run "019d1767-410f-7659-8f98-5657c78271de"
    When the operator selects a step in the Steps Pane
    Then the Accounting Drawer displays run-level totals and selected-step totals
    And the Accounting Drawer content is contained in a scroll region
