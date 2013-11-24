var util = require('util')


//---------------------------------------//
//            ABSTRACT ERROR             //
//---------------------------------------//

var AbstractError = function (msg, constr) {
  Error.captureStackTrace(this, constr || this)
  this.message = msg || 'Error'
}
util.inherits(AbstractError, Error)
AbstractError.prototype.name = 'Abstract Error'

//---------------------------------------//
//             FIELD ERROR               //
//---------------------------------------//

var FieldError = function (type, field, details) {

  this.type = type
  this.field = field

  var msg
  switch(type) {
    case FieldError.MISSING:
      msg = 'Field ['+field+'] is required'
      break
    case FieldError.WRONG_FORMAT:
      msg = 'Field ['+field+'] is not formatted correctly. Expected format is ['+details+']'
      break
    case FieldError.INVALID:
      msg = 'Field ['+field+'] is invalid. ' + details
      break
    default:
      msg = type
      break
  }

  FieldError.super_.call(this, msg, this.constructor)
}
util.inherits(FieldError, AbstractError)
FieldError.prototype.message = 'Field Error'

FieldError.MISSING      = 'MISSING'
FieldError.WRONG_FORMAT = 'WRONG_FORMAT'
FieldError.INVALID      = 'INVALID'

FieldError.prototype.type = undefined; // this line does nothing but is here for documentation
FieldError.prototype.field = undefined; // this line does nothing but is here for documentation

//---------------------------------------//
//             CLIENT ERROR              //
//---------------------------------------//

// Used when a client sends a wrong request. Codes match HTTP 400 errors

var ClientError = function (type, msg) {

  this.getType = function() {
    return type;
  }

  ClientError.super_.call(this, msg, this.constructor)

}

util.inherits(ClientError, AbstractError)
ClientError.prototype.message = 'Client Error'

ClientError.BAD_REQUEST                     = 400
ClientError.UNAUTHORIZED                    = 401
ClientError.PAYMENT_REQUIRED                = 402
ClientError.FORBIDDEN                       = 403
ClientError.NOT_FOUND                       = 404
ClientError.METHOD_NOT_ALLOWED              = 405
ClientError.NOT_ACCEPTABLE                  = 406
ClientError.REQUEST_TIMEOUT                 = 408
ClientError.CONFLICT                        = 409
ClientError.GONE                            = 410
ClientError.UNSUPPORTED_MEDIA_TYPE          = 415
ClientError.REQUESTED_RANGE_NOT_SATISFIABLE = 416
ClientError.EXPECTATION_FAILED              = 417
ClientError.AUTHENTICATION_TIMEOUT          = 419
ClientError.ENHANCE_YOUR_CALM               = 400


module.exports = {
  FieldError: FieldError,
  ClientError: ClientError
}