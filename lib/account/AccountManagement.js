
var logger            = require('../util/Logger.js')
var DBHelper          = require('../database/DBHelper.js').DBHelper
var AuthProcedure     = require('../auth/AuthProcedure.js')
var ConfMgr           = require('./install/ConfigurationManager.js')
var auth              = new AuthProcedure()

AccountManagement = {}

AccountManagement.login = function(email, credentials, callback) {

  if(!AccountManagement.looksLikeAnEmail(email)) {
    setImmediate(function() {
      var err = new Error('email format is not valid')
      logger.error(err)
      callback(err, undefined)
    })
    return
  }

  DBHelper.Account.findByKey(email, function(err, account) {
    if(err) {
      logger.error(err)
      callback(err, undefined)

    } else if(!account) {

      if(!conf.application.allowAccountCreation) {
        logger.warn('['+email+'] new account attempt but account creation is disabled')
        err = new Error('Account creation is disabled')
        return callback(err, undefined);
      }

      logger.info('['+email+'] creating new account')

      account = {
        email: email,
        creationDate: new Date()
      }
    }

    var session = {}

    if(!credentials.password) {
      credentials.password = ''
    }

    auth.auth(credentials, account, session, function(err) {
      if(err) {
        logger.warn('['+email+'] authentication failure')
        callback(err, undefined)
      } else {
        logger.info('['+email+'] authentication success')

        DBHelper.Account.save(account, function(err, savedAccount) {
          if(err) {
            logger.error(err)
            callback(err, undefined)
          } else {
            logger.info('['+email+'] account saved')
            callback(undefined, session)
          }
        })
      }
    })
  })
}

AccountManagement.filterAccount = function(account, password) {
  var filtered = {
    email: account.email
  }
  return filtered
}

AccountManagement.saveSettings = function(email, settings, callback) {
  DBHelper.Account.findByKey(email, function(err, account) {
    if(err) {
      callback(err)
    } else {
      account.configured = true

      var oldCredentials = {
        password: settings.oldPassword
      }

      var newCredentials = {
        password: settings.newPassword
      }
      var session = {}
      auth.update(oldCredentials, newCredentials, account, session, function(updateErr) {

        if(updateErr) {

          DBHelper.Account.save(account, function(saveErr, savedAccount) {
            if(saveErr) {
              logger.error(saveErr)
            }
            // TODO: return all errors
            callback(updateErr, undefined)
          })

        } else {

          DBHelper.Account.save(account, function(err, savedAccount) {
            callback(err, session)
          })
        }
      })
    }
  })
}


AccountManagement.looksLikeAnEmail = function(email) {
  return /.+@.+/.test(email)
}

module.exports = AccountManagement;