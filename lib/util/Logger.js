
var winston = require('winston')
require('winston-syslog').Syslog

var DBHelper = require('../database/DBHelper.js').DBHelper

// winston.add(winston.transports.File, { filename: 'logs' , maxsize: 10*1000*1000, colorize: false, json: false});
// winston.remove(winston.transports.Console);

winston.add(winston.transports.Syslog, {
  app_name: 'elipsis'
})

Logger = {
  debug: function(msg) {
    winston.debug(msg)
  },
  info: function(msg) {
    winston.info(msg)
  },
  warn: function(msg) {
    winston.warn(msg)
  },
  error: function(msg) {
    winston.error(msg)
  },

  notify: function(recipient, subject, message) {
    // TODO: remove circular dependency...
    require('./Notification.js').send(recipient, subject, message)
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
