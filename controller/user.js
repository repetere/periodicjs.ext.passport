'use strict';

var Utilities = require('periodicjs.core.utilities'),
	ControllerHelper = require('periodicjs.core.controller'),
	CoreMailer = require('periodicjs.core.mailer'),
	extend = require('utils-merge'),
	path = require('path'),
	appSettings,
	mongoose,
	User,
	logger,
	loginExtSettings,
	appenvironment,
	CoreUtilities,
	CoreController;

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
			welcomeemaildata: {
				getEmailTemplateFunction: CoreController.getPluginViewDefaultTemplate,
				emailviewname: 'email/user/welcome',
				themefileext: appSettings.templatefileextension,
				sendEmailFunction: CoreMailer.sendEmail,
				subject: appSettings.name + ' New User Registration',
				replyto: appSettings.adminnotificationemail,
				hostname: req.headers.host,
				appenvironment: appenvironment,
				appname: appSettings.name,
			}
		},
		finalnewusersettings;
	finalnewusersettings = extend(newuseroptions, loginExtSettings.new_user_validation);
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

/**
 * if username required, updates user username after account is created
 * @param  {object} req
 * @param  {object} res
 * @return {object} reponds with an error page or requested view
 */
var updateuserregistration = function (req, res) {
	var userError;

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
				userToUpdate.username = req.body.username;
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
						var forwardUrl = (req.session.return_url) ? req.session.return_url : '/';
						req.flash('info', 'updated user account');
						res.redirect(forwardUrl);

						CoreController.getPluginViewDefaultTemplate({
							viewname: 'email/user/update_user_account',
							themefileext: appSettings.templatefileextension
						},
						function (err, templatepath) {
							if (err) {
								logger.error(err);
							}
							else {
								// console.log('user update registration', userSaved);
								if (templatepath === 'email/user/update_user_account') {
									templatepath = path.resolve(process.cwd(), 'node_modules/periodicjs.ext.login/views', templatepath + '.' + appSettings.templatefileextension);
								}

								CoreMailer.sendEmail({
									appenvironment: appenvironment,
									to: userSaved.email,
									replyTo: appSettings.adminnotificationemail,
									subject: appSettings.name + ' - User Account Updated',
									emailtemplatefilepath: templatepath,
									emailtemplatedata: {
										user: userSaved,
										appname: appSettings.name,
										hostname: req.headers.host,
										update_message: 'Your user account username was updated'
									}
								}, 
								function(err){
									if(err){
										logger.error(err);
									}
									else{
										logger.silly('sent email');
									}
								});

								}
							}
						);

					}
				});
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
	CoreController = new ControllerHelper(resources);
	CoreUtilities = new Utilities(resources);
	loginExtSettings = resources.app.controller.extension.login.loginExtSettings;
	appenvironment = appSettings.application.environment;

	return {
		login: login,
		newuser: newuser,
		forgot: forgot,
		create: create,
		finishregistration: finishregistration,
		updateuserregistration: updateuserregistration
	};
};

module.exports = controller;
