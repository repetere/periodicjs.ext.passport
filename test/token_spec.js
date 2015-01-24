var request = require('supertest');
var server = request.agent('http://localhost:8786');
var env = require('js-dom').env
var context = describe;
var expect = require('chai').expect;
var mocha = require('mocha');
  
describe('The Login Flow', function(){
  context('Auth: ',function() {
    it('it can register a user', registerUser());    
    it('it allows a current user to login', loginUser());
    it('uri that requires user to be logged in',loggedIn());
  })
});


  function registerUser() {
    return function(done) {
      server
      .get('/')
      .end(onResponse);

      function onResponse(err, res) {
        if (err) return done(err);
        getCsrfReg(function(token){
        server
        .post('/auth/user/register')
        .send({
          email:'test@test.com', 
          username: 'admin', 
          password: 'admin001',
          confirmpassword:'admin001' 
        })
        .expect(201)
        return done()
        });
      }
    };
  }

  function loginUser() {
    return function(done) {
      server
      .get('/')
      .expect(200)
      .end(onResponse);
      function onResponse(err, res) {
        if (err) return done(err);
        getCsrf(function(token){
          server
          .post('/auth/login')
          .send({ username: 'admin', password: 'admin',_csrf:token })
          .expect(200)
          done()
        });
      }
    };
  };


  function loggedIn() {
    return function(done) {
      server
      .get('/')                       
      .expect(200)
      .end(function(err, res){
        if (err) return done(err);
        getCsrf(function(token){
        expect(token).to.be.ok
        done()
        });
      });
    };
  }


function getCsrfReg(cb) {
  server
  .get('/auth/users/register')
  .end(function(err,res) {
    if (err) throw err;
    var html = res.text
    env(html,function(errors,window) {
      var $ = require('jquery')(window) 
      var csrf = $("input[name='_csrf']").val()
      cb(csrf);
    })
  })
}
  function getCsrf(cb) {
    server
    .get('/auth/login')
    .end(function(err,res) {
      if (err) throw err;
      var html = res.text
      env(html,function(errors,window) {
        var $ = require('jquery')(window) 
        var csrf = $("input[name='_csrf']").val()
        cb(csrf);
      })
    })
  }
