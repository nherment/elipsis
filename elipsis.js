var HttpResponseAugmenter = require('./lib/error/HttpResponseAugmenter.js')
var AccountManagement     = require('./lib/account/AccountManagement.js')
var ConfMgr               = require('./install/ConfigurationManager.js')
var ClientError           = require('./lib/error/Errors.js').ClientError
var VaultManagement       = require('./lib/account/VaultManagement.js')
var logger                = require('./lib/util/Logger.js')
var optimist              = require('optimist')
var express               = require('express')
var toobusy               = require('toobusy')
var cluster               = require('cluster')
var uuid                  = require('uuid')
var fs                    = require('fs')
var compression = require('compression')
var cookieParser = require('cookie-parser')
var csrf = require('csurf')
var session = require('express-session')
var serveStatic = require('serve-static')
var RedisStore = require('connect-redis')(session)
var favicon = require('serve-favicon')

var bodyParser = require('body-parser')

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
  return
} else if(cluster.isWorker) {
  console.log('Starting worker #', cluster.worker.id)
}

if(cluster.isWorker && ConfMgr.readConf('application.nodetimeKey')) {
  require('nodetime').profile({
    accountKey: ConfMgr.readConf('application.nodetimeKey'),
    appName: 'elipsis'
  })
}

var sessionSecret = ConfMgr.readConf('application.sessionSecret') || uuid.v4()
var sessionMaxAge = ConfMgr.readConf('application.sessionMaxAge') || 60*1000

var app = express()

app.use(function(req, res, next) {
  if(toobusy()) {
    res.send('The server is overloaded', 503);
  } else {
    next()
  }
})
app.use(favicon(__dirname + '/public/images/favicon.ico'));
app.enable('trust proxy')
app.use(compression())
app.use(serveStatic(__dirname + '/public', { maxAge: 3600*1000}))
app.use(cookieParser())

var RedisConf = {
  host: ConfMgr.readConf('redis.hostname'),
  port: ConfMgr.readConf('redis.port'),
  ttl: ConfMgr.readConf('redis.ttl'),
  pass: ConfMgr.readConf('redis.password'),
  prefix: 'elipsis_'
}

app.use(session({
  secret: sessionSecret,
  store: new RedisStore(RedisConf),
  resave: true,
  saveUninitialized: true,
  secure: true
}))

app.use(bodyParser.urlencoded({extended: false}))
app.use(HttpResponseAugmenter())

var api = express.Router({
  caseSensitive: true,
  strict: true
})
// api.use(csrf())

app.use('/api', api)

var port = argv.port || process.env.SAFEHOUSE_PORT || 4300

app.listen(port, '127.0.0.1', function() {
  logger.info('server listening to http://' + require('os').hostname() + ':' + port)
})

function secure(req, res) {
  if(!req.session || !req.session.email) {
    logger.warn('access denied to ' + req.url + ' because there is no valid session ' + req.session.id)
    if(req.query && req.query.redirect == 0) {
      res.send({reason: 'Authentication required'}, 401)
    } else {
      res.redirect('/login')
    }
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


app.get('/status', function(req, res) {
  res.send('We have not received any government regarding a user. We have not received any government request of any kind.')
})

api.post('/login', function(req, res) {
  logger.info('req /api/login' + req.session.id)
  var email = req.body.email

  var credentials = {
    password: req.body.password,
    activationToken: req.body.activationToken,
    yubikey: req.body.yubikey
  }

  logger.info('login attempt', email, credentials)

  AccountManagement.login(email, credentials, req.ip, function(err, session) {
    if(err) {
      res.error(err)
    } else {
      //req.session.upgrade( email )
      req.session.email = session.email
      req.session.token  = session.hash
      req.session.save(function() {
        res.redirect('/vault')
      })
    }
  })
})

app.get('/register', function(req, res) {
  res.sendfile(__dirname + '/public/register.html')
})

api.post('/register', function(req, res) {
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

api.post('/account/update', function(req, res) {
  if(secure(req, res)) {

    var oldPwd = req.oldPassword

    var newPwd = req.newPassword
    var newPwdConf = req.newPasswordConfirmation

    if(newPwd === newPwdConf) {

      AccountManagement.update(req.session.email, req.body, req.ip, function(err) {
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
    req.session.destroy()
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
    VaultManagement.listVaults(req.ip, req.session.email, req.session.token, function(err, vaults) {
      if(err) {
        res.error(err)
      } else {
        res.send(vaults)
      }
    })
  }
})

api.post('/vault', function(req, res) {
  if(secure(req, res)) {
    VaultManagement.saveVault(req.ip, req.session.email, req.session.token, req.body, function(err, vaultInfo) {
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

api.get('/vault/:uid', function(req, res) {
  if(secure(req, res)) {
    VaultManagement.readVault(req.ip, req.session.email, req.session.token, req.param('uid'), function(err, vaultData) {
      if(err) {
        res.error(err)
      } else {
        res.send(vaultData.secret)
      }
    })
  }
})

api.get('/vault/delete/:uid', function(req, res) {
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
