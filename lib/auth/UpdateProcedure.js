
var ConfMgr         = require('../../install/ConfigurationManager.js')
var logger          = require('../util/Logger.js')

var yubico          = ConfMgr.readConf('yubico.enabled') || false

// role should be one of required | optional
var middlewares = []

//middlewares.push({
//  name: 'password reset',
//  middleware: require('./middleware/reset.js'),
//  role: 'required'
//})

middlewares.push({
  name: 'password',
  middleware: require('./middleware/password.js'),
  role: 'required'
})

middlewares.push({
  name: 'hash',
  middleware: require('./middleware/hash.js'),
  role: 'required'
})

//if(yubico) {
//  middlewares.push({
//    name: 'yubikey',
//    middleware: require('./middleware/yubikey.js'),
//    role: 'required'
//  })
//}

function UpdateProcedure() {

  var iteration = 0;

  this.run = function(oldCredentials, newCredentials, account, session, callback) {
    next(oldCredentials, newCredentials, account, session, function(err) {
      callback(err)
    })
  }

  function next(oldCredentials, newCredentials, account, session, callback) {
    if(middlewares.length > iteration) {
      var m = middlewares[iteration]
      logger.info('update middleware ['+m.name+']')
      m.middleware.update(oldCredentials, newCredentials, account, session, function(err, middlewareSession) {
        session[m.name] = middlewareSession
        if(err && m.role === 'required') {
          setImmediate(function() {
            callback(err)
          })
        } else {
          iteration ++
          setImmediate(function() {
            next(oldCredentials, newCredentials, account, session, callback)
          })
        }
      })
    } else {
      setImmediate(function() {
        callback()
      })
    }
  }

}

module.exports = UpdateProcedure