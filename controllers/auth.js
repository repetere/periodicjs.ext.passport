'use strict';
const periodic = require('periodicjs');
const utilities = require('../utilities');
const passportSettings = utilities.getSettings();
const routeUtils = periodic.utilities.routing;
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
  const redirectURL = (req.originalUrl)
    ? `${utilities.routes.login}?return_url=${req.originalUrl}`
    : utilities.routes.login;
  if (utilities.controller.jsonReq(req)) {
      res.send(routeUtils.formatResponse({data:{
        redirect: redirectURL,
      }
    }));
  } else {
    res.redirect(redirectURL);
  }
};

module.exports = {
  ensureAuthenticated,
  forceAuthLogin,
};