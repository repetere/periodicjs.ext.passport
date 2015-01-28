'use strict';

// var passport = require('passport'),
// 	jwt = require('jsonwebtoken'),
// 	async = require('async'),
// 	fs = require('fs-extra'),
// 	Utilities = require('periodicjs.core.utilities'),
// 	Extensions = require('periodicjs.core.extensions'),
// 	tokenConfig = require('../config/token'),
// 	CoreExtension = new Extensions({
// 		extensionFilePath: path.resolve(process.cwd(), './content/config/extensions.json')
// 	}),
// 	authLoginPath = '/auth/login/',
// 	authLogoutPath = '/',
// 	authLoggedInHomepage = '/p-admin',
// 	merge = require('utils-merge'),
// 	CoreUtilities,
// 	mongoose,
// 	configError,
// 	loginExtSettingsFile,
// 	loginExtSettings;
// 	
var appSettings,
	logger,
	User,
	loginExtSettings,
	changedemailtemplate,
	emailtransport,
	CoreController,
	ControllerHelper = require('periodicjs.core.controller'),
	CoreMailer = require('periodicjs.core.mailer'),
	path = require('path');

// var authenticateUser = function (options) {};


var _getForgotEmailTemplate_ASYNC = function () {
	CoreController.getPluginViewDefaultTemplate({
			viewname: 'views/user/email/forgot',
			themefileext: appSettings.templatefileextension
		},
		function (err, templatepath) {
			if (templatepath === 'views/user/email/forgot') {
				templatepath = path.resolve(process.cwd(), 'node_modules/periodicjs.ext.login/views', templatepath + '.' + appSettings.templatefileextension);
			}
			changedemailtemplate = templatepath;
		}
	);
};

var _getCoreMailerTransport_ASYNC = function () {
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
};

var emailController = function (resources, emailResources) {
	appSettings = resources.settings;
	logger = resources.logger;
	User = emailResources.User;
	CoreController = new ControllerHelper(resources);
	loginExtSettings = emailResources.loginExtSettings;

	_getForgotEmailTemplate_ASYNC();
	_getCoreMailerTransport_ASYNC();

	return {
		// usePassport: usePassport,
		// deserialize: deserialize,
		// serialize: serialize,
		// passport: passport
	};
};

module.exports = emailController;
