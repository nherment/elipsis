// set the email in the session

var uuid              = require('uuid')
var logger            = require('../../util/Logger.js')
var AuditActions      = require('../../account/AuditActions.js')
var ConfMgr           = require('../../install/ConfigurationManager.js')

/**
 *
 * @param credentials
 * @param account
 * @param callback(err, sessionData)
 */
function auth(credentials, account, callback) {

  var ipAddress = credentials.ip

  if(!account.ipFiltering) {
    account.ipFiltering = {
      policy: 'require_email_confirmation',
      valid: [],
      pending: []
    }
  }
  var ipFiltering = account.ipFiltering

  var valid = false // this will block the user if there is no IP

  if(ipAddress && ipFiltering.valid) {
    for(var i = 0 ; i < ipFiltering.valid.length ; i++) {
      if(ipFiltering.valid[i].ip === ipAddress) {
        if(ipFiltering.valid[i].validUntil > Date.now()) {
          valid = true
        } else {
          ipFiltering.valid = ipFiltering.valid.splice(i, 1)
        }
        break
      }
    }
  }

  logger.audit(account.email, AuditActions.ACCOUNT_LOGIN, ipAddress)

  switch(!valid && ipFiltering.policy) {
    case 'require_email_confirmation':

      var ipValidation = {
        ip: ipAddress,
        token: uuid.v4(),
        validUntil: Date.now() + (3600 * 1000)
      }

      ipFiltering.pending.push(ipValidation)

      logger.notify(account.email, 'A connection needs your approval',
        'Hi,\n\n' +

          'Someone from an unknown IP address is trying to get access to your account at '+ConfMgr.readConf('application.websiteUrl')+'\n\n' +

          'Because we do not know this address yet, you need to manually validate it. You can:\n'+
          '- give temporary access (24hrs) to this address by clicking here: ' + buildIPValidationURL(ipAddress, '24H') +'\n'+
          '- or give unlimited access to this address by clicking here: ' + buildIPValidationURL(ipAddress, 'infinity') + '\n\n' +
          '- block this address: ' + buildIPValidationURL(ipAddress, false) + '\n\n' +
          'Note that these links will only be valid for one hour.\n\n' +
          '  Account: ' + account.email + '\n' +
          '  IP address: ' + ipAddress + '\n' +
          '  Date: ' + new Date().format('UTC: DDDD, MMMM D YYYY at HH:mm A') + '\n\n' +
          '- '+ConfMgr.readConf('notifications.niceName')+'\n' +
          ConfMgr.readConf('application.websiteUrl'))
      break;
    case 'require_sms_confirmation':
    case 'require_two_factor':
    case 'ignore':
      break;
    case 'notify':
    default:

      logger.notify(account.email, 'Connexion notification',
        'Hi,\n\n' +

          'Someone successfully signed in your account '+ConfMgr.readConf('application.websiteUrl')+'\n\n' +

          '  Account: ' + account.email + '\n' +
          '  IP address: ' + ipAddress + '\n' +
          '  Date: ' + new Date().format('DDDD, MMMM D YYYY at HH:mm A') + '\n\n' +

          '- '+ConfMgr.readConf('notifications.niceName')+'\n' +
          ConfMgr.readConf('application.websiteUrl'))
      break;
  }

  callback(undefined, account.email)

}

var VALID_DELAY = {
  'DAY': '24H',
  'HOUR': '1H',
  'FOREVER': 'forever'
}

function validate(account, token, delay) {

  if(!account.ipFiltering) {
    account.ipFiltering = {
      policy: 'require_email_confirmation',
      valid: [],
      pending: []
    }
  }

  var ipFiltering = account.ipFiltering

  for(var i = 0 ; i < ipFiltering.pending.length ; i++) {
    var pendingValidation = ipFiltering.pending[i]

    if(pendingValidation.token === token) {

      if(pendingValidation.validUntil > Date.now()) {

        var ipObj = {
          ip: pendingValidation.ip
        }

        switch(delay) {
          case VALID_DELAY.DAY:
            ipObj.validUntil = Date.now() + (24 * 3600 * 1000)
            break
          case VALID_DELAY.FOREVER:
            ipObj.validUntil = 0
            break
          case VALID_DELAY.HOUR:
          default:
            ipObj.validUntil = Date.now() + (3600 * 1000)
            break
        }

        break
      } else {
        ipFiltering.pending = ipFiltering.pending.splice(i, 0)
        throw new Error('This token has expired.')
      }
    }

  }
}

function block(account, ip) {

}


/**
 *
 * @param token
 * @param valid the delay for which the ip should stay valid
 * @returns {string}
 */
function buildIPValidationURL(token, valid) {
  if(valid) {
    return ConfMgr.readConf('application.websiteUrl') + '/api/ip/validate?valid='+valid+'token='+token
  } else {
    return ConfMgr.readConf('application.websiteUrl') + '/api/ip/reject?ip='+token
  }
}

module.exports = {
  auth: auth
}