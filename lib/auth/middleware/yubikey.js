
var crypto            = require('crypto')
var Security          = require('../Security.js')
var logger            = require('../../util/Logger.js')
var FieldError        = require('../../error/Errors.js').FieldError

var yub = require('yub')

var ConfMgr         = require('../../../install/ConfigurationManager.js')
var yubico          = ConfMgr.readConf('yubico.enabled') || false

var ConfMgr         = require("../../../install/ConfigurationManager.js")

var clientId = ConfMgr.readConf('yubico.clientId') || ''
var secret   = ConfMgr.readConf('yubico.secret')   || ''
var offline  = ConfMgr.readConf('yubico.offline')  || ''

yub.init(clientId, secret)

/**
 *
 * @param credentials
 * @param account
 * @param callback(err, sessionData)
 */
function auth(credentials, account, callback) {
  if(!yubico) {
    return setImmediate(function() {
      callback(undefined, undefined)
    })
  }

  authorize(credentials, account, function(err, data) {

    if(err) {

      callback(err, undefined)

    } else {

      if(!account.yubikeys || account.yubikeys.length === 0) {
        account.yubikeys = [data.identity]
      }

      callback(undefined, undefined)

    }
  })

}


function authorize(credentials, account, callback) {
  yub.verify(credentials.yubikeyOTP, function(err, data) {

    if(err) {

      logger.error("["+account.email+"] yubikey OTP ["+credentials.yubikeyOTP+"] is not valid")
      logger.error(err)
      callback(err, undefined)

    } else if (data.signatureVerified && data.nonceVerified && data.status == "OK") {

      var yubikeyId = data.identity

      verifyYubikey(yubikeyId, account, function(err) {
        if(err) {
          callback(err, undefined)
        } else {
          credentials.yubikeyId = yubikeyId
          callback(undefined, undefined)
        }
      })

    } else {

      callback(new Error('Invalid OTP'), undefined)

    }
  })
}

function verifyYubikey(yubikeyId, account, callback) {

  var yubikeys = account.yubikeys;
  if(yubikeys && yubikeys.length > 0) {
    yubikeys = yubikeys.slice(0)
    multipleYubikeyChecks(yubikeys, function(err) {
      if(err) {
        callback(err)
      } else {
        callback()
      }
    })
  } else {
    // this is voluntarily the wrong message. If there are no yubikey assigned to an account, don't say it.
    callback(new FieldError(FieldError.INVALID, 'yubikey', 'It does not match an existing yubikey.'))
  }
}

function multipleYubikeyChecks(yubikeyId, yubikeys, callback) {
  if(yubikeys && yubikeys.length > 0) {
    var yubikey = yubikeys.shift()

    if(yubikey && yubikey.hash) {
      Security.hash(yubikeyId, new Buffer(yubikey.hash.salt, 'hex'), yubikey.hash.iterations, yubikey.hash.keylen, function(err, hash) {
        if(hash.toString('hex') === yubikey.hash.hash) {
          callback(undefined)
        } else {
          logger.warn(err)
          multipleYubikeyChecks(yubikeyId, yubikeys, callback)
        }
      })
    } else {
      multipleYubikeyChecks(yubikeyId, yubikeys, callback)
    }
  } else {
    callback(new FieldError(FieldError.INVALID, 'yubikey', 'It does not match an existing yubikey.'))
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
  if(!yubico) {
    return setImmediate(function() {
      callback(undefined, undefined)
    })
  }

  yub.verify(newCredentials.yubikeyOTP, function(err, data) {

    if(err) {

      logger.error("["+account.email+"] yubikey OTP ["+newCredentials.yubikeyOTP+"] is not valid")
      logger.error(err)
      callback(err, undefined)

    } else if (data.signatureVerified && data.nonceVerified && data.status == "OK") {

      var yubikeyId = data.identity
      Security.generateSaltedHash(yubikeyId, function(err, hash) {
        if(err) {
          callback(err)
        } else {

          if(!account.yubikeys) {
            account.yubikeys = []
          }
          account.yubikeys.push({
            name: newCredentials.yubikeyName || ('yubikey '+account.yubikeys.length+1),
            hash: hash
          })

          callback()

        }
      })


    } else {

      callback(new Error('Invalid OTP'), undefined)

    }
  })


}

function remove(credentials, account, callback) {

  authorize(credentials.yubikeyOTP, account, function(err, data) {
    if(err) {
      logger.error("["+account.email+"] authentication error")
      logger.error(err)
      callback(err, undefined)
    } else {
      if(credentials.remove && account.yubikeys && account.yubikeys.indexOf(credentials.remove) > -1) {
        account.yubikeys.splice(account.yubikeys.indexOf(credentials.remove), 1)
      }
      callback(undefined, undefined)
    }
  })
}


module.exports = {
  auth: auth,
  update: update,
  remove: remove
}