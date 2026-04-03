Feature: Sigil-web standalone run-detail page contracts
  The standalone run-detail page renders a Steps Pane that shows all run steps
  with depth-based indentation, a live step count, and dynamic updates for
  in-progress runs.

  Scenario: Shows all run steps from the root node and all descendant nodes in the run-detail Steps Pane
    Given the standalone run-detail route is open for run "019d1767-410f-7659-8f98-5657c78271de"
    Then the run-detail Steps Pane is visible
    And the Steps Pane displays steps from the root node and all descendant nodes

  Scenario: Indents run-detail steps based on their node depth in the run tree
    Given the standalone run-detail route is open for run "019d1767-410f-7659-8f98-5657c78271de"
    Then root-node steps render at indentation level 0
    And descendant-node steps render at indentation levels matching their node depth

  Scenario: Displays the current step count in the run-detail Steps Pane header badge
    Given the standalone run-detail route is open for run "019d1767-410f-7659-8f98-5657c78271de"
    Then the Steps Pane header badge shows the total number of steps displayed

  Scenario: Dynamically appends new steps and updates the header count for an in-progress run in the run-detail Steps Pane
    Given the standalone run-detail route is open for an in-progress run
    When new steps are appended during execution
    Then the Steps Pane appends the new steps
    And the Steps Pane header badge count updates to reflect the current total
