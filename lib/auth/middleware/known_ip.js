// set the email in the session

/**
 *
 * @param credentials
 * @param account
 * @param callback(err, sessionData)
 */
function auth(credentials, account, callback) {

  var ip = credentials.ip

  switch(account.newIPPolicy) {
    case 'require_email_confirmation':
    case 'require_sms_confirmation':
    case 'require_two_factor':
    case 'ignore':

    case 'notify':
    default:

      break;
  }

  callback(undefined, account.email)

}

module.exports = {
  auth: auth
}