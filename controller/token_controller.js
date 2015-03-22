'use strict';

var async = require('async'),
	appSettings,
	appenvironment,
	bcrypt = require('bcrypt'),
	CoreController,
	CoreUtilities,
	ControllerHelper = require('periodicjs.core.controller'),
	CoreMailer = require('periodicjs.core.mailer'),
	Utilities = require('periodicjs.core.utilities'),
	jwt = require('jsonwebtoken'),
	loginExtSettings,
	logger,
	merge = require('utils-merge'),
	mongoose,
	User,
	path = require('path'),
	passport;


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
			console.log('Error from JWT.verify', err.name);
			console.log('Error from JWT.verify', err.message);
			cb(err);
		}
		else {
			cb(null, decoded_token);
		}
	});
};

var hasExpired = function (token_expires_millis) {
	var now = new Date();
	var diff = (now.getTime() - token_expires_millis);
	return diff > 0;
};


var invalidateUserToken = function (req, res, next, cb) {
	var token = req.controllerData.token;
	User.findOne({
		'attributes.reset_token': token
	}, function (err, usr) {
		if (err) {
			console.log('error finding the user for invalidate token fn');
			cb(err, null);
		}
		else {
			usr.attributes.reset_token = '';
			usr.attributes.reset_token_link = '';
			usr.attributes.reset_token_expires_millis = 0;
			cb(false, req, res, next, usr);
		}
	});
};

var resetPassword = function (req, res, next, user, cb) {
	var err;
	//console.log('loginExtSettings', loginExtSettings);
	if (req.body.password) {
		if (req.body.password !== req.body.passwordconfirm) {
			err = new Error('Passwords do not match');
			req.flash('error', err);
			cb(err, null);
		}
		else if (req.body.password === undefined || req.body.password.length < loginExtSettings.new_user_validation.length_of_password) {
			err = new Error('Password is too short');
			req.flash('error', err);
			cb(err, null);
		}
		else {
			var salt = bcrypt.genSaltSync(10),
				hash = bcrypt.hashSync(req.body.password, salt);
			user.password = hash;
			cb(null, user, req);
		}
	}
};

/**
 * description The save user function has two special fn calls on the model to mark the properties on it as changed/modified this gets around some werid edge cases when its being updated in memory but not save in mongo
 *
 */
function saveUser(user, req, cb) {
	user.markModified('attributes');
	user.markModified('password');
	user.save(function (err, usr) {
		if (err) {
			cb(err, null);
		}
		cb(null, usr, req);
	});
}


var getUser = function (req, res, next, cb) {
	User.findOne({
		email: req.body.email
	}, function (err, user) {
		if (err) {
			cb(err, null);
		}
		else if (user) {
			cb(false, user, req);
		}
		else {
			req.flash('error', 'No user with that email found!');
			cb(new Error('No user with that email found.'), null);
		}
	});
};

var generateToken = function (user, req, cb) {
	//Generate reset token and URL link; also, create expiry for reset token
	//make sure attributes exists || create it via merge
	var salt = bcrypt.genSaltSync(10);
	var now = new Date();
	var expires = new Date(now.getTime() + (loginExtSettings.token.resetTokenExpiresMinutes * 60 * 1000)).getTime();
	user.attributes = {};
	user.attributes.reset_token = encode({
		email: user.email,
		apikey: user.apikey
	});
	user.attributes.reset_token_link = CoreUtilities.makeNiceName(bcrypt.hashSync(user.attributes.reset_token, salt));
	user.attributes.reset_token_expires_millis = expires;

	//TODO: Look into why mongoose properties 
	//are not being saved during async fn calls
	user.markModified('attributes');
	user.save(function (err) {
		if (err) {
			cb(err, null);
		}
		cb(null, user, req);
	});
};

// create a func for the mail options

var emailForgotPasswordLink = function (user, req, cb) {
	CoreController.getPluginViewDefaultTemplate({
			viewname: 'email/user/forgot_password_link',
			themefileext: appSettings.templatefileextension
		},
		function (err, templatepath) {
			if (err) {
				cb(err);
			}
			else {
				// console.log('user for forgot password', user);
				if (templatepath === 'email/user/forgot_password_link') {
					templatepath = path.resolve(process.cwd(), 'node_modules/periodicjs.ext.login/views', templatepath + '.' + appSettings.templatefileextension);
				}
				CoreMailer.sendEmail({
					appenvironment: appenvironment,
					to: user.email,
					replyTo: appSettings.adminnotificationemail,
					subject: appSettings.name + ' - Reset your password',
					emailtemplatefilepath: templatepath,
					emailtemplatedata: {
						user: user,
						appname: appSettings.name,
						hostname: req.headers.host
					}
				}, cb);
			}
		}
	);
	// cb(null, options);
};

var emailResetPasswordNotification = function (user, req, cb) {
	CoreController.getPluginViewDefaultTemplate({
			viewname: 'email/user/reset_password_notification',
			themefileext: appSettings.templatefileextension
		},
		function (err, templatepath) {
			if (err) {
				cb(err);
			}
			else {
				// console.log('user for forgot password', user);
				if (templatepath === 'email/user/reset_password_notification') {
					templatepath = path.resolve(process.cwd(), 'node_modules/periodicjs.ext.login/views', templatepath + '.' + appSettings.templatefileextension);
				}
				CoreMailer.sendEmail({
					appenvironment: appenvironment,
					to: user.email,
					replyTo: appSettings.adminnotificationemail,
					subject: appSettings.name + ' - Password reset notification',
					emailtemplatefilepath: templatepath,
					emailtemplatedata: {
						user: user,
						appname: appSettings.name,
						hostname: req.headers.host
					}
				}, cb);
			}
		}
	);
	// cb(null, options);
};

//Post to auth/forgot with the users email
var forgot = function (req, res, next) {
	var arr = [
		function (cb) {
			cb(null, req, res, next);
		},
		getUser,
		generateToken,
		emailForgotPasswordLink
	];

	waterfall(arr,
		function (err /*, results*/ ) {
			if (err) {
				req.flash('error', err.message);
				res.redirect('/auth/forgot');
			}
			else {
				req.flash('info', 'Password reset instructions were sent to your email address');
				res.redirect(loginExtSettings.settings.authLoginPath);
			}
		});
};

var get_token = function (req, res, next) {
	req.controllerData = (req.controllerData) ? req.controllerData : {};

	User.findOne({
		'attributes.reset_token_link': req.params.token
	}, function (err, user_with_token) {
		if (err) {
			req.flash('error', err.message);
			res.redirect(loginExtSettings.settings.authLoginPath);
		}
		else if (!user_with_token || !user_with_token.attributes.reset_token) {
			req.flash('error', 'invalid reset token');
			res.redirect(loginExtSettings.settings.authLoginPath);
		}
		else if (hasExpired(user_with_token.attributes.reset_token_expires_millis)) {
			req.flash('error', 'Password reset token is has expired.');
			res.redirect(loginExtSettings.settings.authLoginPath);
		}
		else {
			req.controllerData.token = user_with_token.attributes.user_activation_token;
			next();
		}
	});
};


//GET if the user token is vaild show the change password page
var reset = function (req, res) {
	var token = req.controllerData.token,
		// current_user,
		decode_token;

	decode(token, function (err, decode) {
		if (err) {
			CoreController.handleDocumentQueryErrorResponse({
				err: err,
				res: res,
				req: req,
				errorflash: err.message
			});
		}
		else {
			decode_token = decode;
			//Find the User by their token
			User.findOne({
				'attributes.reset_token': token
			}, function (err, found_user) {
				if (err || !found_user) {
					req.flash('error', 'Password reset token is invalid.');
					res.redirect(loginExtSettings.settings.authLoginPath);
				}
				// current_user = found_user;
				//Check to make sure token hasn't expired

				//Check to make sure token is valid and sign by us
				else if (found_user.email !== decode_token.email && found_user.api_key !== decode_token.api_key) {
					req.flash('error', 'This token is not valid please try again');
					res.redirect(loginExtSettings.settings.authLoginPath);
				}
				else {

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
										current_user: found_user
									},
									user: req.user
								}
							});
						});
				}
			});
		}
	});
};


//POST change the users old password to the new password in the form
var token = function (req, res, next) {
	var user_token = req.controllerData.token;
	waterfall([
			function (cb) {
				cb(null, req, res, next);
			},
			invalidateUserToken,
			resetPassword,
			saveUser,
			emailResetPasswordNotification
		],
		function (err /*, results*/ ) {
			if (err) {
				req.flash('error', err.message);
				res.redirect('/auth/reset/' + user_token);
			}
			else {
				req.flash('success', 'Password Sucessfully Changed!');
				res.redirect(loginExtSettings.settings.authLoginPath);
			}

		});
};

var getTokenExpiresTime = function () {
	var now = new Date();
	return new Date(now.getTime() + (loginExtSettings.token.resetTokenExpiresMinutes * 60 * 1000)).getTime();
};

var update_user_activation_token = function (req, res, next) {
	try {
		if (!req.body.attributes.user_activation_token) {
			throw Error('invalid user activation');
		}
		else if (!req.isAuthenticated()) {
			throw Error('must be logged in');
		}
		req.user.attributes = merge(req.user.attributes, req.body.attributes);

		User.findOne({
			'_id': req.user._id
		}, function (err, user_to_update) {
			if (err) {
				throw err;
			}
			else if (!user_to_update || !user_to_update) {
				throw Error('invalid user activation token');
			}
			else {
				user_to_update.attributes = req.user.attributes;
				user_to_update.markModified('attributes');
				user_to_update.save(function (err /*, usr */ ) {
					if (err) {
						next(err);
					}
					else {
						next();
					}
				});
			}
		});
	}
	catch (e) {
		next(e);
	}
};

var get_user_activation_token = function (req, res, next) {
	req.controllerData = (req.controllerData) ? req.controllerData : {};
	User.findOne({
		'attributes.user_activation_token_link': req.params.token
	}, function (err, user_with_activation_token) {
		console.log('user_with_activation_token', user_with_activation_token);
		if (err) {
			req.flash('error', err.message);
			res.redirect(loginExtSettings.settings.authLoginPath);
		}
		else if (!user_with_activation_token || !user_with_activation_token.attributes.user_activation_token) {
			req.flash('error', 'invalid validation token');
			res.redirect(loginExtSettings.settings.authLoginPath);
		}
		else if (hasExpired(user_with_activation_token.attributes.reset_activation_expires_millis)) {
			req.flash('error', 'Activation token has expired.');
			res.redirect(loginExtSettings.settings.authLoginPath);
		}
		else {
			req.controllerData.user_activation_token = user_with_activation_token.attributes.user_activation_token;
			next();
		}
	});
};

// auth/user/new
var create_user_activation_token = function (req, res, next) {
	try {
		if (!req.body.email && !req.isAuthenticated()) {
			throw new Error('you must be logged in, to activate your account');
		}
		var userdata = CoreUtilities.removeEmptyObjectValues(req.body),
			salt = bcrypt.genSaltSync(10),
			expires = getTokenExpiresTime(),
			user_activation_token = encode({
				email: userdata.email || req.user.email
			});
		userdata.attributes = {};
		userdata.attributes.user_activation_token = user_activation_token;
		userdata.attributes.user_activation_token_link = CoreUtilities.makeNiceName(bcrypt.hashSync(userdata.attributes.user_activation_token, salt));
		userdata.attributes.reset_activation_expires_millis = expires;

		req.body = userdata;
		next();
	}
	catch (e) {
		next(e);
	}
};

var tokenController = function (resources, passportResources) {
	appSettings = resources.settings;
	CoreController = new ControllerHelper(resources);
	CoreUtilities = new Utilities(resources);
	loginExtSettings = passportResources.loginExtSettings;
	logger = resources.logger;
	mongoose = resources.mongoose;
	passport = passportResources.passport;
	User = mongoose.model('User');
	appenvironment = appSettings.application.environment;
	return {
		forgot: forgot,
		reset: reset,
		get_user_activation_token: get_user_activation_token,
		get_token: get_token,
		create_user_activation_token: create_user_activation_token,
		update_user_activation_token: update_user_activation_token,
		token: token
	};
};


module.exports = tokenController;
