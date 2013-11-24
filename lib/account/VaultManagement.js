
var ConfMgr           = require('../../install/ConfigurationManager.js')
var DBHelper          = require('../database/DBHelper.js').DBHelper
var AuthProcedure     = require('../auth/AuthProcedure.js')
var Security          = require('../auth/Security.js')
var logger            = require('../util/Logger.js')
var ClientError       = require('../error/Errors.js').ClientError
var uuid              = require('uuid')
var AuditActions      = require('./AuditActions.js')

var auth              = new AuthProcedure()

var appLevelPwd =
  process.env.SAFEHOUSE_ENCRYPTION_PWD ||
  ConfMgr.readConf('application.encryptionPwd') ||
  'password'

var VaultManagement   = {}

VaultManagement.addVault = function(ipAddress, email, password, vaultData, callback) {

  if(!vaultData) {
    return setImmediate(function() {
      callback(new ClientError(ClientError.BAD_REQUEST, 'missing vault data'), undefined)
    })
  }

  if(!vaultData.name) {
    return setImmediate(function() {
      callback(new ClientError(ClientError.BAD_REQUEST, 'missing vault data name'), undefined)
    })
  }

  DBHelper.Account.findByKey(email, function(err, account) {
    if(err) {
      callback(err, undefined)
    } else if(account) {

      var encryptedData = Security.encrypt(password, vaultData)
      // the second encryption is based on the application's password
      encryptedData = Security.encrypt(appLevelPwd, encryptedData)

      var vault = {
        uid: uuid.v4(),
        data: encryptedData
      }

      // it is very important to save the vault before updating the account
      // because the vault's uid could collision with an existing vault's uid.
      // if it were to happen, we want the DB to tell us through a unicity
      // constraint violation.
      // without this safety check, an account could get another account's
      // vault. Encryption mitigates that risk but it is still something we
      // want to avoid.
      DBHelper.Vault.save(vault, function(err, savedVault) {

        if(err) {

          logger.error(err)
          callback(err, undefined)

        } else {

          if(!account.vaults) {
            account.vaults = []
          }

          account.vaults.push({uid: vault.uid, name: vaultData.name})
          DBHelper.Account.save(account, function(err, updatedAccount) {
            if(err) {
              logger.error(err)
              // TODO: delete created vault or email alert
            } else {
              logger.audit(email, AuditActions.VAULT_CREATE, ipAddress)
              callback(undefined, {uid: vault.uid})
            }
          })
        }
      })

    } else {
      logger.warn('['+email+'] trying to access a vault on a non existing account')
      callback(new ClientError(ClientError.NOT_FOUND, 'no such account: '+email), undefined)
    }
  })

}

VaultManagement.listVaults = function(ipAddress, email, password, callback) {

  DBHelper.Account.findByKey(email, function(err, account) {
    if(err) {
      callback(err, undefined)
    } else if(account) {
      var vaults = account.vaults || []

      callback(undefined, vaults)

    } else {
      logger.warn('['+email+'] trying to access a vault on a non existing account')
      callback(new ClientError(ClientError.NOT_FOUND, 'no such account: '+email), undefined)
    }
  })

}


VaultManagement.readVault = function(ipAddress, email, password, vaultUid, callback) {

  DBHelper.Account.findByKey(email, function(err, account) {
    if(err) {
      callback(err, undefined)
    } else {

      var vaultInfo

      if(account.vaults) {
        for(var i = 0 ; i < account.vaults.length ; i++) {
          if(account.vaults[i].uid === vaultUid) {
            vaultInfo = account.vaults[i]
            break
          }
        }
      }


      if(vaultInfo) {

        logger.audit(email, AuditActions.VAULT_READ, ipAddress)

        DBHelper.Vault.findByKey(vaultInfo.uid, function(err, vault) {

          if(err) {

            callback(err, undefined)

          } else if(vault) {

            try {
              var decryptedData = Security.decrypt(appLevelPwd, vault.data)
              decryptedData = Security.decrypt(password, decryptedData)
            } catch(err) {
              callback(new Error('could not decrypt data'), undefined)
            }

            callback(undefined, decryptedData)

          } else {

            callback(new ClientError(ClientError.NOT_FOUND, 'Vault ['+vaultUid+'] not found'), undefined)

          }
        })

      } else {
        // TODO: log security advisory, possible attempt to access a vault not belonging to logged in account
        callback(new ClientError(ClientError.NOT_FOUND, 'Vault ['+vaultUid+'] not found'), undefined)
      }

    }
  })
}


VaultManagement.removeVault = function(ipAddress, email, vaultUid, callback) {

  DBHelper.Account.findByKey(email, function(err, account) {
    if(err) {
      callback(err)
    } else {

      var vaultInfo

      if(account.vaults) {
        for(var i = 0 ; i < account.vaults.length ; i++) {
          if(account.vaults[i].uid === vaultUid) {
            vaultInfo = account.vaults[i]
            account.vaults.splice(i, 1)
            break
          }
        }
      }

      if(vaultInfo) {

        logger.audit(email, AuditActions.VAULT_DELETE, ipAddress, {name: vaultInfo.name})

        // delete the vault before actually updating the account because I prefer having
        // a stale account than the user believing we deleted his vault when there
        // actually was an error and the vault object is still in the DB
        DBHelper.Vault.remove({uid: vaultInfo.uid}, function(err) {

          if(err) {

            logger.error(err)
            callback(err)

          } else {

            DBHelper.Account.save(account, function(err, updatedAccount) {
              logger.audit(email, AuditActions.VAULT_DELETE, ipAddress, {vault: vaultUid})
              callback(undefined)
            })

          }
        })

      } else {
        // TODO: log security advisory, possible attempt to access a vault not belonging to logged in account
        callback(new ClientError(ClientError.NOT_FOUND, 'Vault ['+vaultUid+'] not found'))
      }

    }
  })
}

module.exports = VaultManagement