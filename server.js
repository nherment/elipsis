var HttpResponseAugmenter = require('./lib/error/HttpResponseAugmenter.js')
var AccountManagement     = require('./lib/account/AccountManagement.js')
var ConfMgr               = require('./install/ConfigurationManager.js')
var VaultManagement       = require('./lib/account/VaultManagement.js')
var logger                = require('./lib/util/Logger.js')
var ClientError           = require('./lib/error/Errors.js').ClientError
var optimist              = require('optimist')
var express               = require('express')
var toobusy               = require('toobusy')
var uuid                  = require('uuid')
var fs                    = require('fs')
var RedisStore            = require('connect-redis')(express)
var cluster               = require('cluster')

ConfMgr.checkUpdates()

var argv = optimist
  .usage('Usage: $0 --port [num] --workers [num]')
  .options('p', {
    alias : 'port'
  })
  .options('w', {
    alias : 'workers',
    default : require('os').cpus().length
  })
  .argv

if (argv.workers > 1 && cluster.isMaster) {

  for (var i = 0; i < argv.workers; i++) {
    cluster.fork()
  }

  cluster.on('exit', function(worker, code, signal) {
    logger.info('worker ' + worker.process.pid + ' died')
  })
  return;
}

var sessionSecret = ConfMgr.readConf('application.sessionSecret') || uuid.v4()
var sessionMaxAge = ConfMgr.readConf('application.sessionMaxAge') || 60*1000

var app = express()

app.configure(function () {
  app.use(function(req, res, next) {
    if(toobusy()) {
      res.send('The server is overloaded', 503);
    } else {
      next()
    }
  })
  app.use(express.favicon(__dirname + '/public/images/favicon.ico'));
  app.enable('trust proxy')
  app.use(express.static(__dirname + '/public'))
  app.use(express.cookieParser())
  app.use(express.cookieSession({ store: new RedisStore({}), secret: sessionSecret, cookie: {maxAge: sessionMaxAge }}))
//  app.use(express.session({ secret: sessionSecret }))
//  app.use(express.csrf())

  app.use(express.compress())
  app.use(express.json())
  app.use(express.urlencoded())
  app.use(HttpResponseAugmenter())
  app.use(app.router)
})

var port = argv.port || process.env.SAFEHOUSE_PORT || 4300

app.listen(port, '127.0.0.1', function() {
  console.log('server listening to http://' + require('os').hostname() + ':' + port)
})

function secure(req, res) {
  if(!req.session || !req.session.email) {
    res.redirect('/login')
    return false
  } else {
    return true
  }
}


app.get('/login', function(req, res) {
  if(req.session.email) {
    res.redirect('/vault')
  } else {
    res.sendfile(__dirname + '/public/login.html')
  }
})

app.post('/login', function(req, res) {
  var email = req.body.email

  var credentials = {
    password: req.body.password,
    activationToken: req.body.activationToken,
    yubikey: req.body.yubikey
  }

  AccountManagement.login(email, credentials, req.ip, function(err, session) {
    if(err) {
      res.error(err)
    } else {
      req.session.email = session.email
      req.session.hash  = session.hash
      res.redirect('/vault')
    }
  })
})

app.get('/register', function(req, res) {
  res.sendfile(__dirname + '/public/register.html')
})

app.post('/register', function(req, res) {
  var email = req.body.email

  var credentials = {
    password: req.body.password,
    activationToken: req.body.activationToken,
    yubikey: req.body.yubikey
  }

  AccountManagement.register(email, credentials, req.ip, function(err, session) {
    if(err) {
      res.error(err)
    } else {
      res.redirect('/registered')
    }
  })
})

app.get('/registered', function(req, res) {
  res.sendfile(__dirname + '/public/registered.html')
})

app.post('/account/update', function(req, res) {
  if(secure(req, res)) {

    var oldPwd = req.oldPassword

    var newPwd = req.newPassword
    var newPwdConf = req.newPasswordConfirmation

    if(newPwd === newPwdConf) {

      AccountManagement.update(req.session.email, req.body, function(err) {
        if(err) {
          res.error(err)
        } else {
          res.redirect('/logout?redirect=login')
        }
      })
    } else {
      res.error(new ClientError(ClientError.BAD_REQUEST, 'password confirmation is not the same as the password'))
    }
  }
})

app.get('/contact', function(req, res) {
  res.sendfile(__dirname + '/public/contact.html')
})

app.get('/pricing', function(req, res) {
  res.sendfile(__dirname + '/public/pricing.html')
})

app.get('/logout', function(req, res) {
  if(req.session) {
    req.session = null
  }
  if(req.query && req.query.redirect === 'login') {
    res.redirect('/login')
  } else {
    res.redirect('/')
  }
})

app.get('/audits/:from/:to', function(req, res) {
  if(secure(req, res)) {
    try {
      var from = parseInt(req.param('from'))
      var to = parseInt(req.param('to'))
    } catch(err) {}

    if(from !== undefined && to !== undefined && !isNaN(from) && !isNaN(to)) {
      AccountManagement.audit(req.session.email, from, to, function(err, audits) {
        if(err) {
          res.error(err)
        } else {
          res.send(audits)
        }
      })
    } else {
      res.error(new ClientError(ClientError.BAD_REQUEST, 'expected numbers from and to but got ['+from+'] and ['+to+']'))
    }
  }
})

app.get('/vault', function(req, res) {
  if(secure(req, res)) {
    res.sendfile(__dirname + '/public/vault.html')
  }
})

app.get('/account', function(req, res) {
  if(secure(req, res)) {
    res.sendfile(__dirname + '/public/account.html')
  }
})

app.get('/vaults', function(req, res) {
  if(secure(req, res)) {
    VaultManagement.listVaults(req.ip, req.session.email, req.session.hash, function(err, vaults) {
      if(err) {
        res.error(err)
      } else {
        res.send(vaults)
      }
    })
  }
})

app.post('/vault', function(req, res) {
  if(secure(req, res)) {
    VaultManagement.addVault(req.ip, req.session.email, req.session.hash, req.body, function(err, vaultInfo) {
      if(err) {
        res.error(err)
      } else {
        if(req.query && req.query.redirect) {
          res.redirect('/vault')
        } else {
          res.send(vaultInfo)
        }
      }
    })
  }
})

app.get('/vault/:uid', function(req, res) {
  if(secure(req, res)) {
    VaultManagement.readVault(req.ip, req.session.email, req.session.hash, req.param('uid'), function(err, vaultData) {
      if(err) {
        res.error(err)
      } else {
        res.send(vaultData.secret)
      }
    })
  }
})

app.get('/vault/delete/:uid', function(req, res) {
  if(secure(req, res)) {
    VaultManagement.removeVault(req.ip, req.session.email, req.param('uid'), function(err) {
      if(err) {
        res.error(err)
      } else {
        if(req.query && req.query.redirect) {
          res.redirect('/vault')
        } else {
          res.send({status: 'ok'})
        }
      }
    })
  }
})


//process.on('SIGINT', function() {
//  server.close()
////  toobusy.shutdown()
//  process.exit()
//})