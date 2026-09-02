Feature: E2E Monitoring — Search and verify transaction status

  @e2emonitoring @dashboard
  Scenario Outline: Search for API in E2E Monitoring dashboard and verify status
    When the user searches for "<apiName>" in the E2E monitoring dashboard
    Then the E2E monitoring transaction status for "<apiName>" should be pass or failed

    Examples:
      | apiName  |
      | PlaywrightAPI_1787772907776 |
