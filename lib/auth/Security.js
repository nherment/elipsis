var crypto          = require('crypto')
var ConfMgr         = require("../../install/ConfigurationManager.js")
var logger          = require('../util/Logger.js')

var cypherAlgorithm = ConfMgr.readConf('encryption.cypher') || 'aes256'
var cypherPasswordPrefix = ConfMgr.readConf('encryption.passwordPrefix') || ''
var hashIterations = ConfMgr.readConf('application.hashAlgorithmIterations') || 20000

var keylen = 512

logger.info("The password hashing algorithm will use ["+hashIterations+"] iterations")

if(hashIterations < 20000) {
  logger.warn('Password hashing uses too few iterations. A high number of iterations ensure it is hard to brutefore a password. A number of at least ['+hashIterations+']')
}

function encrypt(password, object) {
  var cypher = crypto.createCipher(cypherAlgorithm, cypherPasswordPrefix + password)
  var encrypted = cypher.update(JSON.stringify(object), 'binary', 'hex') + cypher.final('hex')
  return encrypted
}

function decrypt(password, encrypted) {
  var cypher = crypto.createDecipher(cypherAlgorithm, cypherPasswordPrefix + password)
  var decrypted = cypher.update(encrypted, 'hex', 'binary') + cypher.final('binary')
  return JSON.parse(decrypted)
}

function generateSaltedHash(plainText, callback) {

  if(typeof plainText == 'undefined') {
    plainText = ''
  }

  crypto.randomBytes(keylen, function(err, salt) {
    if (err) {
      logger.error(err)
      callback(err, undefined)
    } else {
      hash(plainText, salt, hashIterations, keylen, function(err, hash) {
        if(err) {
          logger.error(err)
          callback(err, undefined)
        } else {

          var password = {
            salt: salt.toString('hex'),
            keylen: keylen,
            iterations: hashIterations,
            hash: hash.toString('hex')
          }
          callback(undefined, password);
        }
      })
    }
  })
}

function hash(plainText, salt, iterations, keylen, callback) {

  var startTime = Date.now()

  crypto.pbkdf2(plainText, salt, iterations, keylen, function(err, hash) {

    var hashTime = Date.now() - startTime

    if(!err && hashTime > 500) {
      logger.warn("Hash time took too long ("+hashTime+"ms). This directly impacts the application performance, scalability and the end user login time.")
    }

    callback(err, hash)
  })
}

function prepareHash(callback) {

  crypto.randomBytes(keylen, function(err, salt) {
    if (err) {
      logger.error(err)
      callback(err, undefined)
    } else {
      var hashInfo = {
        iterations: hashIterations,
        salt: salt,
        keylen: keylen
      }
      callback(undefined, hashInfo)
    }
  })

}

module.exports = {
  encrypt: encrypt,
  decrypt: decrypt,
  hash: hash,
  prepareHash: prepareHash,
  generateSaltedHash: generateSaltedHash
}