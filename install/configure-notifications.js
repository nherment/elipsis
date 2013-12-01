
var ConfMgr     = require('./ConfigurationManager.js')
var ConfHandler = require('./ConfigurationHandler.js')
var uuid        = require('uuid')

function configure(IOHelper, callback) {

  var conf = ConfMgr.readConf()

  var appConfig = {
    enabled: true,
    notifOnLogin: true,
    notifOnPwdChange: true,
    niceName: 'the elipsis team',
    adminEmail: 'user@domain.tld'

  }

  if(conf.notifications) {
    if(conf.notifications.enabled) {
      appConfig.enabled = conf.notifications.enabled
    }
    if(conf.notifications.notifOnLogin) {
      appConfig.notifOnLogin = conf.notifications.notifOnLogin
    }
    if(conf.notifications.notifOnPwdChange) {
      appConfig.notifOnPwdChange = conf.notifications.notifOnPwdChange
    }
    if(conf.notifications.niceName) {
      appConfig.niceName = conf.notifications.niceName
    }
    if(conf.notifications.adminEmail) {
      appConfig.adminEmail = conf.notifications.adminEmail
    }
  }

  var opts = {
    title: "Notifications Configuration",
    default: appConfig,
    confirm: true,
    entries: [
      {dataType: 'boolean', attr: 'enabled', message: 'Enable notifications'},
      {dataType: 'boolean', attr: 'notifOnLogin', message: 'Notify user on login'},
      {dataType: 'boolean', attr: 'notifOnPwdChange', message: 'Notify user on password change'},
      {dataType: 'string', attr: 'niceName', message: 'A nice name that ends the email messages'},
      {dataType: 'string', attr: 'adminEmail', message: 'An email to receive admin notifications'}
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