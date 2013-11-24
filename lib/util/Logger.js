
var DBHelper = require('../database/DBHelper.js').DBHelper

Logger = {
  debug: function(msg) {
    console.log(msg)
  },
  info: function(msg) {
    console.info(msg)
  },
  warn: function(msg) {
    console.warn(msg)
  },
  error: function(msg) {
    console.error(msg)
  },

  audit: function(email, action, ipAddress, details) {

    // TODO: queue save

    var audit = {
      date: new Date(),
      email: email,
      ip: ipAddress,
      action: action,
      details: details
    }

    DBHelper.Audit.save(audit, function(err) {
      if(err) {
        Logger.error(err)
      }
    })
  }
}

module.exports = Logger