
                        require('date-format-lite')
var uuid              = require('uuid')
var logger            = require('../util/Logger.js')
var ClientError       = require('../error/Errors.js').ClientError
var FieldError       = require('../error/Errors.js').FieldError
var AuditActions      = require('./AuditActions.js')
var DBHelper          = require('../database/DBHelper.js').DBHelper
var AuthProcedure     = require('../auth/AuthProcedure.js')
var UpdateProcedure   = require('../auth/UpdateProcedure.js')
var ConfMgr           = require('../../install/ConfigurationManager.js')
var VaultManagement   = require('./VaultManagement.js')
var auth              = new AuthProcedure()

AccountManagement = {}

AccountManagement.login = function(email, credentials, ipAddress, callback) {

  if(!AccountManagement.looksLikeAnEmail(email)) {
    setImmediate(function() {
      var err = new FieldError(FieldError.WRONG_FORMAT, 'email', 'email format is not valid')
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
      logger.warn('['+email+'] account login attempt but account does not exist')
      err = new ClientError(ClientError.BAD_REQUEST, 'The account does not exist or is disabled')
      return callback(err, undefined);
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

        if(ConfMgr.readConf('notifications.notifOnLogin')) {
          logger.notify(email, 'connection notification',
            'Hi,\n\n' +
              'Someone (maybe you) accessed your account at '+ConfMgr.readConf('application.websiteUrl')+'.\n\n' +
              'The IP address is: '+ipAddress+'\n\n' +
              'This message is automated but you can just answer to it, a real person will promptly respond.\n' +
              '- ' + ConfMgr.readConf('notifications.niceName')) + '\n' +
          ConfMgr.readConf('notifications.niceName')
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

AccountManagement.register = function(email, credentials, ipAddress, callback) {

  if(!AccountManagement.looksLikeAnEmail(email)) {
    setImmediate(function() {
      var err = new FieldError(FieldError.WRONG_FORMAT, 'email', 'email format is not valid')
      logger.error(err)
      callback(err, undefined)
    })
    return
  }

  DBHelper.Account.findByKey(email, function(err, account) {
    if(err) {
      logger.error(err)
      callback(err, undefined)

    } else if(account) {

      logger.warn('['+email+'] account registration attempt but the account already exists')
      err = new ClientError(ClientError.CONFLICT, 'The account ['+email+'] already exists')
      return callback(err, undefined);

    } else {

      account = {
        email: email,
        creationDate: new Date()
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

          account.activationToken = uuid.v4()

          logger.notify(ConfMgr.readConf('notifications.adminEmail'), 'new elipsis user', email)
          logger.notify(email, 'Welcome',
            'Hi,\n\n' +
              'Thank you for signing up at '+ConfMgr.readConf('application.websiteUrl')+' and welcome aboard !\n\n' +
              'The next step is to activate your account by following this link '+ConfMgr.readConf('application.websiteUrl')+'login?token='+account.activationToken+'\n\n' +
              'If you did not sign up you can ignore this email.\n\n' +
              'This message is automated but you can just answer to it, a real person will promptly respond.\n' +
              'Please let me know if there is anything we can do.\n\n' +
              '- ' + ConfMgr.readConf('notifications.niceName')) + '\n' +
              ConfMgr.readConf('notifications.niceName')

          DBHelper.Account.save(account, function(err, savedAccount) {
            if(err) {
              logger.error(err)
              callback(err, undefined)
            } else {
              logger.info('['+email+'] account saved')

              createOutOfTheBoxVaults(ipAddress, email, session.hash)

              callback(undefined, session)
            }
          })
        }
      })
    }
  })
}

function createOutOfTheBoxVaults(ipAddress, email, hash) {

  var category = 'Welcome !'

  var vault = {
    name: 'Welcome to elipsis.io !',
    secret: 'this is an encrypted password...',
    category: category
  }

  VaultManagement.saveVault(ipAddress, email, hash, vault, function(err, vaultInfo) {
    if(err) {
      logger.error(err)
    }


    vault = {
      name: 'These are your secrets.',
      secret: 'Your secrets are encrypted with AES-256...',
      category: category
    }

    VaultManagement.saveVault(ipAddress, email, hash, vault, function(err, vaultInfo) {
      if(err) {
        logger.error(err)
      }

      vault = {
        name: 'You create as many as wou want.',
        secret: 'This encryption is very strong...',
        category: category
      }

      VaultManagement.saveVault(ipAddress, email, hash, vault, function(err, vaultInfo) {
        if(err) {
          logger.error(err)
        }

        vault = {
          name: '<-- Just drag and drop them into categories.',
          secret: 'and only you have the password.',
          category: category
        }

        VaultManagement.saveVault(ipAddress, email, hash, vault, function(err, vaultInfo) {
          if(err) {
            logger.error(err)
          }
        })

      })

    })

  })

}

AccountManagement.filterAccount = function(account, password) {
  var filtered = {
    email: account.email
  }
  return filtered
}

AccountManagement.update = function(email, settings, ipAddress, callback) {
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
          logger.audit(email, AuditActions.ACCOUNT_PASSWORD_CHANGE_FAILED, ipAddress)

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
            logger.audit(email, AuditActions.ACCOUNT_PASSWORD_CHANGE, ipAddress)
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

    DBHelper.Audit.find(
      {
        email: email,
        action:{$in:[
          'login',
          'authentication failed',
          'password update',
        ]}
      },
      {},
      {sort: {date: -1}, skip: skip, limit: limit},
      function(err, audits) {
        if(err) {
          logger.error(err)
          callback(err, undefined)
        } else {
          callback(err, audits)
        }
      }
    )

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