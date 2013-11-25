
var ConfMgr     = require('./ConfigurationManager.js')
var ConfHandler = require('./ConfigurationHandler.js')
var uuid        = require('uuid')

function configure(IOHelper, callback) {

  var conf = ConfMgr.readConf()

  var appConfig = {
    notifOnLogin: true,
    notifOnPwdChange: true
  }

  if(conf.notifications) {
    if(conf.notifications.notifOnLogin) {
      appConfig.notifOnLogin = conf.notifications.notifOnLogin
    }
    if(conf.notifications.notifOnPwdChange) {
      appConfig.notifOnPwdChange = conf.notifications.notifOnPwdChange
    }
  }

  var opts = {
    title: "Notifications Configuration",
    default: appConfig,
    confirm: true,
    entries: [
      {dataType: 'boolean', attr: 'notifOnLogin', message: 'Notify user on login'},
      {dataType: 'boolean', attr: 'notifOnPwdChange', message: 'Notify user on password change'}
    ]
  }

  new ConfHandler(opts, IOHelper, function(appConfig) {
    ConfMgr.mergeConf({notifications: appConfig})

    callback()
  })

}

module.exports = {
  configure: configure
}