
var ConfMgr       = require('./ConfigurationManager.js')

var NotifConfig   = require('./configure-notifications.js')
var AppConfig     = require('./configure-application.js')
var DBConfig      = require('./configure-database.js')
var YubicoConfig  = require('./configure-yubico.js')
var SMTPConfig    = require('./configure-smtp.js')
var RedisConfig    = require('./configure-redis.js')
var IOHelper      = require('./IOHelper.js')

DBConfig.configure(IOHelper, function() {
  RedisConfig.configure(IOHelper, function() {
    AppConfig.configure(IOHelper, function() {
      SMTPConfig.configure(IOHelper, function() {
        NotifConfig.configure(IOHelper, function() {
          YubicoConfig.configure(IOHelper, function() {
            ConfMgr.stampVersion()
            IOHelper.println('Elipsis is now configured and ready to run.')
            IOHelper.println('\n\t--> run `make start` to start Elipsis\n')
            IOHelper.close()
          })
        })
      })
    })
  })
})