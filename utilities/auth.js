'use strict';
const periodic = require('periodicjs');
const moment = require('moment');
const passportSettings = periodic.settings.extensions['periodicjs.ext.passport'];

/**
 * returns the core data model for either account login or user login
 * 
 * @param {object} authUser user data to query, it needs at least the entity type 
 * @returns {object} core data model for either querying the user or the account models
 */
function getAuthCoreDataModel(authUser) {
  return (authUser.entitytype === 'account') ?
    periodic.datas.get(passportSettings.data.account_core_data) :
    periodic.datas.get(passportSettings.data.user_core_data);
}

/**
 * saves entitytype and id into cookie for deserialization later
 * 
 * @param {object} user 
 * @param {function} done 
 */
function serialize(user, done) {
  done(null, {
    entitytype: user.entitytype,
    _id: user._id,
  });
}

/**
 * deserializes full user from database from session/cookie data
 * 
 * @param {object} userFromSession this hold the information saved in the user cookie/session 
 * @param {function} done callback function 
 */
function deserialize(userFromSession, done) {
  const coreDataModel = getAuthCoreDataModel(userFromSession);
  coreDataModel.load({ query: { _id: userFromSession._id, }, })
    .then(user => {
      done(null, user);
    })
    .catch(err => {
      done(err, false);
    });
}

function resetLoginLimiter(options) {
  const { user, } = options;
  return new Promise((resolve, reject) => {
    resolve(user);
  });
}

function incrementLoginLimiter(options) {
  const { user, } = options;
  return new Promise((resolve, reject) => {
    resolve(user);
  });
  /*
    user.extensionattributes = user.extensionattributes || {};
    if (!user.extensionattributes.login) {
      user.extensionattributes.login = {
        attempts: 0,
        timestamp: moment(),
        timestamp_date: new Date(),
        flagged: false,
        freezeTime: moment(),
        freezeTime_date: new Date()
      };
    }
    user.extensionattributes.login.attempts++;
    if (!user.extensionattributes.login.flagged) {
      if (moment(user.extensionattributes.login.timestamp).isBefore(moment().subtract(loginExtSettings.timeout.attempt_interval.time, loginExtSettings.timeout.attempt_interval.unit))) {
        user.extensionattributes.login.attempts = 1;
        user.extensionattributes.login.timestamp = moment();
        user.extensionattributes.login.timestamp_date = new Date();
      }
      else if (user.extensionattributes.login.attempts >= loginExtSettings.timeout.attempts && moment(user.extensionattributes.login.timestamp).isAfter(moment().subtract(loginExtSettings.timeout.attempt_interval.time, loginExtSettings.timeout.attempt_interval.unit))) {
        user.extensionattributes.login.flagged = true;
        user.extensionattributes.login.freezeTime = moment();
        user.extensionattributes.login.freezeTime_date = new Date();
      }
    }
    else {
      if (moment(user.extensionattributes.login.freezeTime).isBefore(moment().subtract(loginExtSettings.timeout.freeze_interval.time, loginExtSettings.timeout.freeze_interval.unit))) {
        user.extensionattributes.login.attempts = 1;
        user.extensionattributes.login.timestamp = moment();
        user.extensionattributes.login.timestamp_date = new Date();
        user.extensionattributes.login.flagged = false;
        user.extensionattributes.login.freezeTime = moment();
        user.extensionattributes.login.freezeTime_date = new Date();
      }
    }
    user.markModified('extensionattributes');
    return user;
  */
}

/**
 * passport verify callback for local strategy
 * 
 * @param {object} req 
 * @param {string} username 
 * @param {string} password 
 * @param {function} done 
 */
function localLoginVerifyCallback(req, username, password, done) {
  const userRequest = Object.assign({}, req.body, req.query, req.controllerData);
  const coreDataModel = getAuthCoreDataModel(userRequest);
  const usernameRegex = (typeof username === 'string') ? username.replace(/([^\w\d\s])/g, '\\$1') : username;

  authenticateUser({
    req,
    existingUserQuery: {
      $or: [{
        name: {
          $regex: new RegExp('^' + usernameRegex + '$', 'i'),
        },
      }, {
        email: {
          $regex: new RegExp('^' + usernameRegex + '$', 'i'),
        },
      }, ],
    },
    noUserCallback: () => {
      return done(null, false, {
        message: 'Unknown user ' + username,
      });
    },
    existingUserCallback: (user) => {
      if (!passportSettings.passport.use_password) {
        return done(null, user);
      } else {
        periodic.utilities.auth.comparePassword({
            candidatePassword: user.password,
            userPassword: password,
          })
          .then(isMatch => {
            if (isMatch) {
              if (passportSettings.timeout.use_limiter) {
                resetLoginLimiter({ user, }).then(user => {
                  return done(null, user);
                }).catch(done);
              } else {
                return done(null, user);
              }
            } else {
              return done(null, false, {
                message: 'Invalid password',
              });
            }
          }).catch(done);
      }
    },
    doneCallback: done,
  });
}

/**
 * this function is a generic handler for passport authentication, it allows for the same authentication logic to be used between single sign-on auth and local auth
 * 
 * @param {object} options.req http request object 
 * @param {object} options.existingUserQuery core data model query
 * @param {function} options.noUserCallback callback function to handle the scenario when the existingUserQuery does not return a user
 * @param {function} options.existingUserCallback callback function to handle the scenario when the existingUserQuery returns a user, typically this callback will handle things like, linking accounts or checking password hashes, the function is passed the returned user
 * @param {function} options.doneCallback callback function to passport, this will handle errors
 */
function authenticateUser(options) {
  const { req, existingUserQuery, noUserCallback, existingUserCallback, doneCallback, } = options;
  const userRequest = Object.assign({}, req.body, req.query, req.controllerData);
  const coreDataModel = getAuthCoreDataModel(userRequest);
  // const util = require('util')
  // console.log('existingUserQuery', util.inspect(existingUserQuery,{depth:10}));
  coreDataModel.load({
      query: existingUserQuery,
    })
    .then(user => {
      if (!user || !user._id) {
        noUserCallback();
      } else if (passportSettings.timeout.use_limiter) {
        incrementLoginLimiter({ user, }).then(user => {
          existingUserCallback(user);
        }).catch(doneCallback);
      } else {
        existingUserCallback(user);
      }
    })
    .catch(doneCallback);
}

function getEntityTypeFromReq(options) {
  const { req = {}, accountPath} = options;
  const reqCustomBody = Object.assign({
    entitytype:(accountPath && req.originalUrl && req.originalUrl.indexOf(accountPath) > -1) ? 'account' : 'user',
  }, req.body, req.query, req.controllerData);
  return (reqCustomBody.entitytype && reqCustomBody.entitytype === 'account') ?
    'account' :
    'user';
}

function loginUser(options) {
  const { req, res, passportSettings, utilities, routeUtils, user, entitytype = user.entitytype, } = options;
  req.logIn(user, (err) => {
    if (err) {
      periodic.core.controller.renderError({
        err,
        req,
        res,
        opts: { logError: true, },
      });
    } else {
      const redirectURL = req.session.return_url || passportSettings.redirect[entitytype].logged_in_homepage;
      if (utilities.controller.jsonReq(req)) {
        res.send(routeUtils.formatResponse({
          result: 'success',
          data: {
            message: 'successfully logged in',
            redirect: redirectURL,
          },
        }));
      } else {
        res.redirect(redirectURL);
      }
    }
  });
}

module.exports = {
  getAuthCoreDataModel,
  serialize,
  deserialize,
  resetLoginLimiter,
  incrementLoginLimiter,
  localLoginVerifyCallback,
  authenticateUser,
  getEntityTypeFromReq,
  loginUser,
};