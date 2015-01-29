'use strict';

var async = require('async'),
	appSettings,
	bcrypt = require('bcrypt'),
	CoreController,
	ControllerHelper = require('periodicjs.core.controller'),
	CoreMailer = require('periodicjs.core.mailer'),
	jwt = require('jsonwebtoken'),
	loginExtSettings,
	logger,
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
		'attributes.reset_token': token
	}, function (err, usr) {
		if (err) {
			console.log('error finding the user for invalidate token fn');
			cb(err, null);
		}
		usr.attributes.reset_token = '';
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
};

/**
 * description The save user function has two special fn calls on the model to mark the properties on it as changed/modified this gets around some werid edge cases when its being updated in memory but not save in mongo
 *
 */
function saveUser(user, cb) {
	user.markModified('attributes');
	user.markModified('password');
	user.save(function (err, usr) {
		if (err) {
			cb(err, null);
		}
		cb(null, usr);
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
			cb(false, user);
		}
		else {
			req.flash('error', 'No user with that email found!');
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

var emailForgotPasswordLink = function (user, cb) {
	CoreController.getPluginViewDefaultTemplate({
			viewname: 'email/user/forgot',
			themefileext: appSettings.templatefileextension
		},
		function (err, templatepath) {
			if (err) {
				cb(err);
			}
			else {
				// console.log('user for forgot password', user);
				if (templatepath === 'email/user/forgot') {
					templatepath = path.resolve(process.cwd(), 'node_modules/periodicjs.ext.login/views', templatepath + '.' + appSettings.templatefileextension);
				}
				CoreMailer.sendEmail({
					to: user.email,
					cc: 'yawetse@gmail.com',
					replyTo: appSettings.adminnotificationemail,
					subject: appSettings.name + ' - Reset your password',
					emailtemplatefilepath: templatepath,
					emailtemplatedata: {
						user: user
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

//GET if the user token is vaild show the change password page
var reset = function (req, res) {
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


var tokenController = function (resources, passportResources) {
	appSettings = resources.settings;
	CoreController = new ControllerHelper(resources);
	loginExtSettings = passportResources.loginExtSettings;
	logger = resources.logger;
	mongoose = resources.mongoose;
	passport = passportResources.passport;
	User = mongoose.model('User');
	return {
		forgot: forgot,
		reset: reset,
		token: token
	};
};


module.exports = tokenController;
