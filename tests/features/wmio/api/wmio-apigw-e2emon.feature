Feature: E2E API Gateway and Monitoring Verification

  @e2e @monitoring
  Scenario Outline: Execute <apiName> via gateway for <flowserviceName> in <projectName>
    When the user executes API "<apiName>" version "<apiVersion>" for flowservice "<flowserviceName>" in project "<projectName>" and tenant "<wmioURL>" via gateway "<apigwURL>"
    Then the user navigates to E2E monitoring and verifies the transaction for API "<apiName>" and flowservice "<flowserviceName>"

    Examples:
      | apigwURL                                                                   | apiName       | apiVersion | flowserviceName | projectName | wmioURL  |
      | http://prod167095.a-vir-c2.apigw.ipaas.test.automation.ibm.com/gateway/ | invokeTestAPI | 1.0        | testFlow        | Pdo_Project | WMIO_URL |
