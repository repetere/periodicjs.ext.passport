'use strict';
const periodic = require('periodicjs');
const utilities = require('../utilities');
const path = require('path');
const passportSettings = utilities.getSettings();
const routeUtils = periodic.utilities.routing;
const passport = utilities.passport;

/**
 * simple view for creating users/accountns
 * 
 * @param {object} req http request object 
 * @param {object} res http response object
 */
function registerView(req, res) {
  const entitytype = utilities.auth.getEntityTypeFromReq({ req, accountPath: utilities.paths.account_auth_register, userPath: utilities.paths.user_auth_register, });

  const viewtemplate = {
    // themename,
    viewname: 'user/register',
    extname: 'periodicjs.ext.passport',
    // fileext,
  };
  const viewdata = {
    loginPost: utilities.paths[`${entitytype}_auth_login`],
    registerPost: utilities.paths[`${entitytype}_auth_register`],
    entitytype,
  };
  periodic.core.controller.render(req, res, viewtemplate, viewdata);
}

function forgot(req, res, next) {
  const entitytype = utilities.auth.getEntityTypeFromReq({ req, accountPath: utilities.paths.account_auth_forgot, userPath: utilities.paths.user_auth_forgot, });
  const loginPath = routeUtils.route_prefix(passportSettings.redirect[entitytype].logged_in_homepage);
  const loginRedirectURL = (loginPath.indexOf('?')) ? loginPath + '&msg=forgot' : loginPath + '?msg=forgot';

  utilities.account.forgotPassword({
      req,
      email: req.body.email,
      entitytype,
      sendEmail: true,
    })
    .then(result => {
      // console.log({ result });
      if (utilities.controller.jsonReq(req)) {
        res.send(routeUtils.formatResponse({
          result: 'success',
          data: {
            result,
            redirect: loginRedirectURL,
          },
        }));
      } else {
        res.redirect(loginRedirectURL);
      }
    })
    .catch(next);
}

function resetPassword(req, res, next) {
  const entitytype = utilities.auth.getEntityTypeFromReq({ req, accountPath: utilities.paths.account_auth_forgot, userPath: utilities.paths.user_auth_forgot, });
  const loginPath = routeUtils.route_prefix(passportSettings.redirect[entitytype].logged_in_homepage);
  const loginRedirectURL = (loginPath.indexOf('?')) ? loginPath + '&msg=reset' : loginPath + '?msg=reset';

  utilities.account.getToken({
      req,
      token: req.params.token,
      entitytype,
    })
    .then(result => {
      return utilities.account.resetPassword({
        req,
        user: result.user,
        entitytype,
        sendEmail: true,
      });
    })
    .then(result => {
      if (utilities.controller.jsonReq(req)) {
        res.send(routeUtils.formatResponse({
          result: 'success',
          data: {
            result,
            redirect: loginRedirectURL,
          },
        }));
      } else {
        res.redirect(loginRedirectURL);
      }
    })
    .catch(next);
}

function getToken(req, res, next) {
  const entitytype = utilities.auth.getEntityTypeFromReq({ req, accountPath: utilities.paths.account_auth_forgot, userPath: utilities.paths.user_auth_forgot, });
  const loginPath = routeUtils.route_prefix(passportSettings.redirect[entitytype].logged_in_homepage);
  const loginRedirectURL = (loginPath.indexOf('?')) ? loginPath + '&msg=reset' : loginPath + '?msg=reset';

  utilities.account.getToken({
      req,
      token: req.params.token,
      entitytype,
    })
    .then(result => {
      req.controllerData = Object.assign({}, req.controllerData, {
        reset_token: result.reset_token,
      });
      next();
    })
    .catch(next);
}


/**
 * create a new user/account by validating requirements and sending welcome email
 * 
 * @param {object} req 
 * @param {object} res 
 * @param {function} next 
 */
function create(req, res, next) {
  const entitytype = utilities.auth.getEntityTypeFromReq({ req, });
  const user = Object.assign({}, req.body);
  const userRequest = Object.assign({}, req.body, req.query, req.controllerData);
  const loginRedirectURL = routeUtils.route_prefix(passportSettings.redirect[entitytype].logged_in_homepage);
  let dbCreatedUser;

  utilities.account.fastRegister({ user, entitytype, sendEmail: true, })
    .then(newDBCreatedUser => {
      dbCreatedUser = (newDBCreatedUser && typeof newDBCreatedUser.toJSON === 'function') ? newDBCreatedUser.toJSON() : newDBCreatedUser;
      const newUser = Object.assign({}, dbCreatedUser, { password: undefined, });
      if (utilities.controller.jsonReq(req)) {
        res.send(routeUtils.formatResponse({
          result: 'success',
          data: {
            user: newUser,
            redirect: loginRedirectURL,
          },
        }));
      } else {
        const signInOnCreate = (userRequest.signin_after_create === false || userRequest.signin_after_create === 'false' || passportSettings.registration.signin_after_create === false) ? false : passportSettings.registration.signin_after_create;
        if (signInOnCreate) {
          utilities.auth.loginUser({ req, res, passportSettings, utilities, routeUtils, user: newUser, });
        } else {
          res.redirect(loginRedirectURL);
        }
      }
    })
    .catch(err => {
      periodic.core.controller.renderError({
        err,
        req,
        res,
      });
    });

}

module.exports = {
  registerView,
  create,
  resetPassword,
  forgot,
  getToken,
};