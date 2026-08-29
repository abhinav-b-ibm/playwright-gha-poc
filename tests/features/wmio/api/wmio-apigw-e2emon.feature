Feature: E2E API Gateway and Monitoring Verification

  @e2e @monitoring
  Scenario Outline: Execute API from API Gateway and verify transaction in E2E monitoring
    When the user executes API "<apiName>" version "<apiVersion>" for flowservice "<flowserviceName>" in project "<projectName>" and tenant "<wmioURL>" via gateway "<apigwURL>"
    Then the user navigates to E2E monitoring and verifies the transaction for API "<apiName>" and flowservice "<flowserviceName>"

    Examples:
      | apigwURL                                                                   | apiName       | apiVersion | flowserviceName | projectName | wmioURL  |
      | http://prod476796.a-vir-s1.apigw.ipaas.preprod.automation.ibm.com/gateway/ | invokeTestAPI | 1.0        | testFlow        | Pdo_Project | WMIO_URL |
