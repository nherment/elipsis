
var ConfMgr     = require('./ConfigurationManager.js')
var ConfHandler = require('./ConfigurationHandler.js')
var uuid        = require('uuid')

function configure(IOHelper, callback) {

  var conf = ConfMgr.readConf()

  var appConfig = {
    allowAccountCreation: false,
    hashAlgorithmIterations: 50*1000,
    port: 3000,
    resetPasswordTimeout: (24 * 3600 * 1000), // 24hrs
    sessionSecret: uuid.v4(),
    sessionMaxAge: 20*1000,
    encryptionPwd: uuid.v4(),
    websiteUrl: 'https://elipsis.io'
  }

  if(conf.application) {
    if(conf.application.allowAccountCreation) {
      appConfig.allowAccountCreation = conf.application.allowAccountCreation
    }
    if(conf.application.hashAlgorithmIterations) {
      appConfig.hashAlgorithmIterations = conf.application.hashAlgorithmIterations
    }
    if(conf.application.port) {
      appConfig.port = conf.application.port
    }
    if(conf.application.resetPasswordTimeout) {
      appConfig.resetPasswordTimeout = conf.application.resetPasswordTimeout
    }
    if(conf.application.sessionSecret) {
      appConfig.sessionSecret = conf.application.sessionSecret
    }
    if(conf.application.sessionMaxAge) {
      appConfig.sessionMaxAge = conf.application.sessionMaxAge
    }
    if(conf.application.encryptionPwd) {
      appConfig.encryptionPwd = conf.application.encryptionPwd
    }
    if(conf.application.websiteUrl) {
      appConfig.websiteUrl = conf.application.websiteUrl
    }
  }

  var opts = {
    title: "Application Configuration",
    default: appConfig,
    confirm: true,
    entries: [
      {dataType: 'int', attr: 'port', message: 'HTTP port'},
      {dataType: 'boolean', attr: 'allowAccountCreation', message: 'Allow creation of new accounts'},
      {dataType: 'int', attr: 'hashAlgorithmIterations', message: 'Hash algorithm iterations'},
      {dataType: 'int', attr: 'resetPasswordTimeout', message: 'Timeout for password reset validation (ms)'},
      {dataType: 'string', attr: 'sessionSecret', message: 'Session secret'},
      {dataType: 'int', attr: 'sessionMaxAge', message: 'Session timeout'},
      {dataType: 'string', attr: 'encryptionPwd', message: 'App level encryption password'},
      {dataType: 'string', attr: 'websiteUrl', message: 'The website\'s url. Must end with a /'}
    ]
  }

  new ConfHandler(opts, IOHelper, function(appConfig) {
    ConfMgr.mergeConf({application: appConfig})

    callback()
  })

}

module.exports = {
  configure: configure
}