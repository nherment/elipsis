
var logger = require('../../util/Logger.js')

/** Activate the account if it needs to or refuse unactivated accounts
 *
 * @param credentials
 * @param account
 * @param callback(err, sessionData)
 */
function auth(credentials, account, callback) {

  if(account.activationToken) {

    if(account.activationToken === credentials.activationToken) {
      account.activationToken = null
      account.activationDate = new Date()

      setImmediate(function() {
        callback(undefined, undefined)
      })

    } else {

      var err
      if(credentials.activationToken) {
        err = new Error('The activation token is invalid. Please try again and contact us if this error persists.')
      } else {
        err = new Error('Your account is inactive. You should have received an email with an activation link. If this is not the case, please contact us.')
      }
      logger.error(err)

      setImmediate(function() {
        callback(err, undefined)
      })
    }

  } else {

    setImmediate(function() {
      callback(undefined, undefined)
    })

  }
}

module.exports = {
  auth: auth
}