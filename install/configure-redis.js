
var ConfMgr     = require('./ConfigurationManager.js')
var ConfHandler = require('./ConfigurationHandler.js')
var uuid        = require('uuid')

function configure(IOHelper, callback) {

  var conf = ConfMgr.readConf()

  var appConfig = {
    enable: false,
    hostname: 'localhost',
    port: 6379,
    password: undefined
  }

  if(conf.redis) {
    if(conf.redis.enable) {
      appConfig.enable = conf.redis.enable
    }
    if(conf.redis.hostname) {
      appConfig.hostname = conf.redis.hostname
    }
    if(conf.redis.port) {
      appConfig.port = conf.redis.port
    }
    if(conf.redis.password) {
      appConfig.password = conf.redis.password
    }
  }

  var opts = {
    title: "Redis Configuration",
    default: appConfig,
    confirm: true,
    entries: [
      {dataType: 'boolean', attr: 'enable', message: 'Enable'},
      {dataType: 'string', attr: 'hostname', message: 'Hostname'},
      {dataType: 'int', attr: 'port', message: 'Port'},
      {dataType: 'string', attr: 'password', message: 'Password'}
    ]
  }

  new ConfHandler(opts, IOHelper, function(appConfig) {
    ConfMgr.mergeConf({redis: appConfig})

    callback()
  })

}

module.exports = {
  configure: configure
}