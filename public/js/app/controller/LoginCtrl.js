
elipsisApp.controller('LoginCtrl', function ($scope, $http, $location, $log, $rootScope) {

  if($location.search().token) {
    $('#sign-in-title').html('Sign in to validate your account')
    $log.info('Account validation')
    $('#activationToken').val($location.search().token)
  }

  if($location.search().email) {
    $('#email').val($location.search().email)
    $('#password').select()
  }

})
