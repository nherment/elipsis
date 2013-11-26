
                        require("date-format-lite")
var logger            = require('../util/Logger.js')
var Notification      = require('../util/Notification.js')
var ClientError       = require('../error/Errors.js').ClientError
var AuditActions      = require('./AuditActions.js')
var DBHelper          = require('../database/DBHelper.js').DBHelper
var AuthProcedure     = require('../auth/AuthProcedure.js')
var UpdateProcedure   = require('../auth/UpdateProcedure.js')
var ConfMgr           = require('../../install/ConfigurationManager.js')
var auth              = new AuthProcedure()
AccountManagement = {}

AccountManagement.login = function(email, credentials, ipAddress, callback) {

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

      if(!ConfMgr.readConf('application.allowAccountCreation')) {
        logger.warn('['+email+'] account creation attempt but account creation is disabled')
        err = new Error('Account creation is disabled')
        return callback(err, undefined);
      }

      logger.info('['+email+'] creating new account')

      account = {
        email: email,
        creationDate: new Date()
      }

      var newAccount = true;

    }

    var session = {}

    if(!credentials.password) {
      credentials.password = ''
    }

    auth.run(credentials, account, session, function(err) {
      if(err) {
        logger.audit(email, AuditActions.ACCOUNT_LOGIN_FAILED, ipAddress)
        logger.warn('['+email+'] authentication failure')
        callback(err, undefined)
      } else {
        logger.info('['+email+'] authentication success')
        logger.audit(email, AuditActions.ACCOUNT_LOGIN, ipAddress)

        account.lastLogin = new Date()

        if(newAccount) {
          Notification.send('nherment@gmail.com', 'new elipsis user', email)
          Notification.send(email, 'Welcome',
            'Hi,\n\n' +
              'Thank you for signing up at https://elipsis.io/ and welcome aboard !\n\n' +
              'This message is automated but you can just answer to it, a real person will promptly respond.\n' +
              'Please let me know if there is anything I can do.\n\n' +
              '- Nicolas Herment\n' +
              'https://elipsis.io/')
        } else if(ConfMgr.readConf('notifications.notifOnLogin')) {

          Notification.send(email, 'Connexion notification',
            'Hi,\n\n' +

              'Someone successfully logged-in into your account https://elipsis.io/\n\n' +

              '  Account: ' + email + '\n' +
              '  IP address: ' + ipAddress + '\n' +
              '  Date: ' + new Date().format("DDDD, MMMM D YYYY at HH:mm A") + '\n\n' +

              '- Nicolas Herment\n' +
              'https://elipsis.io/')
        }

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

AccountManagement.update = function(email, settings, callback) {
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
      new UpdateProcedure().run(oldCredentials, newCredentials, account, session, function(updateErr) {

        if(updateErr) {
          logger.error('update procedure failed')

          DBHelper.Account.save(account, function(saveErr, savedAccount) {
            if(saveErr) {
              logger.error(saveErr)
            }
            // TODO: return all errors
            callback(updateErr, undefined)
          })

        } else {
          logger.error('update procedure suceeded')
          DBHelper.Account.save(account, function(err, savedAccount) {
            callback(err, session)
          })
        }
      })
    }
  })
}

AccountManagement.audit = function(email, from, to, callback) {

  var skip = from
  var limit = to - from

  // This is user entered data, no matter what, limit the query to 100 items, limit or skip
  if(skip >= 0 && skip <= 100 && limit > 0 && limit <= 100) {

    DBHelper.Audit.find({email: email}, {}, {sort: {date: -1}, skip: skip, limit: limit}, function(err, audits) {
        if(err) {
          logger.error(err)
          callback(err, undefined)
        } else {
          callback(err, audits)
        }
      })

  } else {
    setImmediate(function() {
      logger.warn('['+email+'] out of range data: from ['+from+'] to ['+to+']')
      callback(new ClientError(ClientError.BAD_REQUEST, '"from" ('+from+') should be less than "to" ('+to+') and the limit for audit query is 100 items'))
    })
  }
}


AccountManagement.looksLikeAnEmail = function(email) {
  return /.+@.+/.test(email)
}

module.exports = AccountManagement;