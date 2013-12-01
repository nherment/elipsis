
var ConfMgr           = require('../../install/ConfigurationManager.js')
var logger            = require('../util/Logger.js')
var ClientError       = require('../error/Errors.js').ClientError
var AuditActions      = require('../account/AuditActions.js')
var DBHelper          = require('../database/DBHelper.js').DBHelper
var PaymentGateway    = require('../payment/PaymentGateway.js')

var SubscriptionManagement = {}

SubscriptionManagement.subscribe = function(email, ipAddress, cardToken, callback) {
  DBHelper.Account.findByKey(email, function(err, account) {
    if(err) {
      logger.error(err)
      callback(err, undefined)

    } else if(!account) {
      logger.error('['+email+'] ['+ipAddress+'] subscription attempt but account does not exist')
      err = new Error('The account does not exist or is disabled')
      return callback(err, undefined);
    }

    if(account.stripe && account.stripe.subscription) {
      logger.info('['+account.email+'] cannot subscribe twice')
      return callback(new Error('You are already subscribed'), undefined)
    }

    var plan = 'gold-monthly'

    PaymentGateway.subscribe(account, cardToken, plan, function(err) {
      if(err) {
        logger.error('['+email+'] ['+ipAddress+'] failed to subscribe')
        callback(err)
      } else {
        DBHelper.Account.save(account, function(err, savedAccount) {

          if(err) {
            logger.error('['+email+'] ['+ipAddress+'] failed to subscribe')
            callback(err)
          } else {
            logger.info('['+email+'] ['+ipAddress+'] successfully subscribed to plan ['+plan+']')
            logger.audit(email, AuditActions.PLAN_SUBSCRIBE, ipAddress, {plan: plan})
            logger.notice('new subscription', email)

            logger.notify(email, 'Subscription confirmation',
              'Hi,\n\n' +

                'This is a confirmation email for your subscription to '+ConfMgr.readConf('application.websiteUrl')+'\n' +

                'Billing frequency is monthly and happens at the end of each month. The first invoice will be prorated.\n\n' +

                '- '+ConfMgr.readConf('notifications.niceName')+'\n' +
                ConfMgr.readConf('application.websiteUrl'))

            callback()
          }

        })
      }
    })

  })
}

SubscriptionManagement.cancelSubscription = function(email, ipAddress, callback) {

  DBHelper.Account.findByKey(email, function(err, account) {
    if(err) {
      logger.error(err)
      callback(err, undefined)

    } else if(!account) {
      logger.error('['+email+'] ['+ipAddress+'] subscription cancellation attempt but account does not exist')
      err = new Error('The account does not exist or is disabled')
      return callback(err, undefined);
    }

    if(!account.stripe || !account.stripe.subscription) {
      logger.info('['+account.email+'] account cannot unsubscribe because it has no subscription')
      callback(new Error('It appears you don\'t have any subscription to cancel'), undefined)
      return
    }

    var plan = 'gold-monthly'

    PaymentGateway.cancelSubscription(account, function(err) {
      if(err) {
        logger.error('['+email+'] ['+ipAddress+'] failed to cancel subscription')
        callback(err)
      } else {
        DBHelper.Account.save(account, function(err, savedAccount) {

          if(err) {
            logger.error('['+email+'] ['+ipAddress+'] failed to cancel subscription')
            callback(err)
          } else {
            logger.info('['+email+'] ['+ipAddress+'] successfully canceled subscription')
            logger.audit(email, AuditActions.PLAN_SUBSCRIBE, ipAddress, {plan: plan})
            logger.notice('subscription cancelled', email)

            logger.notify(email, 'Subscription cancelled',
              'Hi,\n\n' +

                'This is a confirmation email that your subscription to '+ConfMgr.readConf('application.websiteUrl')+' has been canceled.\n' +

                'If you have any question, feel free to answer to this email.\n\n' +

                '- '+ConfMgr.readConf('notifications.niceName')+'\n' +
                ConfMgr.readConf('application.websiteUrl'))

            callback()
          }

        })
      }
    })

  })
}

module.exports = SubscriptionManagement