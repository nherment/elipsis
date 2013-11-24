var HttpResponseAugmenter = require('./lib/error/HttpResponseAugmenter.js')
var AccountManagement     = require('./lib/account/AccountManagement.js')
var ConfMgr               = require('./install/ConfigurationManager.js')
var VaultManagement       = require('./lib/account/VaultManagement.js')
var logger                = require('./lib/util/Logger.js')
var optimist              = require('optimist')
var express               = require('express')
var toobusy               = require('toobusy')
var uuid                  = require('uuid')

var sessionSecret = ConfMgr.readConf('application.sessionSecret') || uuid.v4()

var argv = optimist
  .usage('Usage: $0 --port [num]')
  .argv

var app = express()

app.configure(function () {
  app.use(function(req, res, next) {
    if(toobusy()) {
      res.send('The server is overloaded', 503);
    } else {
      next()
    }
  })
  app.use(express.static(__dirname + '/public'))

  app.use(express.cookieParser())
  app.use(express.cookieSession({ secret: sessionSecret }))
  app.use(express.session({ secret: sessionSecret }))
//  app.use(express.csrf())

  app.use(express.compress())
  app.use(express.json())
  app.use(express.urlencoded())
  app.use(HttpResponseAugmenter())
  app.use(app.router)
})

var port = argv.port || process.env.SAFEHOUSE_PORT || 4300

app.listen(port, '::', function() {
  console.log('server listening to http://' + require('os').hostname() + ':' + port)
})

function secure(req, res) {
  if(!req.session || !req.session.email) {
    res.send(401)
    return false
  } else {
    return true
  }
}


app.get('/login', function(req, res) {
  res.sendfile(__dirname + '/public/login.html')
})
app.get('/logout', function(req, res) {
  if(req.session) {
    req.session = null
  }
  res.sendfile(__dirname + '/public/login.html')
})

app.post('/login', function(req, res) {
  var email = req.body.email

  var credentials = {
    password: req.body.password,
    yubikey: req.body.yubikey
  }

  AccountManagement.login(email, credentials, function(err, session) {
    if(err) {
      res.error(err)
    } else {
      req.session.email = session.email
      req.session.hash  = session.hash
      res.redirect('/vault')
    }
  })
})

app.get('/vault', function(req, res) {
  if(secure(req, res)) {
    res.sendfile(__dirname + '/public/vault.html')
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
        res.send(vaultInfo)
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
        res.send(vaultData)
      }
    })
  }
})

app.delete('/vault/:uid', function(req, res) {
  if(secure(req, res)) {
    VaultManagement.removeVault(req.ip, req.session.email, req.param('uid'), function(err) {
      if(err) {
        res.error(err)
      } else {
        res.send({status: 'ok'})
      }
    })
  }
})


process.on('SIGINT', function() {
  server.close()
  toobusy.shutdown()
  process.exit()
})