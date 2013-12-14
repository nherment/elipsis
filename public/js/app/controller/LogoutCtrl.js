
elipsisApp.controller('LogoutCtrl', function ($scope, $http, $location, $log, $rootScope) {

  $.get('/logout')
    .done(function() {
      window.location.url = '/'
    })

})
