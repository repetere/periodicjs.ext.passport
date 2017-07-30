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
authRouter.get(periodicRoutingUtil.route_prefix(passportSettings.routing.logout), controllers.auth.logout);
authRouter.get('/login', controllers.auth.loginView);
authRouter.get(utilities.routes.user_auth_login, controllers.auth.loginView);
authRouter.get(utilities.routes.account_auth_login, controllers.auth.loginView);
authRouter.post(utilities.routes.user_auth_login, controllers.auth.login);
authRouter.post(utilities.routes.account_auth_login, controllers.auth.login);
authRouter.get(utilities.routes.user_auth_forgot, controllers.auth.forgotView);
authRouter.get(utilities.routes.account_auth_forgot, controllers.auth.forgotView);
authRouter.post(utilities.routes.user_auth_forgot, controllers.user.forgot);
authRouter.post(utilities.routes.account_auth_forgot, controllers.user.forgot);
authRouter.get(utilities.routes.user_auth_reset + '/:token', controllers.user.getToken, controllers.auth.resetView);
authRouter.get(utilities.routes.account_auth_reset + '/:token', controllers.user.getToken, controllers.auth.resetView);
authRouter.post(utilities.routes.user_auth_reset + '/:token', controllers.user.resetPassword);
authRouter.post(utilities.routes.account_auth_reset + '/:token', controllers.user.resetPassword);
authRouter.get(utilities.routes.user_auth_register, controllers.user.registerView);
authRouter.get(utilities.routes.account_auth_register, controllers.user.registerView);
authRouter.post(utilities.routes.user_auth_register, controllers.user.create);
authRouter.post(utilities.routes.account_auth_register, controllers.user.create);

module.exports = authRouter;