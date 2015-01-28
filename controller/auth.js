'use strict';

var passport = require('passport'),
	path = require('path'),
	jwt = require('jsonwebtoken'),
	async = require('async'),
	fs = require('fs-extra'),
	merge = require('utils-merge'),
	Utilities = require('periodicjs.core.utilities'),
	ControllerHelper = require('periodicjs.core.controller'),
	Extensions = require('periodicjs.core.extensions'),
	bcrypt = require('bcrypt'),
	CoreExtension = new Extensions({
		extensionFilePath: path.resolve(process.cwd(), './content/config/extensions.json')
	}),
	extend = require('util-extend'),
	CoreUtilities,
	CoreController,
	emailtransport,
	appSettings,
	mongoose,
	User,
	logger,
	configError,
	loginExtSettingsFile,
	emailController,
	loginExtSettings,
	passportController,
	defaultExtSettings = require('./default_config');

/**
 * logins a user using passport's local strategy, if a user is passed to this function, then the user will be logged in and req.user will be populated
 * @param  {object} req
 * @param  {object} res
 * @return {object} reponds with an error page or sends user to authenicated in resource
 */
var login = function (req, res, next) {
	if (configError) {
		next(configError);
	}
	else {
		passport.authenticate('local', function (err, user, info) {
			logger.silly('info', info);
			if (err) {
				logger.error(err);
				return next(err);
			}
			if (!user) {
				req.flash('error', 'invalid credentials, did you forget your password?');
				return res.redirect(loginExtSettings.settings.authLoginPath);
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
	}
};

/**
 * logs user out and destroys user session
 * @param  {object} req
 * @param  {object} res
 * @return {object} sends user to logout resource
 */
var logout = function (req, res) {
	req.logout();
	req.session.destroy(function (err) {
		if (err) {
			logger.error(err);
		}
		res.redirect(loginExtSettings.settings.authLogoutPath);
	});
};

/**
 * keep a user logged in for 30 days
 * @param  {object} req
 * @param  {object} res
 * @return {Function} next() callback
 */
var rememberme = function (req, res, next) {
	// console.log('using remember me');
	if (req.method === 'POST' && req.url === loginExtSettings.settings.authLoginPath) {
		if (req.body.rememberme) {
			req.session.cookie.maxAge = 2592000000; // 30*24*60*60*1000 Rememeber 'me' for 30 days
		}
		else {
			req.session.cookie.expires = false;
		}
	}
	next();
};

// Utility Functions
var waterfall = function (array, cb) {
	async.waterfall(array, cb);
};
var encode = function (data) {
	return jwt.sign(data, loginExtSettings.token.secret);
};

var decode = function (data, cb) {
	jwt.verify(data, loginExtSettings.token.secret, {}, function (err, decoded_token) {
		if (err) {
			console.log("Error from JWT.verify", err.name);
			console.log("Error from JWT.verify", err.message);
		}
		cb(decoded_token);
	});
};

var hasExpired = function (created) {
	var now = new Date();
	var diff = (now.getTime() - created);
	return diff > loginExtSettings.token.ttl;
};


var invalidateUserToken = function (req, res, next, cb) {
	var token = req.params.token;
	User.findOne({
		"attributes.reset_token": token
	}, function (err, usr) {
		if (err) {
			console.log('error finding the user for invalidate token fn');
			cb(err, null);
		}
		usr.attributes.reset_token = "";
		usr.attributes.reset_token_expires_millis = 0;
		cb(false, req, res, next, usr);
	});
};

var resetPassword = function (req, res, next, user, cb) {
	var err;
	if (req.body.password) {
		if (req.body.password !== req.body.passwordconfirm) {
			err = new Error('Passwords do not match');
			req.flash('error', err);
			cb(err, null);
		}
		else if (req.body.password === undefined || req.body.password.length < 8) {
			err = new Error('Password is too short');
			req.flash('error', err);
			cb(err, null);
		}
		else {
			var salt = bcrypt.genSaltSync(10),
				hash = bcrypt.hashSync(req.body.password, salt);
			user.password = hash;
			cb(null, user);
		}
	}
}

/**
 * description The save user function has two special fn calls on the model to mark the properties on it as changed/modified this gets around some werid edge cases when its being updated in memory but not save in mongo
 *
 */
function saveUser(user, cb) {
	user.markModified('attributes');
	user.markModified('password');
	user.save(function (err, usr) {
		if (err) {
			cb(err, null)
		}
		cb(null, usr);
	})
}


var getUser = function (req, res, next, cb) {
	User.findOne({
		email: req.body.email
	}, function (err, user) {
		if (err) {
			cb(err, null);
		}
		else if (user) {
			cb(false, user);
		}
		else {
			req.flash('error', 'No user with that email found!')
			cb(new Error('No user with that email found.'), null);
		}
	});
};

var generateToken = function (user, cb) {
	//Generate reset token and URL link; also, create expiry for reset token
	//make sure attributes exists || create it via merge
	var now = new Date();
	var expires = new Date(now.getTime() + (loginExtSettings.token.resetTokenExpiresMinutes * 60 * 1000)).getTime();
	user.attributes = {};
	user.attributes.reset_token = encode({
		email: user.email,
		apikey: user.apikey
	});
	user.attributes.reset_token_expires_millis = expires;
	//TODO: Look into why mongoose properties 
	//are not being saved during async fn calls
	user.markModified('attributes');
	user.save(function (err) {
		if (err) {
			cb(err, null);
		}
		cb(null, user);
	});
};

// create a func for the mail options

var emailConfig = function (user, cb) {
	var options = {};
	options.mailtransport = emailtransport;
	options.subject = "You forgot your password";
	options.user = user;
	options.to = user.email;
	options.replyTo = appSettings.adminnotificationemail;
	cb(null, options);

}



var sendEmail = function (options, cb) {
	//require mailer 
	var mailtransport = options.mailtransport,
		user = options.user,
		mailoptions = {};

	mailoptions.to = (options.to) ? options.to : appSettings.adminnotificationemail
	mailoptions.cc = options.cc; //options.ccc;
	mailoptions.bcc = options.bcc;
	mailoptions.replyTo = options.replyTo;
	mailoptions.subject = options.subject;
	if (options.generatetextemail) {
		mailoptions.generateTextFromHTML = true;
	}
	mailoptions.html = options.html;
	mailoptions.text = options.text;
	mailtransport.sendMail(mailoptions, cb);
};


//Post to auth/forgot with the users email
var forgot = function (req, res, next) {
	var arr = [
		function (cb) {
			cb(null, req, res, next)
		},
		getUser,
		generateToken,
		emailConfig,
		sendEmail
	];

	waterfall(arr,
		function (err, results) {
			if (err) {
				req.flash('error', err);
				res.redirect('/auth/forgot');
			}
			res.send(results);
		});
};

//GET if the user token is vaild show the change password page
var reset = function (req, res, next) {
	var token = req.params.token,
		current_user,
		decode_token;
	var d_token = decode(token, function (decode) {
		decode_token = decode;
	});

	//Find the User by their token
	User.findOne({
		'attributes.reset_token': token
	}, function (err, user) {
		if (err || !user) {
			req.flash('error', 'Password reset token is invalid.');
			return res.redirect('/auth/forgot');
		}
		current_user = user;
		//Check to make sure token hasn't expired
		if (hasExpired(user.attributes.reset_token_expires_millis)) {
			req.flash('error', 'Password reset token is has expired.');
			return res.redirect('/auth/forgot');
		}
		//Check to make sure token is valid and sign by us
		if (current_user.email !== decode_token.email && current_user.api_key !== decode_token.api_key) {
			req.flash('error', 'This token is not valid please try again');
			res.redirect('/auth/forgot');
		}
		CoreController.getPluginViewDefaultTemplate({
				viewname: 'user/reset',
				themefileext: appSettings.templatefileextension,
				extname: 'periodicjs.ext.login'
			},
			function (err, templatepath) {
				CoreController.handleDocumentQueryRender({
					res: res,
					req: req,
					renderView: templatepath,
					responseData: {
						pagedata: {
							title: 'Reset Password',
							current_user: current_user
						},
						user: req.user
					}
				});
			});

	});
};


//POST change the users old password to the new password in the form
var token = function (req, res, next) {
	var user_token = req.params.token;
	waterfall([
			function (cb) {
				cb(null, req, res, next);
			},
			invalidateUserToken,
			resetPassword,
			saveUser,
			emailConfig,
			sendEmail,
		],
		function (err /*, results*/ ) {
			if (err) {
				req.flash('error', 'Opps Something went wrong Please Try Again!');
				res.redirect('/auth/reset/' + user_token);
			}
			req.flash('success', 'Password Sucessfully Changed!');
			res.redirect('/auth/login');
		});
};



/**
 * make sure a user is authenticated, if not logged in, send them to login page and return them to original resource after login
 * @param  {object} req
 * @param  {object} res
 * @return {Function} next() callback
 */
var ensureAuthenticated = function (req, res, next) {
	if (configError) {
		next(configError);
	}
	else {
		/* if a user is logged in, and requires to link account, update the user document with social credentials and then pass to the next express middleware */
		if (req.isAuthenticated()) {
			if (req.session.linkaccount === true) {
				var updateuser = {};
				updateuser.attributes = merge(req.user.attributes, req.session.linkaccountdata);
				CoreController.updateModel({
					cached: req.headers.periodicCache !== 'no-periodic-cache',
					model: User,
					id: req.user._id,
					updatedoc: updateuser,
					res: res,
					req: req,
					callback: function (err /* , updateduser */ ) {
						if (err) {
							next(err);
						}
						else {
							logger.verbose('linked ', req.session.linkaccountservice, ' account for ', req.user.id, req.user.email, req.user.username);
							req.session.linkaccount = false;
							delete req.session.linkaccount;
							delete req.session.linkaccountdata;
							delete req.session.linkaccountservice;
							next();
						}
					}
				});

				// next(new Error('cannot link '+req.session.linkaccountservice+' account'));
				// res.redirect('/user/linkaccount?service='+req.session.linkaccountservice);
			}
			else if (loginExtSettings && loginExtSettings.settings.disablesocialsignin === true && req.user.accounttype === 'social-sign-in') {
				res.redirect('/auth/user/finishregistration?reason=social-sign-in-pending');
			}
			else if (loginExtSettings && loginExtSettings.settings.requireusername !== false && !req.user.username) {
				res.redirect('/auth/user/finishregistration?required=username');
				// return next();
			}
			else if (loginExtSettings && loginExtSettings.settings.requireemail !== false && !req.user.email) {
				res.redirect('/auth/user/finishregistration?required=email');
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
					res.redirect(loginExtSettings.settings.authLoginPath + '?return_url=' + req.originalUrl);
				}
				else {
					res.redirect(loginExtSettings.settings.authLoginPath);
				}
			}
		}
	}
};

/**
 * login controller
 * @module authController
 * @{@link https://github.com/typesettin/periodic}
 * @author Yaw Joseph Etse
 * @copyright Copyright (c) 2014 Typesettin. All rights reserved.
 * @license MIT
 * @requires module:passport
 * @requires module:path
 * @requires module:passport-local
 * @requires module:passport-facebook
 * @requires module:fs-extra
 * @requires module:periodicjs.core.utilities
 * @requires module:periodicjs.core.controller
 * @requires module:periodicjs.core.extensions
 * @param  {object} resources variable injection from current periodic instance with references to the active logger and mongo session
 * @return {object}           sendmail
 */
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

	var appenvironment = appSettings.application.environment;
	var settingJSON = fs.readJsonSync(loginExtSettingsFile);
	loginExtSettings = (settingJSON[appenvironment]) ? extend(defaultExtSettings, settingJSON[appenvironment]) : defaultExtSettings;

	passportController = require('./passport_controller')(resources, {
		User: User,
		passport: passport
	});
	passportController.serialize();
	passportController.deserialize();
	passport = passportController.passport;
	passportController.usePassport();
	emailController = require('./email_controller')(resources, {
		User: User
	});

	return {
		rememberme: rememberme,
		login: login,
		logout: logout,
		forgot: forgot,
		reset: reset,
		token: token,
		ensureAuthenticated: ensureAuthenticated,
		passport: passport
	};
};




module.exports = controller;
