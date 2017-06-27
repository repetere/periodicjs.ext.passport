'use strict';

const periodic = require('periodicjs');
const csrf = require('csurf');
const controllers = require('../controllers');
const utilities = require('../utilities');
const authRouter = periodic.express.Router();
const passportSettings = utilities.getSettings();

if (passportSettings.passport.use_csrf) {
  authRouter.use(csrf());
  authRouter.use(function (req, res, next) {
    res.locals.token = req.csrfToken();
    next();
  });
}
authRouter.get('/test', controllers.auth.ensureAuthenticated, controllers.auth.testView);
authRouter.get('/login', controllers.auth.loginView);
authRouter.post(utilities.routes.user_auth_login, controllers.auth.login);
authRouter.post(utilities.routes.account_auth_login, controllers.auth.login);
// authRouter.get('/logout', authController.logout);

/**
	//token controller & router
	authRouter.get('/' + loginExtSettings.routes.forgot_password.default, userController.forgot);
	authRouter.post('/' + loginExtSettings.routes.forgot_password.default, tokenController.forgot);
	authRouter.get('/reset/:token', tokenController.get_token, tokenController.reset);
	authRouter.get('/asyncreset/:token', tokenController.get_token, tokenController.asyncreset);
	authRouter.post('/reset/:token', tokenController.get_token, tokenController.token);
	userRouter.get('/activate/', tokenController.create_user_activation_token, tokenController.update_user_activation_token, authController.get_activation);
	userRouter.post('/activate', authController.activate_user);

	//social controller & router
	authRouter.get('/facebook', socialPassportController.facebook);
	authRouter.get('/facebook/callback', socialPassportController.facebookcallback);
	authRouter.get('/instagram', socialPassportController.instagram);
	authRouter.get('/instagram/callback', socialPassportController.instagramcallback);
	authRouter.get('/twitter', socialPassportController.twitter);
	authRouter.get('/twitter/callback', socialPassportController.twittercallback);

	userRouter.get('/new|/register', userController.newuser);
	userRouter.get('/finishregistration', authController.ensureAuthenticated, userController.finishregistration);

	userRouter.post('/new', tokenController.create_user_activation_token, userController.create);
	userRouter.post('/finishregistration', authController.ensureAuthenticated, userController.updateuserregistration);

	periodic.app.use(authController.rememberme);
 */

module.exports = authRouter;