
var _               = require("underscore")
var DB              = require("./DB.js").DB
var DBReady         = require("./DB.js").Event
var EventEmitter    = require('events').EventEmitter

var DBHelper = {}

DBReady.on('ready', function(){
  module.exports.Event.emit('ready')
})

function Helper(collectionName, keyName) {

  this.findOne = function(query, options, callback) {

    return DB.findOne(collectionName, query, options, callback)

  }

  this.findByKey = function(key, options, callback) {

    var query = {}
    query[keyName] = key

    return DB.findOne(collectionName, query, options, callback)
  }

  this.find = function(query, fields_or_options, options_or_callback, callback) {

    return DB.find(collectionName, query, fields_or_options, options_or_callback, callback)

  }

  this.count = function(query, optsOrCallback, callback) {
    return DB.count(collectionName, query, optsOrCallback, callback)
  }

  this.update = function(query, obj, options, callback) {

    return DB.update(collectionName, query, obj, options, callback)

  }

  this.save = function(obj, callback) {

    if(obj._id) {

      return DB.update(collectionName, {"_id":obj._id}, obj, {safe: true}, callback)

    } else if(_.isArray(obj)) {

      var callbackCount = obj.length

      console.log("It's an array of length ["+callbackCount+"]")

      var error
      var results = []

      var doneCallback = function(err, result) {

        callbackCount --

        if(err) {
          console.error(err)
          error = new Error("Multiple errors while saving objects")
        }

        if(result) {
          results.push(result)
        }

        if(callbackCount === 0) {
          callback(error, result)
        }

      }

      for(var i = 0 ; i < obj.length ; i++) {

        if(obj[i] && obj[i]._id) {
          return DB.update(collectionName, {"_id": obj[i]._id}, obj[i], {safe: true}, function(err, result) {
            doneCallback(err, result)
          })
        } else {
          return DB.save(collectionName, obj[i], function(err, result) {
            doneCallback(err, result)
          })
        }

      }

    } else {

      return DB.save(collectionName, obj, callback)

    }
  }

  this.findAndModify = function(query, sortOrder, update, options, callback) {
    return DB.findAndModify(collectionName, query, sortOrder, update, options, callback)
  }

  this.remove = function(selector, option_or_callback, callback) {
    return DB.remove(collectionName, selector, option_or_callback, callback)
  }
}

DBHelper.Account = new Helper("accounts", "email")
DBHelper.Vault   = new Helper("vaults", "uid")
DBHelper.Audit   = new Helper("audits", "email")

module.exports = {
  DBHelper: DBHelper,
  Event: new EventEmitter()
}
