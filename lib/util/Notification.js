
var ConfMgr = require('../../install/ConfigurationManager.js')
var logger = require('./Logger.js')
var nodemailer = require('nodemailer')
var conf = ConfMgr.readConf('smtp')

var transport = nodemailer.createTransport("SMTP", {
  host: conf.hostname,
  secureConnection: conf.secure,
  port: conf.port,
  auth: {
    user: conf.user,
    pass: conf.password
  }
})

function send(target, subject, content) {

  var message = {
    from: '"elipsis.io" <contact@elipsis.io>',
    to: target,
    subject: subject,
    headers: {
      'X-Laziness-level': 1000
    },
    text: content
  }

  logger.info('Sending notification ['+subject+'] to ['+target+']')
  transport.sendMail(message, function(err) {
    if(err){
      logger.error(err)
    } else {
      logger.info('notification ['+subject+'] sent to ['+target+']')
    }
  })

}

module.exports = {
  send: send
}