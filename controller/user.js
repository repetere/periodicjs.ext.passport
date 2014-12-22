'use strict';

var path = require('path'),
	Utilities = require('periodicjs.core.utilities'),
	ControllerHelper = require('periodicjs.core.controller'),
	CoreMailer = require('periodicjs.core.mailer'),
	userHelper,
	appSettings,
	mongoose,
	User,
	logger,
	welcomeemailtemplate,
	emailtransport,
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
	var userdata = CoreUtilities.removeEmptyObjectValues(req.body);
	userHelper.createNewUser({
		userdata: userdata,
		User: User,
		res: res,
		req: req,
		applicationController: CoreController
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
					redirecturl: '/user/finishregistration'
				});
			}
			else if (!userToUpdate) {
				userError = new Error('could not find user, couldn\'t complate registration');
				CoreController.handleDocumentQueryErrorResponse({
					err: userError,
					res: res,
					req: req,
					errorflash: userError.message,
					redirecturl: '/user/finishregistration'
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
							redirecturl: '/user/finishregistration'
						});
					}
					else {
						var forwardUrl = (req.session.return_url) ? req.session.return_url : '/';
						req.flash('info', 'updated user account');
						res.redirect(forwardUrl);

						if (welcomeemailtemplate && emailtransport) {
							User.sendWelcomeUserEmail({
								subject: appSettings.name + ' New User Registration',
								user: userSaved,
								hostname: req.headers.host,
								appname: appSettings.name,
								emailtemplate: welcomeemailtemplate,
								// bcc:'yje2@cornell.edu',
								mailtransport: emailtransport
							}, function (err, status) {
								if (err) {
									console.log(err);
								}
								else {
									console.info('email status', status);
								}
							});
						}
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

var forgot = function(req, res){
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
  }
);

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
	userHelper = require(path.join(process.cwd(), 'app/controller/helpers/user'))(resources);
	User = mongoose.model('User');
	CoreController = new ControllerHelper(resources);
	CoreUtilities = new Utilities(resources);
	CoreController.getPluginViewDefaultTemplate({
			viewname: 'email/user/welcome',
			themefileext: appSettings.templatefileextension
		},
		function (err, templatepath) {
			if (templatepath === 'email/user/welcome') {
				templatepath = path.resolve(process.cwd(), 'app/views', templatepath + '.' + appSettings.templatefileextension);
			}
			User.getWelcomeEmailTemplate({
				templatefile: templatepath
			}, function (err, emailtemplate) {
				if (err) {
					console.error(err);
				}
				else {
					welcomeemailtemplate = emailtemplate;
				}
			});
		}
	);
	CoreMailer.getTransport({
		appenvironment: appSettings.application.environment
	}, function (err, transport) {
		if (err) {
			console.error(err);
		}
		else {
			emailtransport = transport;
		}
	});

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
