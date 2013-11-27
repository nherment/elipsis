var fs = require('fs')
var semver = require('semver')

var CONF_FILE = __dirname + '/../conf/conf.json'

var VERSION = 1

function readConf(path) {

  var conf
  try {
    conf = fs.readFileSync(CONF_FILE, 'utf8')
  } catch(e) {
    conf = '{}'
  }

  try {
    conf = JSON.parse(conf)
  } catch(e) {
    conf = {}
  }
  var specificConfObj = conf
  if(path) {
    var attrs = path.split('.')
    for(var i = 0 ; i < attrs.length ; i++) {
      specificConfObj = specificConfObj[attrs[i]]
      if(typeof specificConfObj !== 'object') {
        break;
      }
    }
  }

  return specificConfObj
}

function mergeConf(conf) {

  var oldConf = readConf()
  merge(conf, oldConf)

  fs.writeFileSync(CONF_FILE, JSON.stringify(oldConf, null, 2), 'utf8')
}

// TODO: deep merge
function merge(from, to) {
  for(var attr in from) {
    if(from.hasOwnProperty(attr)) {
      to[attr] = from[attr]
    }
  }
}

function checkUpdates() {
  var confVersion = readConf('version')
  if(!confVersion || confVersion < VERSION) {
    throw new Error('The configuration is not up to date. Please run `make configure`.')
  } else {
    console.log('configuration file up to date')
  }
}

function stampVersion() {
  mergeConf({version: VERSION})
}

module.exports = {
  readConf: readConf,
  mergeConf: mergeConf,
  checkUpdates: checkUpdates,
  stampVersion: stampVersion,
  VERSION: VERSION
}