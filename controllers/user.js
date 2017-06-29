'use strict';
const periodic = require('periodicjs');
const utilities = require('../utilities');
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
  const entitytype = utilities.auth.getEntityTypeFromReq({req});  
  const viewtemplate = {
    // themename,
    viewname: 'user/register',
    extname: 'periodicjs.ext.passport',
    // fileext,
  };
  const viewdata = {
    loginPost: utilities.paths[`${entitytype}_auth_login`],
    registerPost: utilities.paths[ `${entitytype}_auth_register` ],
    entitytype,
  };
  periodic.core.controller.render(req, res, viewtemplate, viewdata);
}

/**
 * create a new user/account by validating requirements and sending welcome email
 * 
 * @param {object} req 
 * @param {object} res 
 * @param {function} next 
 */
function create(req, res, next) {
  const entitytype = utilities.auth.getEntityTypeFromReq({req});  
  const user = Object.assign({}, req.body);
  const userRequest = Object.assign({}, req.body, req.query, req.controllerData);
  const coreDataModel = utilities.auth.getAuthCoreDataModel(userRequest);
  const loginRedirectURL = routeUtils.route_prefix(passportSettings.redirect[entitytype].logged_in_homepage);
  //validate user/account props
  //create activation data
  //create user document
  //send welcome email
  utilities.account.validate({user})
    .then(validatedUser => {
      return utilities.token.generateUserActivationData({ user: validatedUser });
    })
    .then(activationUser => {
      return coreDataModel.create({
        newdoc: activationUser,
      });
    })
    // .then(createdUser => {
    //   return periodic.core.email.send({ email, data: { user: createdUser } });
    // })
    .then(createdUser => {
      const newUser = Object.assign({}, createdUser, { password: undefined });
      if (utilities.controller.jsonReq(req)) { 
        res.send(routeUtils.formatResponse({
            result:'success',
            data: {
              user: newUser,
              redirect:loginRedirectURL,
            }
          }
        ));  
      } else {
        const signInOnCreate = (userRequest.signin_after_create === false || userRequest.signin_after_create === 'false' || passportSettings.registration.signin_after_create === false) ? false : passportSettings.registration.signin_after_create;
        console.log({ signInOnCreate });
        if (signInOnCreate) {
          utilities.auth.loginUser({ req, res, passportSettings, utilities, routeUtils, user:newUser, });
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
};