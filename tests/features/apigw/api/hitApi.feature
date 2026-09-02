Feature: API Gateway — Hit API Endpoint

  @apigw @hitApi
  Scenario Outline: Navigate to API detail page, read URL from DOM and POST to endpoint
    When the user hits the API Gateway endpoint from page "<apiPageUrl>"
    Then the API endpoint should return a valid HTTP response

    Examples:
      | apiPageUrl |
      | https://prod476796.a-vir-s1.apigw.ipaas.preprod.automation.ibm.com/apigatewayui/#/api/REST:56403b87-dfa5-4a2f-8817-16fea2335b42/viewrest |
