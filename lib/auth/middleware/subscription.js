
var logger            = require('../../util/Logger.js')

var ConfMgr           = require("../../../install/ConfigurationManager.js")


/** Generates a hash which is used for encrypting/decrypting vaults and is stored in memory
 *
 * @param credentials
 * @param account
 * @param callback(err, sessionData)
 */
function auth(credentials, account, callback) {
  if(account.stripe.subscription) {

  } else {

  }
}



module.exports = {
  auth: auth
}