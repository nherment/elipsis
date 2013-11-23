Logger = {
  debug: function(msg) {
    console.log(msg)
  },
  info: function(msg) {
    console.info(msg)
  },
  warn: function(msg) {
    console.warn(msg)
  },
  error: function(msg) {
    console.error(msg)
  },

  audit: function(accountEmail, action, details) {
    // TODO: save this in DB
    details.date = new Date()
    console.log('['+accountEmail+'] ('+action+') ' + JSON.stringify(details))
  }
}

module.exports = Logger