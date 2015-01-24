var request = require('supertest');
var server = request.agent('http://localhost:8786');
var env = require('js-dom').env
var context = describe;
var expect = require('chai').expect;
var mocha = require('mocha');
  
describe('The Login Flow', function(){
  context('Auth: ',function() {
    it('will register a user', registerUser());    
    it('will allow a user to login', loginUser());
    it('will authorize a user on a uri that requires user to be logged in',loggedIn());
  })
  context('Forgot: ',function() {
    it('will show the forgot password view on request',getForgotPassword());
    xit('will allow a user to give an email to change password',postForgotPassword());
    xit('will show the reset form if the user has a valid token',getResetToken());
    xit('will show the login form once a user changes the password',postResetToken());
  });
  context("Social Auth: ",function() {
   xit('will allow users to authenticate with facebook',facebookAuth());
   xit('will allow users to authenticate with instagram',instagramAuth());
   xit('will allow users to authenticate with twitter',twitterAuth());
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
        getCsrfLogin(function(token){
        expect(token).to.be.ok
        done()
        });
      });
    };
  }


function getCsrfReg(cb) {
  server
  .get('/auth/user/register')
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
  function getCsrfLogin(cb) {
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

  function getForgotPassword() {
   return function(done){
   server
   .get('/auth/forgot')
   .expect(200)
   .end(function(err,res) {
     if (err) throw err;
     var html = res.text
     env(html,function(errors,window) {
       var $ = require('jquery')(window) 
       expect($('.text-left').text()).to.be.eql('Forgot Password')
       return done();
     });
   });
  }
  }

  function postForgotPassword() {
   return function(done){
   }
  }
  function getResetToken() {
   return function(done){
   }
  }
  function postResetToken() {
   return function(done){
   }
  }
  function facebookAuth() {
   return function(done){
   }
  }
  
  function instagramAuth() {
   return function(done){
   }
  }
  function twitterAuth() {
   return function(done){
   }
  }
