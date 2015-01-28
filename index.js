'use strict';

var passport = require('passport');

/**
 * An authentication extension that uses passport to authenticate user sessions.
 * @{@link https://github.com/typesettin/periodicjs.ext.login}
 * @author Yaw Joseph Etse
 * @copyright Copyright (c) 2014 Typesettin. All rights reserved.
 * @license MIT
 * @exports periodicjs.ext.login
 * @requires module:passport
 * @param  {object} periodic variable injection of resources from current periodic instance
 */
module.exports = function (periodic) {
	// express,app,logger,config,db,mongoose
	periodic.app.controller.extension.login = {
		auth: require('./controller/auth')(periodic),
		user: require('./controller/user')(periodic)
	};

	var passport = periodic.app.controller.extension.login.auth.passport,
		authRouter = periodic.express.Router(),
		authController = periodic.app.controller.extension.login.auth,
		userRouter = periodic.express.Router(),
		userController = periodic.app.controller.extension.login.user,
		socialPassportController = require('./controller/social_controller')(periodic, {
			passport: passport,
			loginExtSettings: periodic.app.controller.extension.login.auth.loginExtSettings
		});
	//tokenRouter      = periodic.express.Router(),
	//tokenController  = periodic.app.controller.extension.login.token
	//socialRouter     = periodic.express.Router(),
	//socialController = periodic.app.controller.extension.login.social,

	authRouter.get('*', global.CoreCache.disableCache);
	authRouter.post('*', global.CoreCache.disableCache);
	userRouter.get('*', global.CoreCache.disableCache);
	userRouter.post('*', global.CoreCache.disableCache);

	authRouter.get('/login', userController.login);
	authRouter.post('/login', authController.login);
	authRouter.get('/logout', authController.logout);
	//token controller & router
	authRouter.get('/forgot', userController.forgot);
	authRouter.post('/forgot', authController.forgot);
	authRouter.get('/reset/:token', authController.reset);
	authRouter.post('/reset/:token', authController.token);
	//social controller & router
	authRouter.get('/facebook', socialPassportController.facebook);
	authRouter.get('/facebook/callback', socialPassportController.facebookcallback);
	authRouter.get('/instagram', socialPassportController.instagram);
	authRouter.get('/instagram/callback', socialPassportController.instagramcallback);
	authRouter.get('/twitter', socialPassportController.twitter);
	authRouter.get('/twitter/callback', socialPassportController.twittercallback);

	userRouter.get('/new|/register', userController.newuser);
	userRouter.get('/finishregistration', userController.finishregistration);

	userRouter.post('/new', userController.create);
	userRouter.post('/finishregistration', userController.updateuserregistration);

	periodic.app.use(authController.rememberme);
	periodic.app.use(passport.initialize());
	periodic.app.use(passport.session());
	periodic.app.use('/auth', authRouter);
	periodic.app.use('/auth/user', userRouter);
	return periodic;
};
