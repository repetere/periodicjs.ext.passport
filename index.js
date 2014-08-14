'use strict';

var passport = require('passport');

module.exports = function(periodic){
	// express,app,logger,config,db,mongoose
	var authRouter = periodic.express.Router(),
		authController = require('./controller/auth')(periodic),
		userRouter = periodic.express.Router(),
		userController = require('./controller/user')(periodic);

	authRouter.get('/login', userController.login);
	authRouter.post('/login', authController.login);
	authRouter.get('/logout', authController.logout);
	authRouter.get('/facebook', authController.facebook);
	authRouter.get('/facebook/callback', authController.facebookcallback);

	userRouter.get('/new|/register', userController.newuser);
	userRouter.get('/finishregistration', userController.finishregistration);

	userRouter.post('/new', userController.create);
	userRouter.post('/finishregistration', userController.updateuserregistration);

	periodic.app.use(authController.rememberme);
	periodic.app.use(passport.initialize());
	periodic.app.use(passport.session());
	periodic.app.use('/auth',authRouter);
	periodic.app.use('/user',userRouter);
};