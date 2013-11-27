
var ConfMgr     = require('./ConfigurationManager.js')
var ConfHandler = require('./ConfigurationHandler.js')
var uuid        = require('uuid')

function configure(IOHelper, callback) {

  var conf = ConfMgr.readConf()

  var appConfig = {
    from: '"Full Name" <user@domain.tld>',
    hostname: 'localhost',
    port: 465,
    secure: true,
    user: '',
    password: ''
  }

  if(conf.smtp) {
    if(conf.smtp.from) {
      appConfig.from = conf.smtp.from
    }
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
      {dataType: 'string', attr: 'from', message: 'Sender email'},
      {dataType: 'string', attr: 'hostname', message: 'Hostname'},
      {dataType: 'int', attr: 'port', message: 'Port'},
      {dataType: 'boolean', attr: 'secure', message: 'SSL'},
      {dataType: 'string', attr: 'user', message: 'Username'},
      {dataType: 'string', attr: 'password', message: 'Password'}
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