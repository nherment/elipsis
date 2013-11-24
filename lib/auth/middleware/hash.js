
var crypto            = require('crypto')
var logger            = require('../../util/Logger.js')
var Security          = require('../Security.js')

var ConfMgr         = require("../../../install/ConfigurationManager.js")


/** Generates a hash which is used for encrypting/decrypting vaults and is stored in memory
 *
 * @param credentials
 * @param account
 * @param callback(err, sessionData)
 */
function auth(credentials, account, callback) {

  if(account.hash) {

    Security.hash(credentials.password, new Buffer(account.hash.salt, 'hex'), account.hash.iterations, account.hash.keylen, function(err, hash) {
      if(err) {
        logger.warn("["+account.email+"] crypto-hash failure")
        // TODO: field error
        callback(err, undefined)
      } else {
        logger.info("["+account.email+"] crypto-hash success")
        console.log('HASH: '+hash.toString('hex'))
        callback(undefined, hash.toString('hex'))
      }
    })

  } else {

    Security.generateSaltedHash(credentials.password, function(err, hashedPasswordObject) {
      if(err) {
        logger.error(err)
        callback(err, undefined)
      } else {
        var generatedHash = hashedPasswordObject.hash
        hashedPasswordObject.hash = null // do not store in DB the hash used for encrypting/decrypting data
        account.hash = hashedPasswordObject
        console.log('HASH: '+generatedHash)
        callback(undefined, generatedHash)
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
  throw new Error('not implemented')
  // TODO: re-encrypt all of this user's vaults
}


module.exports = {
  auth: auth,
  update: update
}