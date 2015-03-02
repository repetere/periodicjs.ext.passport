'use strict';

var passport = require('passport'),
	merge = require('utils-merge'),
	Utilities = require('periodicjs.core.utilities'),
	ControllerHelper = require('periodicjs.core.controller'),
	CoreUtilities,
	CoreController,
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
			else if (loginExtSettings && loginExtSettings.settings.requireemail !== false && !req.user.email) {
				res.redirect('/auth/user/finishregistration?required=email');
			}
      else if (loginExtSettings && loginExtSettings.settings.requireuseractivation) {
        res.redirect('/auth/user/activation');
      }
			/*
			if settings.requireactivation && user.activted ===false
				if has an req.originalURL
					store original url in req.session.returnurl
					redirect to /auth/user/activation?return url (see below on around 167)
				else
					redirect to /auth/user/activation
			 */
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

//GET auth/user/activate
var get_activation = function(req,res) {
  var activation_token = req.controllerData.activation_token;
  if(activation_token){
    console.log(activation_token);
  }
  if(!activation_token){
    console.log("No activation token");
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
            title: 'Activate Your Account',
            current_user: found_user
          },
          user: req.user
        }
      });
    });
  }
  //-> update user status
  //if status updated
  //remove the req.session.return_url
  //req.flash success -> user validated
  //redirect to return_url
//else
  //render page validation page
  //form input validation link or send a new validation email

}

//POST to auth/user/activate 
var activate_user = function(req,res,next) {
  return next();
}

/*

middleware to get activation link is in token controller, 
req.controllerData.activation_token is set in that middleware function

this page requires authetication
get ->get_activation /auth/user/activation:activation_link function(req,res)
	if(req.controllerData.activation_token)
		-> update user status
			if status updated
				remove the req.session.return_url
				req.flash success -> user validated
				redirect to return_url
	else
		render page validation page
			form input validation link or send a new validation email
 */


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
    activate_user:activate_user,
    get_activation: get_activation,
		ensureAuthenticated: ensureAuthenticated,
		loginExtSettings: loginExtSettings,
		passport: passport
	};
};




module.exports = controller;
