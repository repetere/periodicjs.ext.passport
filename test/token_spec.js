var request = require('supertest');
var server = request.agent('http://localhost:8786');
var context = describe;
var mocha = require('mocha');
  
describe('The Login Flow', function(){
  context('Auth: ',function() {
    xit('it can register a user', registerUser());    
    xit('it allows a current user to login', loginUser());
    it('uri that requires user to be logged in',loggedIn());
  })
});


  function registerUser() {
    return function(done) {
      server
      .post('/auth/user/register')
      .send({
        email:'test@test.com', 
        username: 'admin', 
        password: 'admin001',
        confirmpassword:'admin001' 
        })
      .expect(302)
      .end(onResponse);

      function onResponse(err, res) {
        if (err) return done(err);
        return done();
      }
    };
  }

  function loginUser() {
    return function(done) {
      server
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin' })
      .expect(201)
      .end(onResponse);

      function onResponse(err, res) {
        if (err) return done(err);
        return done();
      }
    };
  };


  function loggedIn() {
    return  function(done) {
      server
      .get('/')                       
      .expect(200)
      .end(function(err, res){
        if (err) return done(err);
        done()
      });
    };
  }
