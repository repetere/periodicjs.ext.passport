'use strict';
const periodic = require('periodicjs');
const utilities = require('../utilities');
const passportSettings = utilities.getSettings();
const routeUtils = periodic.utilities.routing;
const passport = utilities.passport;
// const auth_route_prefix = passportSettings.routing.authenication_route_prefix;
// const auth_route = periodic.utilities.routing.route_prefix(auth_route_prefix);
// console.log({ utilities });

/**
 * make sure a user is authenticated, if not logged in, send them to login page and return them to original resource after login
 * @param  {object} req
 * @param  {object} res
 * @return {Function} next() callback
 */
function ensureAuthenticated(req, res, next) {
  // periodic.logger.info('require,auth');
  if (req.isAuthenticated()) {
    //link accounts
    //required fields
    //required activation
    //required second factor  
    next();
  } else if (utilities.controller.jsonReq(req)) {
    res.status(401).send(routeUtils.formatResponse({
      status: 401,
      result: 'error',
      data: {
        error: new Error('Authentication required'),
      },
    }));
  } else {
    forceAuthLogin(req, res);
  }
}

/**
 * redirects a request to an authenticated resource to a redirect url 
 * 
 * @param {any} req 
 * @param {any} res 
 */
function forceAuthLogin(req, res) {
  const loginPath = routeUtils.admin_prefix(passportSettings.routing.login);
  req = utilities.controller.setReturnUrl(req);
  const entitytype = utilities.auth.getEntityTypeFromReq({
    req,
    accountPath: utilities.paths.account_auth_login,
    userPath: utilities.paths.user_auth_login,
  });
  const redirectURL = (req.originalUrl) ?
    `${utilities.paths[`${entitytype}_auth_login`]}?return_url=${req.originalUrl}`
    : utilities.paths[`${entitytype}_auth_login`];
  if (utilities.controller.jsonReq(req)) {
    res.send(routeUtils.formatResponse({ data:{
      redirect: redirectURL,
    },
    }));
  } else {
    res.redirect(redirectURL);
  }
}

function loginView(req, res) {
  const entitytype = utilities.auth.getEntityTypeFromReq({
    req,
    accountPath: utilities.paths.account_auth_login,
    userPath: utilities.paths.user_auth_login,
  });  
  const viewtemplate = {
    // themename,
    viewname: 'auth/login',
    extname: 'periodicjs.ext.passport',
    // fileext,
  };
  const flashMsg = (req.query.msg) ? req.query.msg.toString() : false;
  const viewdata = {
    entityType: entitytype,
    loginPaths: utilities.paths,
    loginPost: utilities.paths[`${entitytype}_auth_login`],
    registerPost: utilities.paths[`${entitytype}_auth_register`],
    forgotPost: utilities.paths[ `${entitytype}_auth_forgot` ],
    notification: (flashMsg)?passportSettings.notifications[flashMsg]:false,
  };
  periodic.core.controller.render(req, res, viewtemplate, viewdata);
}

function resetView(req, res) {
  const entitytype = utilities.auth.getEntityTypeFromReq({
    req,
    accountPath: utilities.paths.account_auth_reset,
    userPath: utilities.paths.user_auth_reset,
  });  
  const viewtemplate = {
    // themename,
    viewname: 'user/reset',
    extname: 'periodicjs.ext.passport',
    // fileext,
  };
  const flashMsg = (req.query.msg) ? req.query.msg.toString() : false;
  const viewdata = {
    entitytype,
    loginPaths: utilities.paths,
    loginPost: utilities.paths[`${entitytype}_auth_login`],
    registerPost: utilities.paths[`${entitytype}_auth_register`],
    resetPost: utilities.paths[ `${entitytype}_auth_reset` ],
    notification: (flashMsg)?passportSettings.notifications[flashMsg]:false,
  };
  periodic.core.controller.render(req, res, viewtemplate, viewdata);
}

function forgotView(req, res) {
  const entitytype = utilities.auth.getEntityTypeFromReq({
    req, 
    accountPath: utilities.paths.account_auth_login,
    userPath: utilities.paths.user_auth_login,
  });  
  const viewtemplate = {
    // themename,
    viewname: 'auth/forgot',
    extname: 'periodicjs.ext.passport',
    // fileext,
  };
  const viewdata = {
    entityType: entitytype,
    loginPaths: utilities.paths,
    loginPost: utilities.paths[`${entitytype}_auth_login`],
    registerPost: utilities.paths[`${entitytype}_auth_register`],
    forgotPost: utilities.paths[`${entitytype}_auth_forgot`],
  };
  periodic.core.controller.render(req, res, viewtemplate, viewdata);
}

function login(req, res, next) {
  const entitytype = utilities.auth.getEntityTypeFromReq({ req, });  
  // periodic.logger.silly('starting login req.body', req.body);
  passport.authenticate('local', (err, user, info) => { 
      // console.log('passport authenticate local', { err, user, info });  
    if (err) {
      periodic.core.controller.logError({
        req: req,
        err: err,
      });
      if (req.flash) {
        req.flash('error', err);
      }
      periodic.core.controller.renderError({ err, req, res, });
    } else if(!user){
      periodic.core.controller.renderError({
        err: new Error(passportSettings.errors.invalid_credentials),
        req,
        res,
      });
    } else {
      utilities.auth.loginUser({ req, res, passportSettings, utilities, routeUtils, user, });
    }
  })(req, res, next);
}

function logout(req, res) {
  // console.log('loging out', req.user);
  const entitytype = req.user.entitytype || 'user';  
  const redirectURL = req.session.return_url || passportSettings.redirect[entitytype].logged_out_homepage;
  
  req.logout();
  req.session.destroy((err) => {
    if (err) {
      periodic.core.controller.renderError({
        err,
        req,
        res,
      });  
    } else if (utilities.controller.jsonReq(req)) {
      res.send(routeUtils.formatResponse({
        result: 'success',
        data: {
          message: 'successfully logged out',
          redirect: redirectURL,
        },
      }));
    } else {
      res.redirect(redirectURL);
    }     
  });
}

function useCSRF(req, res, next) {
  res.locals.token = req.csrfToken();
  next();
}

module.exports = {
  ensureAuthenticated,
  forceAuthLogin,
  loginView,
  forgotView,
  resetView,
  login,
  logout,
  useCSRF,
};