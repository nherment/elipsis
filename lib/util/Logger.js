
var tracer = require('tracer').colorConsole()

var DBHelper = require('../database/DBHelper.js').DBHelper
var ConfMgr  = require('../../install/ConfigurationManager.js')

Logger = {
  debug: tracer.debug,
  info: tracer.info,
  warn: tracer.warn,
  error: tracer.error,

  notice: function(subject, message) {
    if(ConfMgr.readConf('notifications.enabled') !== false) {
      this.notify(ConfMgr.readConf('notifications.adminEmail'), subject, message)
    } else {
      this.info('> notification: ' + subject + '\n' + message)
    }
  },

  notify: function(recipient, subject, message) {
    // TODO: remove circular dependency...
    if(ConfMgr.readConf('notifications.enabled') !== false) {
      require('./Notification.js').send(recipient, subject, message)
    } else {
      this.info('> notification to ['+recipient+']: ' + subject + '\n' + message)
    }
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