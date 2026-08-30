Feature: WMIO Flow Execution API

  @api @flowExecution
  Scenario Outline: Create project, create flowservice, and execute it
    Given the project named "<projectName>" is deleted if it already exists
    And a project named "<projectName>" is created
    And a flowservice named "<flowserviceName>" is created in project "<projectName>"
    When the flowservice "<flowserviceName>" in project "<projectName>" is executed
    Then the flowservice execution should be successful

    Examples:
      | projectName      | flowserviceName |
      | pivotTestProject | logCustomFlow   |
