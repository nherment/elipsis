
describe('on-boarding', function() {
  var logger = Minilog('account');
  var host = 'http://localhost:4300'

  it('no access before login', function(done) {

    $.get( host + '/vault')
      .done(function(response) {
        done(new Error('expected 401 on unauthorized vault access'))
      })
      .fail(function(xhr, status, error) {
        if(xhr.status === 401) {
          done()
        } else {
          logger.error(xhr.status + ': ' + xhr.responseText)
          logger.error(error)
          done(new Error(xhr.responseText))
        }
      })
  })

  it('create a new account', function(done) {

    $.post( host + '/login', {
      email: 'test_'+Date.now()+'@domain.tld',
      password: 'password'
    })
      .done(function(response) {
        done()
      })
      .fail(function(xhr, status, error) {
        logger.error(xhr.status + ': ' + xhr.responseText)
        logger.error(error)
        done(new Error(xhr.responseText))
      })
  })

  it('empty vaults after account creation', function(done) {

    $.get( host + '/vaults')
      .done(function(response) {
        if(!response || response.length > 0) {
          throw new Error('Expected empty vault on account creation')
        }
        done()
      })
      .fail(function(xhr, status, error) {
        logger.error(xhr.status + ': ' + xhr.responseText)
        logger.error(error)
        done(new Error(xhr.responseText))
      })
  })

  it('create a new vault', function(done) {

    var self = this

    self.vaultData = {
      name: 'gmail',
      password: 'my super secret password ' + Date.now()
    }

    $.post( host + '/vault', self.vaultData)
      .done(function(response) {
        done()
      })
      .fail(function(xhr, status, error) {
        logger.error(xhr.status + ': ' + xhr.responseText)
        logger.error(error)
        done(new Error(xhr.responseText))
      })
  })

  it('vault list updated after vault creation', function(done) {

    var self = this

    $.get( host + '/vaults')
      .done(function(response) {
        if(!response || response.length !== 1) {
          throw new Error('Expected 1 vault item')
        }
        self.vaultInfo = response[0]
        done()
      })
      .fail(function(xhr, status, error) {
        logger.error(xhr.status + ': ' + xhr.responseText)
        logger.error(error)
        done(new Error(xhr.responseText))
      })
  })

  it('read the created vault', function(done) {
    var self = this

    $.get( host + '/vault/'+self.vaultInfo.uid)
      .done(function(response) {
        if(response.name !== self.vaultInfo.name) {
          throw new Error('name mismatch')
        }
        if(response.name !== self.vaultData.name) {
          throw new Error('name mismatch')
        }
        if(response.password !== self.vaultData.password) {
          throw new Error('password mismatch')
        }
        done()
      })
      .fail(function(xhr, status, error) {
        logger.error(xhr.status + ': ' + xhr.responseText)
        logger.error(error)
        done(new Error(xhr.responseText))
      })
  })

  it('logout', function(done) {
    var self = this

    $.get( host + '/logout')
      .done(function(response) {
        done()
      })
      .fail(function(xhr, status, error) {
        logger.error(xhr.status + ': ' + xhr.responseText)
        logger.error(error)
        done(new Error(xhr.responseText))
      })
  })

  it('no access after logout', function(done) {

    var self = this

    $.get( host + '/vault/'+self.vaultInfo.uid)
      .done(function(response) {
        done(new Error('expected 401 on unauthorized vault access but got\n' + JSON.stringify(response)))
      })
      .fail(function(xhr, status, error) {
        if(xhr.status === 401) {
          done()
        } else {
          logger.error(xhr.status + ': ' + xhr.responseText)
          logger.error(error)
          done(new Error(xhr.responseText))
        }
      })
  })
})