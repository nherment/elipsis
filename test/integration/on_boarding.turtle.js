var Turtle = require('turtle');

var turtle = new Turtle(8686);

turtle.server({
  path: __dirname + '/../../server.js',
  args: [],
  started: 1000,
  log: {
    silent: true
  }
});

turtle.template({
  name: 'jQuery',
  scripts: [
    __dirname + '/lib/jQuery-2.0.3.js',
    __dirname + '/lib/minilog.js',
    __dirname + '/lib/should.js'
  ]
});

turtle.client({template: 'jQuery'}).
  test({
    path: __dirname + "/client",
    filter: /\.onboarding\.client\.js$/im
  });

turtle.run();