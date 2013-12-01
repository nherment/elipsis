var logger  = require('../util/Logger.js')
var ConfMgr = require('../../install/ConfigurationManager.js')
var stripe  = require('stripe')(ConfMgr.readConf('paymentGateways.stripeAPIKey'))

var PaymentGateway = {}

PaymentGateway.registerUser = function(account, callback) {
  if(account.stripe) {
    setImmediate(function() {
      var err = new Error('['+account.email+'] is already registered in stripe')
      logger.error(err)
      callback(err)
    })
    return
  }

  stripe.customers.create({
    email: account.email,
  }, function(err, customer) {
    if(err) {
      logger.error(err)
      callback(err)
    } else {
      account.stripe = {
        id: customer.id
      }
      callback()
    }
  })
}

PaymentGateway.saveCreditCard = function(account, creditCardToken, callback) {

  if(!account.stripe || !account.stripe.id) {
    setImmediate(function() {
      var err = new Error('['+account.email+'] cannot save a credit card because the account is not registered in stripe')
      logger.error(err)
      callback(err)
    })
    return
  }

  if(account.stripe.card) {
    PaymentGateway.deleteCreditCard(account, function(err) {
      if(err) {
        callback(err)
      } else {
        PaymentGateway.addCreditCard(account, creditCardToken, function(err) {
          callback(err)
        })
      }
    })
  } else {
    PaymentGateway.addCreditCard(account, creditCardToken, function(err) {
      callback(err)
    })
  }
}

PaymentGateway.addCreditCard = function(account, creditCardToken, callback) {

  if(!account.stripe || !account.stripe.id) {
    setImmediate(function() {
      var err = new Error('['+account.email+'] cannot add a credit card because the account is not registered in stripe')
      logger.error(err)
      callback(err)
    })
    return
  }

  stripe.customers.createCard(
    account.stripe.id,
    {card: creditCardToken},
    function(err, card) {
      if(err) {
        logger.error(err)
        callback(err)
      } else {
        logger.info('['+account.email+'] new credit card added')
        account.stripe.card = card
        callback()
      }
    }
  )
}

PaymentGateway.deleteCreditCard = function(account, callback) {

  if(!account.stripe || !account.stripe.id || !account.stripe.card) {
    setImmediate(function() {
      var err = new Error('['+account.email+'] cannot remove a credit card because it is either not registered in stripe or it does not have a card')
      logger.error(err)
      callback(err)
    })
    return
  }

  stripe.customers.deleteCard(
    account.stripe.id,
    account.stripe.card.id,
    function(err, confirmation) {
      if(err) {
        logger.error(err)
        callback(err)
      } else {
        logger.info('['+account.email+'] credit card deleted')
        callback()
      }
    }
  )
}

PaymentGateway.subscribe = function(account, cardToken, plan, callback) {

  if(!account.stripe || !account.stripe.id) {
    setImmediate(function() {
      var err = new Error('['+account.email+'] cannot subscribe to plan ['+plan+'] because account is not registered in stripe')
      logger.error(err)
      callback(err)
    })
    return
  }

  stripe.customers.updateSubscription(
    account.stripe.id,
    {plan: plan, prorate: true, card: cardToken},
    function(err, subscription) {
      if(err) {
        logger.error(err)
        callback(err)
      } else {
        account.stripe.subscription = subscription
        logger.info('['+account.email+'] subscribed to plan ['+plan+']')
        callback()
      }
    }
  )
}

PaymentGateway.cancelSubscription = function(account, callback) {

  if(!account.stripe || !account.stripe.id) {
    setImmediate(function() {
      var err = new Error('['+account.email+'] cannot cancel subscription because account is either not registered in stripe or it does not have a card')
      logger.error(err)
      callback(err)
    })
    return
  }

  logger.info('['+account.email+'] cancelling subscription')

  stripe.customers.cancelSubscription(
    account.stripe.id,
    {at_period_end: true},
    function(err, confirmation) {
      if(err) {
        logger.error(err)
        callback(err)
      } else {
        account.stripe.subscription = null
        logger.info('['+account.email+'] canceled subscription')
        // TODO: bubble up effective cancellation date
        callback()
      }
    }
  )
}


module.exports = PaymentGateway