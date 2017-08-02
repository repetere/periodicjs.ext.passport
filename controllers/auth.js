'use strict';
const periodic = require('periodicjs');
const utilities = require('../utilities');
const passportSettings = utilities.getSettings();
const routeUtils = periodic.utilities.routing;
const passport = utilities.passport;
const logger = periodic.logger;
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
  req.controllerData = Object.assign({}, req.controllerData);
  const entitytype = utilities.auth.getEntityTypeFromReq({
    req,
    accountPath: utilities.paths.account_auth_login,
    userPath: utilities.paths.user_auth_login,
  });
  // periodic.logger.info('require,auth');
  if (req.isAuthenticated()) {
    if (req.session.linkaccount === true) {
      const entitytype = utilities.auth.getEntityTypeFromReq({
        req,
        accountPath: utilities.paths.account_auth_login,
        userPath: utilities.paths.user_auth_login,
      });
      //link accounts

      utilities.auth.linkSocialAccount({
          req,
          findSocialAccountQuery: req.session.findSocialAccountQuery,
          newAccountData: req.session.newAccountData,
          linkAccountService: req.session.linkAccountService,
          linkAccountAttributes: req.session.linkAccountAttributes,
          entitytype,
        })
        .then(user => {
          req.user = user;
          logger.verbose('linked ', req.session.linkAccountService, ' account for ', req.user.id, req.user.email, req.user.username);
          req.session.linkAccount = false;
          delete req.session.linkAccount;
          delete req.session.linkAccountAttributes;
          delete req.session.linkAccountService;
          next();
        })
        .catch(next);
    }
    //required fields
    else if (passportSettings && passportSettings.registration.require_properties.length > 0 && passportSettings.registration.require_properties.filter(requiredProp => req.user[requiredProp]).length !== passportSettings.registration.require_properties.length && req.method === 'GET') {
      if (req.originalUrl.indexOf(utilities.paths[`${entitytype}_auth_complete`]) !== 0) {
        const requireActivationLink = `${utilities.paths[ `${entitytype}_auth_complete` ]}?return_url=${req.originalUrl}`;
        res.redirect(requireActivationLink);
      } else {
        next();
      }
    }
    //required activation
    else if (passportSettings && passportSettings.registration.require_activation && req.user.activated !== true && req.query.required !== 'activation' && req.method === 'GET'
    ) {
      if (req.originalUrl.indexOf(utilities.paths[ `${entitytype}_auth_complete` ]) !== 0) {
        const requireActivationLink = `${utilities.paths[ `${entitytype}_auth_complete` ]}?return_url=${req.originalUrl}`;
        res.redirect(requireActivationLink);
      } else {
        next();
      }
    }
    //required second factor
    else if (passportSettings && passportSettings.registration.require_second_factor !== false && req.controllerData.skip_mfa_check !== true && req.method === 'GET') {
      if (req.session.secondFactor === 'totp') {
        next();
      } else if (req.originalUrl.indexOf(`${utilities.paths[ `${entitytype}_auth_login` ]}${passportSettings.redirect[ entitytype ].second_factor_required}`) === 0 ){ 
        next();
      } else {
        const secondFactorLink = `${utilities.paths[ `${entitytype}_auth_login` ]}${passportSettings.redirect[ entitytype ].second_factor_required}?return_url=${req.originalUrl}`;
        // console.log({secondFactorLink})
        // res.redirect('/' + adminPostRoute + '/login-otp');
        res.redirect(secondFactorLink);
      }
    } else {
      next();
    }
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

function completeView(req, res) {
  const entitytype = utilities.auth.getEntityTypeFromReq({
    req, 
    accountPath: utilities.paths.account_auth_login,
    userPath: utilities.paths.user_auth_login,
  });  
  const viewtemplate = {
    // themename,
    viewname: 'auth/complete',
    extname: 'periodicjs.ext.passport',
    // fileext,
  };
  const viewdata = {
    entityType: entitytype,
    loginPaths: utilities.paths,
    loginPost: utilities.paths[`${entitytype}_auth_login`],
    completePost: utilities.paths[ `${entitytype}_auth_complete` ],
    missingProps: passportSettings.registration.require_properties.filter(requiredProp => typeof req.user[ requiredProp ] === 'undefined'),
    missingActivation: (passportSettings.registration.require_activation && !req.user.activated) ? true : false,
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
  completeView,
  login,
  logout,
  useCSRF,
};