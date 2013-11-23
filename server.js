var AccountManagement     = require('./lib/account/AccountManagement.js')
var ConfMgr               = require('./install/ConfigurationManager.js')
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
  app.use(express.cookieSession())
  app.use(express.session({ secret: sessionSecret }))
  app.use(express.csrf())

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
  if(!req.session || !req.session.account) {
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
  res.sendfile(__dirname + '/public/login.html')
})

app.post('/login', function(req, res) {
  var email = req.body.email

  var credentials = {
    password: req.body.password,
    yubikey: req.body.yubikey
  }

  AccountManagement.login(email, credentials, function(err, session) {
    req.session.data = session
    res.redirect('/vault/'+session.accountId)
  })
})

app.get('/vault', function(req, res) {
  if(secure(req, res)) {
    res.sendfile(__dirname + '/public/vault.html')
  }
})

app.post('/vault/:key', function(req, res) {
  if(secure(req, res)) {

  }
})


process.on('SIGINT', function() {
  server.close()
  toobusy.shutdown()
  process.exit()
})