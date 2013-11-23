
var IOHelper  = require('./IOHelper.js')
var DBConfig  = require('./configure-database.js')
var AppConfig = require('./configure-application.js')
var YubicoConfig = require('./configure-yubico.js')

DBConfig.configure(IOHelper, function() {
  AppConfig.configure(IOHelper, function() {
      YubicoConfig.configure(IOHelper, function() {
        IOHelper.println('\Safe House is now configured and ready to run.')
        IOHelper.println('\n\t--> run `make start` to start dolphyn\n')
        IOHelper.close()
      })
  })
})