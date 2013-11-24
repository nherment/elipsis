
var crypto            = require('crypto')
var logger            = require('../../util/Logger.js')
var Security          = require('../Security.js')
var FieldError        = require('../../error/Errors.js').FieldError
var DBHelper          = require('../../database/DBHelper.js').DBHelper
var ConfMgr           = require("../../../install/ConfigurationManager.js")

/**
 *
 * @param credentials
 * @param account
 * @param callback(err, sessionData)
 */
function auth(credentials, account, callback) {

  if(account.password) {

    verifyPassword(credentials.password, account.password, function(authenticationSuccess) {
      if(authenticationSuccess) {
        logger.info("["+account.email+"] authentication success")
        callback(undefined, undefined)
      } else {
        logger.warn("["+account.email+"] authentication failure")
        // TODO: field error
        callback(new Error("Wrong password"), undefined)
      }
    })

  } else {

    Security.generateSaltedHash(credentials.password, function(err, hashedPasswordObject) {
      if(err) {
        logger.error(err)
        callback(err, undefined)
      } else {
        account.password = hashedPasswordObject;
        callback(undefined, undefined)
      }
    })

  }
}
/** modifies the account object with a new password if the old one matches.
 *
 * @param account
 * @param oldPassword
 * @param newPassword
 * @param callback(err) err if something went wrong or if old password does not match
 */
function update(oldCredentials, newCredentials, account, sessionData, callback) {

  if(!newCredentials.password) {
    return callback(undefined)
  }

  logger.info('['+account.email+'] attempt to set new password')

  verifyPassword(oldCredentials.password, account.password, function(match) {

    if(match) {
      Security.generateSaltedHash(newCredentials.password, function(err, hashedPassword) {
        if(err) {
          callback(err)
        } else {

          account.password = hashedPassword

          callback()

        }
      })
    } else {
      logger.warn('['+account.email+'] attempt to set new password failed because the old password does not match')
      callback(new FieldError(FieldError.INVALID, 'oldPassword', 'It does not match the existing password.'))
    }

  })
}

function verifyPassword(plainText, password, callback) {

  if(typeof plainText == 'undefined') {
    plainText = ''
  }

  Security.hash(plainText, new Buffer(password.salt, 'hex'), password.iterations, password.keylen, function(err, hash) {
    if(err) {
      logger.error(err)
      callback(false)
    } else {
      callback(hash.toString('hex') === password.hash)
    }
  })
}


module.exports = {
  auth: auth,
  update: update,
  verifyPassword: verifyPassword
}