'use strict';

var CoreUtilities,
	CoreController,
	CoreMailer,
	extend = require('utils-merge'),
	jwt = require('jsonwebtoken'),
	appSettings,
	mongoose,
	User,
	logger,
	loginExtSettings,
	appenvironment,
	welcomeemailtemplate,
	emailtransport;

/**
 * user login page
 * @param  {object} req
 * @param  {object} res
 * @return {object} reponds with an error page or requested view
 */
var login = function (req, res) {
	CoreController.getPluginViewDefaultTemplate({
			viewname: 'user/login',
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
						title: 'Login'
					},
					user: req.user
				}
			});
		}
	);
};

/**
 * user registration form
 * @param  {object} req
 * @param  {object} res
 * @return {object} reponds with an error page or requested view
 */
var newuser = function (req, res) {
	CoreController.getPluginViewDefaultTemplate({
			viewname: 'user/new',
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
						title: 'Register'
					},
					user: req.user
				}
			});
		}
	);
};

/**
 * create a new user account
 * @param  {object} req
 * @param  {object} res
 * @return {object} reponds with an error page or requested view
 */
var create = function (req, res) {
	var userdata = CoreUtilities.removeEmptyObjectValues(req.body),
		newuseroptions = {
			newuser: userdata,
			lognewuserin: true,
			req: req,
			send_new_user_email: true,
			requireuseractivation: loginExtSettings.settings.requireuseractivation,
			welcomeemaildata: {
				getEmailTemplateFunction: CoreController.getPluginViewDefaultTemplate,
				emailviewname: 'email/user/welcome',
				themefileext: appSettings.templatefileextension,
				sendEmailFunction: CoreMailer.sendEmail,
				subject: appSettings.newUserRegistrationSubject || appSettings.name + ' New User Registration',
				from: appSettings.fromemail || appSettings.adminnotificationemail,
				replyto: appSettings.fromemail || appSettings.adminnotificationemail,
				hostname: req.headers.host,
				appenvironment: appenvironment,
				appname: appSettings.name,
			}
		},
		finalnewusersettings;
	if (loginExtSettings.settings.adminbccemail || appSettings.adminbccemail) {
		newuseroptions.welcomeemaildata.bcc = loginExtSettings.settings.adminbccemail || appSettings.adminbccemail;
	}
	finalnewusersettings = extend(newuseroptions, loginExtSettings.new_user_validation);
	// console.log('finalnewusersettings',finalnewusersettings);
	User.createNewUserAccount(
		finalnewusersettings,
		function (newusererr /*, newuser*/ ) {
			if (newusererr) {
				CoreController.handleDocumentQueryErrorResponse({
					err: newusererr,
					res: res,
					req: req
				});
			}
			else {
				logger.silly('controller - periodic.ext.login/user.js - ' + req.session.return_url);
				if (req.session.return_url) {
					return res.redirect(req.session.return_url);
				}
				else {
					return res.redirect('/');
				}
			}
		});
};

/**
 * complete registration form view
 * @param  {object} req
 * @param  {object} res
 * @return {object} reponds with an error page or requested view
 */
var finishregistration = function (req, res) {
	CoreController.getPluginViewDefaultTemplate({
			viewname: 'user/finishregistration',
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
						title: 'complete registration'
					},
					user: req.user
				}
			});
		}
	);
};

var verify_user_activation = function (options, callback) {
	try {
		var user = options.user;
		User.findOne({
				email: user.email
			},
			function (err, userToUpdate) {
				if (err) {
					throw err;
				}
				var decoded = jwt.verify(userToUpdate.attributes.user_activation_token, loginExtSettings.token.secret);
				if (decoded.email === userToUpdate.email) {
					userToUpdate.activated = true;
					userToUpdate.save(function (err, userSaved) {
						if (err) {
							throw err;
						}
						else {
							callback(err, userSaved);
						}
					});
				}
				else {
					throw new Error('activation token is invalid');
				}
			});
	}
	catch (err) {
		callback(err);
	}
};

/**
 * if username required, updates user username after account is created
 * @param  {object} req
 * @param  {object} res
 * @return {object} reponds with an error page or requested view
 */
var updateuserregistration = function (req, res) {
	var userError, additionalqueryparams;

	User.findOne({
			email: req.user.email
		},
		function (err, userToUpdate) {
			if (err) {
				userError = err;
				CoreController.handleDocumentQueryErrorResponse({
					err: userError,
					res: res,
					req: req,
					errorflash: userError.message,
					redirecturl: '/auth/user/finishregistration'
				});
			}
			else if (!userToUpdate) {
				userError = new Error('could not find user, couldn\'t complate registration');
				CoreController.handleDocumentQueryErrorResponse({
					err: userError,
					res: res,
					req: req,
					errorflash: userError.message,
					redirecturl: '/auth/user/finishregistration'
				});
			}
			else {
				if (req.body.username) {
					userToUpdate.username = req.body.username;
				}
				if (userToUpdate.attributes.user_activation_token_link === req.body['activation-token']) {
					try {
						var decoded = jwt.verify(userToUpdate.attributes.user_activation_token, loginExtSettings.token.secret);
						if (decoded.email === req.user.email) {
							userToUpdate.activated = true;
							logger.info('update activation');
						}
						else {
							userError = new Error('activation token is invalid');
							additionalqueryparams = '?required=activation';
						}
					}
					catch (err) {
						userError = err;
					}
				}
				else {
					userError = new Error('invalid activation token');
					additionalqueryparams = '?required=activation';
				}

				if (userError) {
					CoreController.handleDocumentQueryErrorResponse({
						err: userError,
						res: res,
						req: req,
						errorflash: userError.message,
						redirecturl: '/auth/user/finishregistration' + additionalqueryparams
					});
				}
				else {
					userToUpdate.save(function (err, userSaved) {
						if (err) {
							userError = err;
							CoreController.handleDocumentQueryErrorResponse({
								err: userError,
								res: res,
								req: req,
								errorflash: userError.message,
								redirecturl: '/auth/user/finishregistration'
							});
						}
						else {
							var forwardUrl = (req.session.return_url) ? req.session.return_url : loginExtSettings.settings.authLoginPath;
							if(req.body['activation-token']){
								var updatetext = (loginExtSettings.settings.activation_update_text) ? loginExtSettings.settings.activation_update_text : 'Email verified successfully!';
								req.flash('info', updatetext);
							}
							else if(loginExtSettings.settings.update_with_flash){
								req.flash('info', 'updated user account');
							}
							if (loginExtSettings.settings.activationCompletePath) {
								res.redirect(loginExtSettings.settings.activationCompletePath);
							}
							else {
								res.redirect(forwardUrl);
							}

							if (welcomeemailtemplate && emailtransport) {
								User.sendWelcomeUserEmail({
									subject: appSettings.newUserRegistrationSubject || appSettings.name + ' New User Registration',
									from: appSettings.fromemail || appSettings.adminnotificationemail,
									replyTo: appSettings.fromemail || appSettings.adminnotificationemail,
									user: userSaved,
									hostname: req.headers.host,
									appname: appSettings.name,
									emailtemplate: welcomeemailtemplate,
									// bcc:'yje2@cornell.edu',
									mailtransport: emailtransport
								}, function (err, status) {
									if (err) {
										logger.error(err);
									}
									else {
										console.info('email status', status);
									}
								});
							}
						}
					});
				}
			}
		});
};

/**
 * @description Shows the forgot password view
 * @param  {object} req
 * @param  {object} res
 * @return {object} reponds with an error page or requested view
 */

var forgot = function (req, res) {
	CoreController.getPluginViewDefaultTemplate({
			viewname: 'user/forgot',
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
						title: 'Forgot Password'
					},
					user: req.user
				}
			});
		});
};

/**
 * login controller
 * @module userloginController
 * @{@link https://github.com/typesettin/periodicjs.ext.login}
 * @author Yaw Joseph Etse
 * @copyright Copyright (c) 2014 Typesettin. All rights reserved.
 * @license MIT
 * @requires module:path
 * @requires module:periodicjs.core.utilities
 * @requires module:periodicjs.core.controller
 * @requires module:periodicjs.core.mailer
 * @param  {object} resources variable injection from current periodic instance with references to the active logger and mongo session
 * @return {object}           userlogin
 */
var controller = function (resources) {
	logger = resources.logger;
	mongoose = resources.mongoose;
	appSettings = resources.settings;
	User = mongoose.model('User');
	CoreController = resources.core.controller;
	CoreUtilities = resources.core.utilities;
	CoreMailer = resources.core.extension.mailer;
	loginExtSettings = resources.app.controller.extension.login.loginExtSettings;
	appenvironment = appSettings.application.environment;

	return {
		login: login,
		newuser: newuser,
		forgot: forgot,
		create: create,
		verify_user_activation: verify_user_activation,
		finishregistration: finishregistration,
		updateuserregistration: updateuserregistration
	};
};

module.exports = controller;
