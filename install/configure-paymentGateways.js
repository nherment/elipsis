
var ConfMgr     = require('./ConfigurationManager.js')
var ConfHandler = require('./ConfigurationHandler.js')
var uuid        = require('uuid')

function configure(IOHelper, callback) {

  var conf = ConfMgr.readConf()

  var appConfig = {
    stripeAPIKey: 'QxS27y5LqeD6Nirp3OYHi1Vj37zxqoQ5',
    stripePublishableKey: 'YOUR_PUBLISHABLE_KEY'
  }

  if(conf.paymentGateways) {
    if(conf.paymentGateways.stripeAPIKey) {
      appConfig.stripeAPIKey = conf.paymentGateways.stripeAPIKey
    }
    if(conf.paymentGateways.stripePublishableKey) {
      appConfig.stripePublishableKey = conf.paymentGateways.stripePublishableKey
    }
  }

  var opts = {
    title: "Payment Gateways Configuration",
    default: appConfig,
    confirm: true,
    entries: [
      {dataType: 'string', attr: 'stripeAPIKey', message: 'Stripe\'s API key'},
      {dataType: 'string', attr: 'stripePublishableKey', message: 'Stripe\'s publishable key'}
    ]
  }

  new ConfHandler(opts, IOHelper, function(appConfig) {
    ConfMgr.mergeConf({paymentGateways: appConfig})

    callback()
  })

}

module.exports = {
  configure: configure
}