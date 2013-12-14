

elipsisApp.controller('AccountCtrl', function ($rootScope, $scope, $sce, $routeParams, $location, menuService, $log) {

  $log.debug('controller [AccountCtrl]')

  $.get('/audits/0/50')
    .done(function(audits) {
      console.log('audits')
      $('#audits').html('')

      if(audits && audits.length > 0) {
        for(var i = 0 ; i < audits.length ; i++) {

          var row = $('<tr></tr>')

          var date = $('<td>'+audits[i].date+'</td>')
          var ip = $('<td>'+audits[i].ip+'</td>')
          var action = $('<td>'+audits[i].action+'</td>')

          row.append(date)
          row.append(ip)
          row.append(action)

          $('#audits').append(row)
        }
      }
    })
    .fail(function(xhr, status, error) {
      $('#audits').html('' + error)
    })
})
