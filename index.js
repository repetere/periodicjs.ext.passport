'use strict';

var path = require('path'),
	fs = require('fs-extra'),
	extend = require('util-extend'),
	loginExtSettings,
	appenvironment,
	settingJSON,
	Extensions = require('periodicjs.core.extensions'),
	CoreExtension = new Extensions({
		extensionFilePath: path.resolve(process.cwd(), './content/config/extensions.json')
	}),
	loginExtSettingsFile = path.resolve(CoreExtension.getconfigdir({
		extname: 'periodicjs.ext.login'
	}), './settings.json'),
	defaultExtSettings = require('./controller/default_config');

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
	// periodic = express,app,logger,config,db,mongoose

	appenvironment = periodic.settings.application.environment;
	settingJSON = fs.readJsonSync(loginExtSettingsFile);
	loginExtSettings = (settingJSON[appenvironment]) ? extend(defaultExtSettings, settingJSON[appenvironment]) : defaultExtSettings;

	periodic.app.controller.extension.login = {
		loginExtSettings: loginExtSettings
	};
	periodic.app.controller.extension.login.auth = require('./controller/auth')(periodic);
	periodic.app.controller.extension.login.user = require('./controller/user')(periodic);

	var passport = periodic.app.controller.extension.login.auth.passport,
		authRouter = periodic.express.Router(),
		authController = periodic.app.controller.extension.login.auth,
		userRouter = periodic.express.Router(),
		userController = periodic.app.controller.extension.login.user,
		socialPassportController = require('./controller/social_controller')(periodic, {
			passport: passport,
			loginExtSettings: periodic.app.controller.extension.login.auth.loginExtSettings
		}),
		tokenController = require('./controller/token_controller')(periodic, {
			passport: passport,
			loginExtSettings: periodic.app.controller.extension.login.auth.loginExtSettings
		});
	periodic.app.controller.extension.login.token = tokenController;
	periodic.app.controller.extension.login.social = socialPassportController;
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
	authRouter.post('/forgot', tokenController.forgot);
	authRouter.get('/reset/:token', tokenController.reset);
	authRouter.post('/reset/:token', tokenController.token);
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
