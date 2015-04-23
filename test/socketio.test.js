var assert = require('assert');
var request = require('request').defaults({ jar: true });
var createApplication = require('./fixture');
var io = require('socket.io-client');
var parser = require('cookie-parser')('feathers-rocks');
var _ = require('lodash');

describe('SocketIO API authentication', function() {
  var options = {
    transports: ['websocket'],
    forceNew: true
  };
  var server, sessionId;

  before(function(done) {
    server = createApplication('socketer', 'testing').listen(7777);
    server.on('listening', function() {
      done();
    });
  });

  after(function() {
    server.close();
  });

  it('logging in and requesting Todos returns the logged in user', function(done) {
    request({
      url: 'http://localhost:7777/login',
      method: 'POST',
      form: {
        username: 'socketer',
        password: 'testing'
      }
    }, function(err, res) {
      var fakeReq = {
        headers: {
          cookie: res.headers['set-cookie'][0]
        }
      };

      parser(fakeReq, {}, function() {
        var cookies = fakeReq.signedCookies || fakeReq.cookies;
        sessionId = cookies['connect.sid'];

        var socket = io('http://localhost:7777', _.extend({
          query: 'session_id=' + sessionId
        }, options));

        socket.on('disconnect', function() {
          done();
        });

        socket.on('connect', function() {
          socket.emit('todos::get', 'Sockets', function(error, todo) {
            assert.deepEqual(todo, {
              id: 'Sockets',
              text: 'You have to do Sockets!',
              user: { id: 'socketer' }
            });
            socket.disconnect();
          });
        });
      });
    });
  });

  it('sending no session id returns an error', function(done) {
    var socket = io('http://localhost:7777', options);

    socket.on('error', function(error) {
      assert.equal(error, 'No session found');
      done();
    });
  });

  it.skip('allows anonymous users', function(done) {
    var socket = io('http://localhost:7777', {
      query: 'session_id=' + sessionId,
      forceNew: true
    });

    socket.on('disconnect', function() {
      done();
    });

    socket.on('error', function() {
      console.log(arguments);
    });

    socket.on('connect', function() {
      console.log('COnnected?')
      socket.emit('todos::get', 'Sockets', function(error, todo) {
        console.log(arguments);
        assert.deepEqual(todo, {
          id: 'Sockets',
          text: 'You have to do Sockets!',
          user: { id: 'socketer' }
        });
        socket.disconnect();
      });
    });
  });
});
