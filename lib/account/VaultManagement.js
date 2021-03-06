
var ConfMgr           = require('../../install/ConfigurationManager.js')
var DBHelper          = require('../database/DBHelper.js').DBHelper
var Security          = require('../auth/Security.js')
var logger            = require('../util/Logger.js')
var ClientError       = require('../error/Errors.js').ClientError
var uuid              = require('uuid')
var AuditActions      = require('./AuditActions.js')

var appLevelPwd =
  process.env.SAFEHOUSE_ENCRYPTION_PWD ||
  ConfMgr.readConf('application.encryptionPwd') ||
  'password'

var VaultManagement   = {}

VaultManagement.saveVault = function(ipAddress, email, password, vaultData, callback) {

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

      var encryptedData = VaultManagement.encrypt(password, vaultData)

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

          // update the account with the category
          var exists = false

          if(vaultData.uid) {
            for(var i = 0 ; i < account.vaults.length ; i++) {
              if(account.vaults[i] && account.vaults[i].uid === vaultData.uid) {
                exists = true;
                account.vaults[i].name = vaultData.name
                account.vaults[i].category = vaultData.category
              }
            }
          }

          if(!exists) {
            account.vaults.push({
              uid: vault.uid,
              name: vaultData.name,
              category: vaultData.category
            })
          }


          DBHelper.Account.save(account, function(err, updatedAccount) {
            if(err) {
              logger.error(err)
              // TODO: delete created vault or email alert
            } else {
              if(exists) {
                logger.audit(email, AuditActions.VAULT_UPDATE, ipAddress, {uid: vaultData.uid, name: vaultData.name})
              } else {
                logger.audit(email, AuditActions.VAULT_CREATE, ipAddress, {uid: vaultData.uid, name: vaultData.name})
              }
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
    } else if(account) {

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

        logger.audit(email, AuditActions.VAULT_READ, ipAddress, {uid: vaultInfo.uid, name: vaultInfo.name})

        DBHelper.Vault.findByKey(vaultInfo.uid, function(err, vault) {

          if(err) {

            callback(err, undefined)

          } else if(vault) {

            try {
              var decryptedData = VaultManagement.decrypt(password, vault.data)
            } catch(err) {
              return callback(new Error('could not decrypt data'), undefined)
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

    } else {
      callback(new ClientError(ClientError.NOT_FOUND, 'Account ['+email+'] not found'), undefined)
    }
  })
}
VaultManagement.decrypt = function(password, data) {
  var decryptedData = Security.decrypt(appLevelPwd, data)
  decryptedData = Security.decrypt(password, decryptedData)
  return decryptedData
}

VaultManagement.encrypt = function(password, data) {
  var encryptedData = Security.encrypt(password, data)
  encryptedData = Security.encrypt(appLevelPwd, encryptedData)
  return encryptedData
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

        logger.audit(email, AuditActions.VAULT_DELETE, ipAddress, {uid: vaultInfo.uid, name: vaultInfo.name})

        // delete the vault before actually updating the account because I prefer having
        // a stale account than the user believing we deleted his vault when there
        // actually was an error and the vault object is still in the DB
        DBHelper.Vault.remove({uid: vaultInfo.uid}, function(err) {

          if(err) {

            logger.error(err)
            callback(err)

          } else {

            DBHelper.Account.save(account, function(err, updatedAccount) {
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