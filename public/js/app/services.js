'use strict'

/* Services */

elipsisApp.factory('menuService', function($rootScope) {
  var sharedService = {}

  sharedService.message = ''

  sharedService.prepForBroadcast = function(msg) {
    this.message = msg
    this.broadcastItem()
  }

  sharedService.broadcastItem = function() {
    $rootScope.$broadcast('handleBroadcast')
  }

  return sharedService
})
