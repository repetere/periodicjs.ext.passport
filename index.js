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
	var authRouter = periodic.express.Router(),
		authController = require('./controller/auth')(periodic),
		userRouter = periodic.express.Router(),
		userController = require('./controller/user')(periodic);

	authRouter.get('*', global.CoreCache.disableCache);
	authRouter.post('*', global.CoreCache.disableCache);
	userRouter.get('*', global.CoreCache.disableCache);
	userRouter.post('*', global.CoreCache.disableCache);

	authRouter.get('/login', userController.login);
	authRouter.post('/login', authController.login);
	authRouter.get('/logout', authController.logout);
	authRouter.get('/facebook', authController.facebook);
	authRouter.get('/facebook/callback', authController.facebookcallback);
	authRouter.get('/instagram', authController.instagram);
	authRouter.get('/instagram/callback', authController.instagramcallback);

	userRouter.get('/new|/register', userController.newuser);
	userRouter.get('/finishregistration', userController.finishregistration);

	userRouter.post('/new', userController.create);
	userRouter.post('/finishregistration', userController.updateuserregistration);

	periodic.app.use(authController.rememberme);
	periodic.app.use(passport.initialize());
	periodic.app.use(passport.session());
	periodic.app.use('/auth', authRouter);
	periodic.app.use('/user', userRouter);
};
