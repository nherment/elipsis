
function LoginCtrl($scope, $http, $location, $log, $rootScope) {

  $rootScope.logout = function() {
    $log.info("logout")
    socket.emit('unauth:user')
  }

  $scope.login = function() {
    // TODO: spinner
    $rootScope.authenticated = false
    $http.get('/login', {
      email: $scope.email,
      password: $scope.password
    })
    return false
  }

  socket.on('auth:user', function(err) {
    if(err) {
      $rootScope.authenticated = false
      $log.error(err)// TODO: login feedback
    } else {
      $log.info('authenticated')
      $rootScope.authenticated = true
      $location.path('/app/INBOX/ALL')
    }
  })

  $scope.$on('$destroy', function (event) {
    socket.removeAllListeners();
  })
}
