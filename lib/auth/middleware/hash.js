
var DBHelper          = require('../../database/DBHelper.js').DBHelper
var VaultManagement   = require("../../account/VaultManagement.js")
var logger            = require('../../util/Logger.js')
var Security          = require('../Security.js')
var crypto            = require('crypto')

var ConfMgr           = require("../../../install/ConfigurationManager.js")


/** Generates a hash which is used for encrypting/decrypting vaults and is stored in memory
 *
 * @param credentials
 * @param account
 * @param callback(err, sessionData)
 */
function auth(credentials, account, callback) {

  if(account.hash) {

    calculateAccountHash(credentials.password, account, function(err, hash) {
      if(err) {
        logger.warn("["+account.email+"] crypto-hash failure")
        callback(err, undefined)
      } else {
        logger.info("["+account.email+"] crypto-hash success")
        callback(undefined, hash)
      }
    })

  } else {

    generateAccountHash(credentials.password, account, function(err, generatedHash) {
      callback(undefined, generatedHash)
    })

  }
}

function calculateAccountHash(plainTextPassword, account, callback) {
  Security.hash(plainTextPassword, new Buffer(account.hash.salt, 'hex'), account.hash.iterations, account.hash.keylen, function(err, hash) {
    if(err) {
      logger.error(err)
      callback(err, undefined)
    } else {
      callback(undefined, hash.toString('hex'))
    }
  })
}

function generateAccountHash(plainTextPassword, account, callback) {

  Security.generateSaltedHash(plainTextPassword, function(err, hashedPasswordObject) {
    if(err) {
      logger.error(err)
      callback(err, undefined)
    } else {
      var generatedHash = hashedPasswordObject.hash
      hashedPasswordObject.hash = null // do not store in DB the hash used for encrypting/decrypting data
      account.hash = hashedPasswordObject
      callback(undefined, generatedHash)
    }
  })
}

/** modifies the account object with a new password if the old one matches.
 *
 * @param account
 * @param oldPassword
 * @param newPassword
 * @param callback(err) err if something went wrong or if old password does not match
 */
function update(oldCredentials, newCredentials, account, sessionData, callback) {

  if(account.vaults && account.vaults.length > 0) {

    logger.info('re-encrypting ['+account.vaults.length+'] vaults')
    var vaultsUids = []

    for(var i = 0 ; i < account.vaults.length ; i++) {
      vaultsUids.push(account.vaults[i].uid)
    }

    DBHelper.Vault.find({uid: {$in: vaultsUids}}, function(err, vaults) {
      if(err) {
        logger.error(err)
        callback(err)
      } else if(vaults) {


        calculateAccountHash(oldCredentials.password, account, function(err, oldHash) {
          if(err) {
            callback(err)
          } else {

            generateAccountHash(newCredentials.password, account, function(err, newHash) {
              if(err) {
                callback(err)
              } else {

                for(var i = 0 ; i < vaults.length ; i++) {
                  logger.info('re-encrypting vault #' + i + ' ...')
                  var vaultData = VaultManagement.decrypt(oldHash, vaults[i].data)
                  vaults[i].data = VaultManagement.encrypt(newHash, vaultData)
                  logger.info('re-encrypted vault #' + i)

                }

                DBHelper.Vault.save(vaults, function(err, savedVaults) {
                  logger.info('Saved all the updated vaults')
                  callback(err)
                })
              }
            })
          }
        })

      } else {
        callback(new Error('Could not find the vault tied to your account. They are needed to re-encrypt them with the new password'))
      }
    })
  } else {
    callback()
  }
}


module.exports = {
  auth: auth,
  update: update
}