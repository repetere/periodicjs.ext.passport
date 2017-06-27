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
  periodic.logger.info('require,auth');
  if (req.isAuthenticated()) { 
    //link accounts
    //required fields
    //required activation
    //required second factor  
    next();
  } else if (utilities.controller.jsonReq(req)) { 
    res.status(401).send(routeUtils.formatResponse({
        status:401,
        result:'error',
        data: {
          error: new Error('Authentication required'),
        }
      }
    ));  
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
  const entitytype = utilities.auth.getEntityTypeFromReq({req});  
  const redirectURL = (req.originalUrl)
    ? `${utilities.routes[`${entitytype}_auth_login`]}?return_url=${req.originalUrl}`
    : utilities.routes[`${entitytype}_auth_login`];
  if (utilities.controller.jsonReq(req)) {
      res.send(routeUtils.formatResponse({data:{
        redirect: redirectURL,
      }
    }));
  } else {
    res.redirect(redirectURL);
  }
};

function loginView(req, res) {
  const entitytype = utilities.auth.getEntityTypeFromReq({req});  
  const viewtemplate = {
    // themename,
    viewname: 'auth/login',
    extname: 'periodicjs.ext.passport',
    // fileext,
  };
  const viewdata = {
    loginPost: utilities.routes[`${entitytype}_auth_login`],
  };
  periodic.core.controller.render(req, res, viewtemplate, viewdata)
}

function testView(req, res) {
  const viewtemplate = {
    // themename,
    viewname: 'auth/test',
    extname: 'periodicjs.ext.passport',
    // fileext,
  };
  const viewdata = {};
  periodic.core.controller.render(req, res, viewtemplate, viewdata)
}

function login(req, res) {
  const entitytype = utilities.auth.getEntityTypeFromReq({req});  
  periodic.logger.silly('starting login req.body', req.body);
  passport.authenticate('local', (err, user, info) => { 
    if (err) {
      periodic.core.controller.logError({
        req: req,
        err: err
      });
      if (req.flash) {
        req.flash('error', err);
      }
      periodic.core._utility_responder.error({ err, req, res });
    } else (!user){
      periodic.core._utility_responder.error({ err:new Error(passportSettings.errors.invalid_credentials), req, res });
    } else {
      req.logIn(user, (err) => {
        if (err) {
          periodic.core.controller.logError({
            req: req,
            err: err
          });
          if (req.flash) {
            req.flash('error', err);
          }
          periodic.core._utility_responder.error({ err, req, res });
        } else {
          const redirectURL = req.session.return_url || passportSettings.redirect[entitytype].logged_in_homepage;
          if (utilities.controller.jsonReq(req)) {
            res.send(routeUtils.formatResponse({
              result: 'success',
              data: {
                message: 'successfully logged in',
                redirect: redirectURL,
              }
            }));
          } else {
            res.redirect(redirectURL);
          }
        }
      });
    }
  });
}

module.exports = {
  ensureAuthenticated,
  forceAuthLogin,
  loginView,
  testView,
  login,
};