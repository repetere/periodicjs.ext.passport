'use strict';

var passport = require('passport'),
	path = require('path'),
	LocalStrategy = require('passport-local').Strategy,
	FacebookStrategy = require('passport-facebook').Strategy,
	fs = require('fs-extra'),
	Utilities = require('periodicjs.core.utilities'),
	ControllerHelper = require('periodicjs.core.controllerhelper'),
	Extensions = require('periodicjs.core.extensions'),
	CoreExtension = new Extensions({
		extensionFilePath: path.resolve(process.cwd(), './content/extensions/extensions.json')
	}),
	authLoginPath='/auth/login/',
	CoreUtilities,
	CoreController,
	appSettings,
	mongoose,
	User,
	logger,
	loginExtSettingsFile,
	loginExtSettings;

var login = function (req, res, next) {
	passport.authenticate('local', function (err, user, info) {
		logger.silly('info', info);
		if (err) {
			logger.error(err);
			return next(err);
		}
		if (!user) {
			req.flash('error', 'invalid credentials, did you forget your password?');
			return res.redirect(authLoginPath);
		}
		req.logIn(user, function (err) {
			if (err) {
				logger.error(err);
				return next(err);
			}
			if (req.session.return_url) {
				return res.redirect(req.session.return_url);
			}
			else {
				return res.redirect('/');
			}
		});
	})(req, res, next);
};

var logout = function (req, res) {
	req.logout();
	req.session.destroy(function(err) {
		res.redirect('/');
	});
};

var rememberme = function (req, res, next) {
	// console.log('using remember me');
	if (req.method === 'POST' && req.url === '/login') {
		if (req.body.rememberme) {
			req.session.cookie.maxAge = 2592000000; // 30*24*60*60*1000 Rememeber 'me' for 30 days
		}
		else {
			req.session.cookie.expires = false;
		}
	}
	next();
};

var facebook = function (req, res, next) {
	passport.authenticate('facebook', {
		scope: ['email', 'publish_actions', 'offline_access', 'user_status', 'user_likes', 'user_checkins', 'user_about_me', 'read_stream']
	})(req, res, next);
};

var facebookcallback = function (req, res, next) {
	var loginUrl = (req.session.return_url) ? req.session.return_url : '/p-admin';
	var loginFailureUrl = (req.session.return_url) ? req.session.return_url : '/auth/login?return_url=' + req.session.return_url;
	passport.authenticate('facebook', {
		successRedirect: loginUrl,
		failureRedirect: loginFailureUrl,
		failureFlash: 'Invalid username or password.'
	})(req, res, next);
};

var ensureAuthenticated = function (req, res, next) {
	if (req.isAuthenticated()) {

		if(loginExtSettings && loginExtSettings.settings.requireusername===false){
			return next();
		}
		else if (!req.user.username) {
			res.redirect('/user/finishregistration');
		}
		else {
			return next();
		}
	}
	else {
		if (req.query.format === 'json') {
			res.send({
				'result': 'error',
				'data': {
					error: 'authentication requires '
				}
			});
		}
		else {
			logger.verbose('controller - login/user.js - ' + req.originalUrl);
			if (req.originalUrl) {
				req.session.return_url = req.originalUrl;
				res.redirect(authLoginPath+'?return_url=' + req.originalUrl);
			}
			else {
				res.redirect(authLoginPath);
			}
		}
	}
};

var usePassport = function () {
	passport.use(new LocalStrategy(function (username, password, done) {
		User.findOne({
			$or: [{
				username: {
					$regex: new RegExp(username, 'i')
				}
			}, {
				email: {
					$regex: new RegExp(username, 'i')
				}
			}]
		}, function (err, user) {
			if (err) {
				return done(err);
			}
			if (!user) {
				return done(null, false, {
					message: 'Unknown user ' + username
				});
			}
			if(loginExtSettings && loginExtSettings.settings.usepassword===false){
				return done(null, user);
			}
			else{
				user.comparePassword(password, function (err, isMatch) {
					if (err) {
						return done(err);
					}

					if (isMatch) {
						return done(null, user);
					}
					else {
						logger.verbose(' in passport callback when no password');
						return done(null, false, {
							message: 'Invalid password'
						});
					}
				});
			}
		});
	}));

	if(loginExtSettings && loginExtSettings.passport && loginExtSettings.passport.oauth.facebook.appid){
		passport.use(new FacebookStrategy({
			clientID: loginExtSettings.passport.oauth.facebook.appid,
			clientSecret: loginExtSettings.passport.oauth.facebook.appsecret,
			callbackURL: loginExtSettings.passport.oauth.facebook.callbackurl
		},
		function (accessToken, refreshToken, profile, done) {
			// console.log('accessToken:' +accessToken);
			// console.log('refreshToken:' +refreshToken);
			// console.log('profile:',profile);
			// var newUser = new User;
			var facebookdata = profile._json;
			User.findOne({
				facebookid: facebookdata.id,
				email: facebookdata.email,
				facebookaccesstoken: accessToken
			}, function (err, user) {
				if (err) {
					return done(err, null);
				}
				else if (user) {
					return done(null, user);
				}
				else {
					User.findOne({
							email: facebookdata.email
						},
						function (err, existingUser) {
							if (err) {
								return done(err);
							}
							else if (existingUser) {
								logger.info('model - user.js - already has an account, trying to connect account');
								existingUser.facebookid = facebookdata.id;
								existingUser.facebookaccesstoken = accessToken;
								existingUser.facebookusername = facebookdata.username;

								existingUser.save(done);
							}
							else {
								logger.info('model - user.js - creating new facebook user');
								User.create({
									email: facebookdata.email,
									facebookid: facebookdata.id,
									facebookaccesstoken: accessToken,
									facebookusername: facebookdata.username,
									activated: true,
									accounttype: 'regular',
									firstname: facebookdata.first_name,
									lastname: facebookdata.last_name
								}, done);
							}
						});
				}
			});
		}));
	}
};

var controller = function (resources) {
	logger = resources.logger;
	mongoose = resources.mongoose;
	appSettings = resources.settings;
	User = mongoose.model('User');
	CoreController = new ControllerHelper(resources);
	CoreUtilities = new Utilities(resources);
	loginExtSettingsFile = path.resolve(CoreExtension.getconfigdir({
		extname: 'periodicjs.ext.login'
	}), './settings.json');
	authLoginPath = (appSettings.authLoginPath)? appSettings.authLoginPath : authLoginPath;

	var appenvironment = appSettings.application.environment;
	if(appSettings.loginExtSettings){
		loginExtSettings = appSettings.loginExtSettings;
	}
	if(appSettings.authskipconfload){
		usePassport();
	}
	else{
		fs.readJson(loginExtSettingsFile, function (err, settingJSON) {
			if (err) {
				usePassport();
				throw new Error(err);
			}
			else {
				// console.log('settingJSON', settingJSON);
				if (settingJSON[appenvironment]) {
					loginExtSettings = settingJSON[appenvironment];
					authLoginPath = (loginExtSettings.authLoginPath)? loginExtSettings.authLoginPath : authLoginPath;
					// console.log('settings file authLoginPath',authLoginPath);
					usePassport();
				}
				else {
					throw new Error('Invalid login configuration, no transport for env: ' + appenvironment);
				}
			}
		});
	}


	return {
		rememberme: rememberme,
		login: login,
		logout: logout,
		facebook: facebook,
		facebookcallback: facebookcallback,
		ensureAuthenticated: ensureAuthenticated
	};
};

passport.serializeUser(function (user, done) {
	logger.verbose('controller - auth.js - serialize user');
	done(null, user._id);
	// var createAccessToken = function() {
	// 	var token = user.generateRandomToken();
	// 	User.findOne({
	// 		accessToken: token
	// 	}, function(err, existingUser) {
	// 		if (err) {
	// 			return done(err);
	// 		}
	// 		if (existingUser) {
	// 			createAccessToken(); // Run the function again - the token has to be unique!
	// 		} else {
	// 			user.set('accessToken', token);
	// 			console.log('pre save - user.get('accessToken')',user.get('accessToken'));
	// 			user.save(function(err) {
	// 				if (err) {
	// 					return done(err);
	// 				}
	// 				else{
	// 					console.log('user.get('accessToken')',user.get('accessToken'));
	// 					return done(null, user.get('accessToken'));
	// 				}
	// 			});
	// 		}
	// 	});
	// };

	// if (user._id) {
	// 	createAccessToken();
	// }
});

passport.deserializeUser(function (token, done) {
	logger.verbose('controller - auth.js - deserialize user');
	User.findOne({
		_id: token
	})
	.populate('userroles primaryasset')
	.exec(function (err, user) {
		// console.log(user)
		done(err, user);
	});
});

module.exports = controller;
