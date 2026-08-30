Feature: WMIO User Login

  @smoke @login
  Scenario: User can log in to wmio with username, password and Google Authenticator
    Given the user navigates to the wmio login page
    When the user enters credentials and completes authenticator verification
    Then the user should be logged in and redirected away from the login page
