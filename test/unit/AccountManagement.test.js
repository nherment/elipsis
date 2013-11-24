var AccountManagement = require('../../lib/account/AccountManagement.js')

var assert = require('assert')

describe('email format validation', function() {

  it('should accept anything with an @ somewhere in the middle', function() {
    assert.ok(AccountManagement.looksLikeAnEmail('foo@domain.tld'))
    assert.ok(AccountManagement.looksLikeAnEmail('foo@locahost'))
  })

  it('should invalidate non emails', function() {

    assert.ok(!AccountManagement.looksLikeAnEmail('@locahost'))
    assert.ok(!AccountManagement.looksLikeAnEmail('@domain.tld'))
    assert.ok(!AccountManagement.looksLikeAnEmail('@'))
    assert.ok(!AccountManagement.looksLikeAnEmail('user@'))
  })

})