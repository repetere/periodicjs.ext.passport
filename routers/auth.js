'use strict';

const periodic = require('periodicjs');
const csrf = require('csurf');
const controllers = require('../controllers');
const utilities = require('../utilities');
const authRouter = periodic.express.Router();
const passportSettings = utilities.getSettings();
const periodicRoutingUtil = periodic.utilities.routing;

if (passportSettings.passport.use_csrf) {
  authRouter.use(csrf());
  authRouter.use(controllers.auth.useCSRF);
}
// authRouter.get('/test', controllers.auth.ensureAuthenticated, controllers.auth.testView);
if (periodic.extensions.has('periodicjs.ext.reactapp')!==true || periodic.locals.extensions.get('periodicjs.ext.reactapp').reactapp().manifest_prefix!=='/' ) {
  authRouter.get(periodicRoutingUtil.route_prefix(passportSettings.routing.logout), controllers.auth.logout);
  authRouter.get('/login', controllers.auth.loginView);
  authRouter.get(utilities.routes.user_auth_login, controllers.auth.loginView);
  authRouter.get(utilities.routes.account_auth_login, controllers.auth.loginView);
  authRouter.get(utilities.routes.account_auth_complete, controllers.auth.ensureAuthenticated, controllers.auth.completeView);
  authRouter.get(utilities.routes.user_auth_complete, controllers.auth.ensureAuthenticated, controllers.auth.completeView);
  authRouter.get(utilities.routes.user_auth_forgot, controllers.auth.forgotView);
  authRouter.get(utilities.routes.account_auth_forgot, controllers.auth.forgotView);
  authRouter.get(utilities.routes.user_auth_reset + '/:token', controllers.user.getToken, controllers.auth.resetView);
  authRouter.get(utilities.routes.account_auth_reset + '/:token', controllers.user.getToken, controllers.auth.resetView);
  authRouter.get(utilities.routes.user_auth_register, controllers.user.registerView);
  authRouter.get(utilities.routes.account_auth_register, controllers.user.registerView);
}
authRouter.get(utilities.routes.account_auth_complete + '/get_token_data', controllers.auth.requiredReactAppLogin , controllers.auth.getQueryParams);
authRouter.get(utilities.routes.user_auth_complete+'/get_token_data', controllers.auth.requiredReactAppLogin, controllers.auth.getQueryParams);
authRouter.get('/get_token_data', controllers.auth.getQueryParams);
authRouter.get(utilities.routes.user_auth_reset + '/get_token_data/:token', controllers.user.getToken, controllers.auth.getControllerData);
authRouter.get(utilities.routes.account_auth_reset + '/get_token_data/:token', controllers.user.getToken, controllers.auth.getControllerData);

if (periodic.extensions.has('periodicjs.ext.reactapp') && periodic.extensions.has('periodicjs.ext.oauth2server')) {
  const oauth2ServerControllers = periodic.controllers.extension.get('periodicjs.ext.oauth2server')
  authRouter.post(utilities.routes.account_auth_complete, oauth2ServerControllers.auth.ensureApiAuthenticated, controllers.user.completeRegistration);
  authRouter.post(utilities.routes.user_auth_complete, oauth2ServerControllers.auth.ensureApiAuthenticated, controllers.user.completeRegistration);
  authRouter.post(utilities.routes.account_auth_activate, oauth2ServerControllers.auth.ensureApiAuthenticated, controllers.user.resendActivation);
  authRouter.post(utilities.routes.user_auth_activate, oauth2ServerControllers.auth.ensureApiAuthenticated, controllers.user.resendActivation);
}
  

authRouter.post(utilities.routes.user_auth_login, controllers.auth.login);
authRouter.post(utilities.routes.account_auth_login, controllers.auth.login);
authRouter.post(utilities.routes.account_auth_complete, controllers.auth.ensureAuthenticated, controllers.user.completeRegistration);
authRouter.post(utilities.routes.user_auth_complete, controllers.auth.ensureAuthenticated, controllers.user.completeRegistration);
authRouter.post(utilities.routes.account_auth_activate, controllers.auth.ensureAuthenticated, controllers.user.resendActivation);
authRouter.post(utilities.routes.user_auth_activate, controllers.auth.ensureAuthenticated, controllers.user.resendActivation);
authRouter.post(utilities.routes.user_auth_forgot, controllers.user.forgot);
authRouter.post(utilities.routes.account_auth_forgot, controllers.user.forgot);
authRouter.post(utilities.routes.user_auth_reset + '/:token', controllers.user.resetPassword);
authRouter.post(utilities.routes.account_auth_reset + '/:token', controllers.user.resetPassword);
authRouter.post(utilities.routes.user_auth_register, controllers.user.create);
authRouter.post(utilities.routes.account_auth_register, controllers.user.create);

module.exports = authRouter;