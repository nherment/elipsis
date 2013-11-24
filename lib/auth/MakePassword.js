
var MakePassword = {}

MakePassword.generate = function (length, specialCharacters, prefix) {

  if (!length) {
    length = 10
  }

  if (prefix.length >= length) {
    return prefix
  }

  var pattern = /.*/

  if (!specialCharacters) {
    pattern = /\w\d/
  }

  if (prefix === undefined) {
    prefix = ''
  }

  var n = (Math.floor(Math.random() * 100) % 94) + 33

  var char = String.fromCharCode(n)

  if (!pattern.test(char)) {
    return MakePassword.generate(length, specialCharacters, prefix)
  }

  return MakePassword.generate(length, specialCharacters, prefix + char)
}

module.exports = MakePassword