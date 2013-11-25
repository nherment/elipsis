
var ConfMgr     = require('./ConfigurationManager.js')
var ConfHandler = require('./ConfigurationHandler.js')
var uuid        = require('uuid')

function configure(IOHelper, callback) {

  var conf = ConfMgr.readConf()

  var appConfig = {
    hostname: 'localhost',
    port: 465,
    secure: true,
    user: '',
    password: ''
  }

  if(conf.smtp) {
    if(conf.smtp.hostname) {
      appConfig.hostname = conf.smtp.hostname
    }
    if(conf.smtp.port) {
      appConfig.port = conf.smtp.port
    }
    if(conf.smtp.secure) {
      appConfig.secure = conf.smtp.secure
    }
    if(conf.smtp.user) {
      appConfig.user = conf.smtp.user
    }
    if(conf.smtp.password) {
      appConfig.password = conf.smtp.password
    }
  }

  var opts = {
    title: "Smtp Configuration",
    default: appConfig,
    confirm: true,
    entries: [
      {dataType: 'boolean', attr: 'enabled', message: 'Enable smtp'},
      {dataType: 'string', attr: 'smtpHost', message: 'Hostname'},
      {dataType: 'int', attr: 'smtpPort', message: 'Port'},
      {dataType: 'boolean', attr: 'smtpSecure', message: 'SSL'},
      {dataType: 'string', attr: 'smtpUser', message: 'Username'},
      {dataType: 'string', attr: 'smtpPass', message: 'Password'}
    ]
  }

  new ConfHandler(opts, IOHelper, function(appConfig) {
    ConfMgr.mergeConf({smtp: appConfig})

    callback()
  })

}

module.exports = {
  configure: configure
}