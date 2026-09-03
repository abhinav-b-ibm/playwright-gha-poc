Feature: API Gateway — Create and Activate API

  @apigw @createApi
  Scenario Outline: Create API from scratch, add resource, save and activate
    When the user creates and activates an API Gateway API for resource path "<resourcePath>" and flow service "<flowServiceName>" with server url "<serverUrl>"
    Then the API Gateway API "<flowServiceName>" should be created and activated successfully

    Examples:
      | flowServiceName   | serverUrl | resourcePath                                                                                                  |
      | flowservice1check |  https://prod167095.a-vir-c2.platform.ipaas.test.automation.ibm.com/integration/rest/external  | integration/run/development/fl90438f49018e44ae909d61ea582591c4/flowservice1 |
