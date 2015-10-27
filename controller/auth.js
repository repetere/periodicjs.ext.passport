'use strict';

var passport = require('passport'),
	merge = require('utils-merge'),
	path = require('path'),
	CoreUtilities,
	CoreController,
	CoreMailer,
	appSettings,
	mongoose,
	User,
	logger,
	configError,
	loginExtSettings,
	passportController;

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
		passport.authenticate('local', function (err, user /*, info*/ ) {
			var resOptions = {
				req: req,
				res: res,
				err: err,
			};
			if (err) {
				CoreController.logError({
					req: req,
					err: err
				});
				if (err.message === 'Your Account is Currently Blocked') {
					req.flash('error', 'Your account is currently blocked');
					return res.redirect(loginExtSettings.settings.authLoginPath);
				}
				return next(err);
			}
			if (!user) {
				if (!req.controllerData.ajaxLogin) {
					req.flash('error', 'invalid credentials, did you forget your password?');
					resOptions.redirecturl = loginExtSettings.settings.authLoginPath;
					return next(new Error('invalid credentials, did you forget your password?'));
				}
				else {
					resOptions.err = resOptions.err || new Error('invalid credentials, did you forget your password?');
					CoreController.logError({
						req: req,
						err: new Error('invalid credentials, did you forget your password?')
					});
					return CoreController.respondInKind(resOptions);
				}
				// CoreController.handleDocumentQueryErrorResponse({
				// 	err: err,
				// 	res: res,
				// 	req: req,
				// });
				// return res.redirect(loginExtSettings.settings.authLoginPath);
			}
			req.logIn(user, function (err) {
				if (err) {
					CoreController.logError({
						req: req,
						err: err
					});
					// resOptions.err = err;
					// CoreController.handleDocumentQueryErrorResponse({
					// 	err: err,
					// 	res: res,
					// 	req: req,
					// });
					return next(err);
				}
				if (!req.controllerData.ajaxLogin) {
					if (req.session.return_url) {
						resOptions.responseData = {
							result: 'success',
							data: {
								redirecturl: req.session.return_url
							}
						};
						resOptions.redirecturl = req.session.return_url;
						return CoreController.respondInKind(resOptions);
						// return res.redirect(req.session.return_url);
					}
					else {
						resOptions.redirecturl = loginExtSettings.settings.authLoggedInHomepage;
						resOptions.responseData = {
							result: 'success',
							data: {
								redirecturl: loginExtSettings.settings.authLoggedInHomepage
							}
						};
						return CoreController.respondInKind(resOptions);
						// res.redirect(loginExtSettings.settings.authLoggedInHomepage);
					}
				}
				else {
					resOptions.responseData = {
						result: 'success',
						data: {
							message: 'successfully logged in'
						}
					};
					return CoreController.respondInKind(resOptions);
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
	// console.log('req.flash() pre logout', req.flash());
	req.logout();
	req.session.destroy(function (err) {
		// console.log('req.flash() post logout', req.flash());
		var resOptions = {
			req: req,
			res: res,
			err: err,
		};
		if (err) {
			logger.error('failed logout', err);
		}
		req.flash = function () {
			return {};
		};
		resOptions.redirecturl = loginExtSettings.settings.authLoggedOutHomepage || loginExtSettings.settings.authLoggedInHomepage;
		resOptions.responseData = {
			result: 'success',
			data: {
				redirecturl: loginExtSettings.settings.authLoggedOutHomepage || loginExtSettings.settings.authLoggedInHomepage
			}
		};
		CoreController.respondInKind(resOptions);
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

var forceAuthLogin = function (req, res) {
	if (req.originalUrl) {
		req.session.return_url = req.originalUrl;
		res.redirect(loginExtSettings.settings.authLoginPath + '?return_url=' + req.originalUrl);
	}
	else {
		res.redirect(loginExtSettings.settings.authLoginPath);
	}
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
			else if (loginExtSettings && loginExtSettings.settings.disablesocialsignin === true && req.user.accounttype === 'social-sign-in'  && req.query.required !=='social-sign-in' && req.method==='GET') {
				res.redirect('/auth/user/finishregistration?reason=social-sign-in-pending');
			}
			else if (loginExtSettings && loginExtSettings.settings.requireusername !== false && !req.user.username  && req.query.required !=='username' && req.method==='GET') {
				res.redirect('/auth/user/finishregistration?required=username');
				// return next();
			}
			else if (loginExtSettings && loginExtSettings.settings.requireemail !== false && !req.user.email  && req.query.required !=='email' && req.method==='GET') {
				res.redirect('/auth/user/finishregistration?required=email');
			}
			else if (loginExtSettings && loginExtSettings.settings.requireemail !== false && !req.user.email  && req.query.required !=='email'  && req.method==='GET') {
				res.redirect('/auth/user/finishregistration?required=email');
			}
			else if (loginExtSettings && loginExtSettings.settings.requireuseractivation && req.user.activated === false && req.query.required !=='activation' && req.method==='GET') {
				res.redirect('/auth/user/finishregistration?required=activation');
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
				forceAuthLogin(req, res);
			}
		}
	}
};

//GET auth/user/activate
var get_activation = function (req, res) {
	if (req.isAuthenticated()) {
		CoreController.getPluginViewDefaultTemplate({
				viewname: 'user/activate',
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
							title: 'Activation Email'
						},
						user: req.user
					}
				});
			}
		);
	}
	else {
		forceAuthLogin(req, res);
	}
};

//POST to auth/user/activate 
var activate_user = function (req, res, next) {
	var emailviewname = loginExtSettings.settings.activateEmailTemplate || 'email/user/welcome_with_validation';
	if (req.isAuthenticated()) {
		CoreController.getPluginViewDefaultTemplate({
				viewname: emailviewname,
				themefileext: appSettings.templatefileextension
			},
			function (err, templatepath) {
				// console.log('templatepath', templatepath);
				if (loginExtSettings.settings.activateEmailTemplate) {
					templatepath = path.resolve(process.cwd(), loginExtSettings.settings.activateEmailTemplate);
				}
				else if (templatepath === emailviewname) {
					templatepath = path.resolve(process.cwd(), 'app/views', templatepath + '.' + appSettings.templatefileextension);
				}
				if (err) {
					CoreController.handleDocumentQueryErrorResponse({
						err: err,
						res: res,
						req: req
					});
				}
				else {
					var coreMailerOptions = {
						appenvironment: appSettings.application.environment,
						to: req.user.email,
						bcc: (loginExtSettings.settings.useBccOnActivation) ? appSettings.adminnotificationemail : '',
						replyTo: appSettings.fromemail || appSettings.adminnotificationemail,
						from: appSettings.fromemail || appSettings.adminnotificationemail,
						subject: loginExtSettings.settings.activationEmailSubject || appSettings.name + ' User Account Activation',
						emailtemplatefilepath: templatepath,
						emailtemplatedata: {
							user: req.user,
							hostname: req.headers.host,
							appname: appSettings.name,
							filename: templatepath
						}
					};
					if (loginExtSettings.settings.adminbccemail || appSettings.adminbccemail) {
						coreMailerOptions.bcc = loginExtSettings.settings.adminbccemail || appSettings.adminbccemail;
					}
					CoreMailer.sendEmail(coreMailerOptions, function (sendemailerr, emailstatus) {
						if (sendemailerr) {
							CoreController.handleDocumentQueryErrorResponse({
								err: sendemailerr,
								res: res,
								req: req
							});
						}
						else {
							logger.silly('emailstatus', emailstatus);
							req.flash('info', 'user activation token email sent to ' + req.user.email);
							if (req.controllerData && req.controllerData.sendemailstatus) {
								req.controllerData.activate_user_emailstatus = emailstatus;
								next();
							}
							else {
								res.redirect(loginExtSettings.settings.authLoggedInHomepage);
							}
						}

					});
				}
			}
		);
	}
	else {
		forceAuthLogin(req, res);
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
	CoreController = resources.core.controller;
	CoreUtilities = resources.core.utilities;
	CoreMailer = resources.core.extension.mailer;

	// var appenvironment = appSettings.application.environment;
	loginExtSettings = resources.app.controller.extension.login.loginExtSettings;
	passportController = require('./passport_controller')(resources, {
		User: User,
		loginExtSettings: loginExtSettings,
		passport: passport
	});
	passportController.serialize();
	passportController.deserialize();
	passport = passportController.passport;
	passportController.usePassport();
	return {
		rememberme: rememberme,
		login: login,
		logout: logout,
		activate_user: activate_user,
		get_activation: get_activation,
		ensureAuthenticated: ensureAuthenticated,
		loginExtSettings: loginExtSettings,
		passport: passport,
		passportController: passportController
	};
};

module.exports = controller;
