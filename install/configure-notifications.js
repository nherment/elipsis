
var ConfMgr     = require('./ConfigurationManager.js')
var ConfHandler = require('./ConfigurationHandler.js')
var uuid        = require('uuid')

function configure(IOHelper, callback) {

  var conf = ConfMgr.readConf()

  var appConfig = {
    enabled: false,
    smtpHost: 'localhost',
    smtpPort: 587,
    smtpSecure: true,
    smtpUser: '',
    smtpPass: '',
    notifOnLogin: true,
    notifOnPwdChange: true
  }

  if(conf.notifications) {
    if(conf.notifications.enabled) {
      appConfig.enabled = conf.notifications.enabled
    }
    if(conf.notifications.smtpHost) {
      appConfig.smtpHost = conf.notifications.smtpHost
    }
    if(conf.notifications.smtpPort) {
      appConfig.smtpPort = conf.notifications.smtpPort
    }
    if(conf.notifications.smtpSecure) {
      appConfig.smtpSecure = conf.notifications.smtpSecure
    }
    if(conf.notifications.smtpUser) {
      appConfig.smtpUser = conf.notifications.smtpUser
    }
    if(conf.notifications.smtpPass) {
      appConfig.smtpPass = conf.notifications.smtpPass
    }
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
      {dataType: 'boolean', attr: 'enabled', message: 'Enable notifications'},
      {dataType: 'string', attr: 'smtpHost', message: 'SMTP host'},
      {dataType: 'int', attr: 'smtpPort', message: 'SMTP port'},
      {dataType: 'boolean', attr: 'smtpSecure', message: 'SMTP over SSL'},
      {dataType: 'string', attr: 'smtpUser', message: 'SMTP username'},
      {dataType: 'string', attr: 'smtpPass', message: 'SMTP password'},
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