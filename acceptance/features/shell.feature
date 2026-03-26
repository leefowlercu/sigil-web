Feature: Sigil-web shell and route surface contracts
  The sigil-web application shell remains stable across the current route
  surface while the standalone run-detail route is still placeholder-only.

  Scenario: Wraps the root agent workspace route in the shared sigil-web application shell
    Given the demo workspace is open
    Then the page exposes the shared application shell
    And the root agent workspace route is visible

  Scenario: Preserves the shared sigil-web application shell on the standalone run-detail route
    Given the standalone run-detail route is open for run "019d1767-410f-7659-8f98-5657c78271de"
    Then the page exposes the shared application shell
    And the standalone run-detail placeholder workspace is visible

  Scenario: Exposes the standalone run-detail route as a placeholder workspace frame
    Given the standalone run-detail route is open for run "019d1767-410f-7659-8f98-5657c78271de"
    Then the standalone run-detail placeholder workspace is visible
