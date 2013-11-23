
var ConfMgr           = require('./install/ConfigurationManager.js')
var DBHelper          = require('../database/DBHelper.js').DBHelper
var AuthProcedure     = require('../auth/AuthProcedure.js')
var Security          = require('../auth/Security.js')
var logger            = require('../util/Logger.js')
var uuid              = require('uuid')
var AuditActions      = require('./AuditActions.js')

var auth              = new AuthProcedure()

var appLevelPwd =
  process.env.SAFEHOUSE_ENCRYPTION_PWD ||
  ConfMgr.readConf('application.encryptionPwd') ||
  'password'

var VaultManagement   = {}

VaultManagement.addVault = function(ipAddress, email, vaultData, callback) {

  DBHelper.Account.findByKey(email, function(err, account) {
    if(err) {
      callback(err)
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

        if(!account.vaults) {
          account.vaults = []
        }

        account.vaults.push(vault.uid)
        DBHelper.save(account, function(err, updatedAccount) {
          logger.audit(email, AuditActions.VAULT_CREATE, {date: new Date(), ip: ipAddress})
          callback()
        })
      })

    } else {
      logger.warn('['+email+'] trying to access a vault on a non existing account')
      callback(new Error('no such account: '+email))
    }
  })

}


VaultManagement.readVault = function(ipAddress, email, vaultUid, callback) {

  DBHelper.Account.findByKey(email, function(err, account) {
    if(err) {
      callback(err, undefined)
    } else {

      if(account.vaults.indexOf(vaultUid) > -1) {

        logger.audit(email, AuditActions.VAULT_READ, {date: new Date(), ip: ipAddress})

        DBHelper.Vault.findByKey(vaultUid, function(err, vault) {

          if(err) {

            callback(err, undefined)

          } else if(vault) {

            var decryptedData = Security.decrypt(appLevelPwd, vault.data)
            decryptedData = Security.decrypt(password, decryptedData)

            callback(undefined, decryptedData)

          } else {

            callback(new Error('Vault not found'), undefined)

          }
        })

      } else {
        // TODO: log security advisory, possible attempt to access a vault not belonging to logged in account
        callback(new Error('Vault not found'), undefined)
      }

    }
  })
}

module.exports = VaultManagement