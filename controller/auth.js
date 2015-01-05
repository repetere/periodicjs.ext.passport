'use strict';

var passport        = require('passport'),
	path              = require('path'),
  jwt               = require('jsonwebtoken'),
  async             = require('async'),
	LocalStrategy     = require('passport-local').Strategy,
	FacebookStrategy  = require('passport-facebook').Strategy,
	InstagramStrategy = require('passport-instagram').Strategy,
	TwitterStrategy   = require('passport-twitter').Strategy,
	fs                = require('fs-extra'),
	Utilities         = require('periodicjs.core.utilities'),
	ControllerHelper  = require('periodicjs.core.controller'),
	Extensions        = require('periodicjs.core.extensions'),
  CoreMailer = require('periodicjs.core.mailer'),
  tokenConfig       = require('../config/token'),
	CoreExtension     = new Extensions({
		extensionFilePath: path.resolve(process.cwd(), './content/config/extensions.json')
	}),
	authLoginPath        = '/auth/login/',
	authLogoutPath       = '/',
	authLoggedInHomepage = '/p-admin',
	merge                = require('utils-merge'),
	CoreUtilities,
	CoreController,
  emailtransport,
	appSettings,
	mongoose,
	User,
	logger,
	configError,
	loginExtSettingsFile,
  changedemailtemplate,
	loginExtSettings;

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
		res.redirect(authLogoutPath);
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
	if (req.method === 'POST' && req.url === authLoginPath) {
		if (req.body.rememberme) {
			req.session.cookie.maxAge = 2592000000; // 30*24*60*60*1000 Rememeber 'me' for 30 days
		}
		else {
			req.session.cookie.expires = false;
		}
	}
	next();
};

var waterfall = function(array,cb) {
  async.waterfall(array,cb);
};

var invalidateUserToken = function(req,res,next,cb) {
    console.log(req.params.token);
    console.log(req.params);
    var token = req.param.token;
    User.findOne({"attributes.reset_token": token}, function(err, usr) {
        if(err) {
            console.log('error finding the user for invalidate token fn');
            cb(err,null);
        }
        usr.attributes.reset_token = null;
        usr.attributes.reset_token_expires_millis = 0;
        usr.save(function(err, usr) {
            if (err) {
                cb(err, null);
            } else {
                cb(false, usr);
            }
        });
    });
};

var encode = function(data) {
  return jwt.sign(data,tokenConfig.secret);
};

var decode = function(data,cb) {
  console.log(data,"DATA from decode");
  console.log(tokenConfig);
  jwt.verify(data,tokenConfig.secret,function(err, decoded_token) {
    if (err) {
     console.log("Error from JWT.verify", err.name);
     console.log("Error from JWT.verify", err.message);
    }
    cb(decoded_token);
  });
};

var hasExpired = function(created) {
  var now = new Date();
  var diff = (now.getTime() - created);
  return diff > tokenConfig.ttl;
};

var getUser = function(req,res,next,cb) {
    User.findOne(req.body.email, function(err, user) {
        if (err) {
            cb(err, null);
        } else if (user) {
            cb(false, user);
        } else {
            //TODO: This is not really robust and we 
            //should probably return an error code or something here
            cb(new Error('No user with that email found.'), null);
        }
    });
};

var generateToken = function(user,cb) {
  //Generate reset token and URL link; also, create expiry for reset token
  //make sure attributes exists || create it via merge
  var now = new Date();
  var expires = new Date(now.getTime() + (tokenConfig.resetTokenExpiresMinutes * 60 * 1000)).getTime();
  if (!user.attributes) {
    user.attributes = {};
    user.attributes.reset_token = encode(user.email);
    user.attributes.reset_token_expires_millis = expires;
  }
  user.attributes.reset_token = encode(user.email);
  user.attributes.reset_token_expires_millis = expires;
  console.log(user);
  user.save();
  cb(null,user);
};

// create a func for the mail options

var emailConfig = function(user,cb) {
  var options = {};
  options.mailtransport = emailtransport;
  options.subject = "You forgot your password";
  options.user = user;
  options.replyTo = 'ecasilla@icloud.com';
  cb(null,options);

}

var resetPassword = function(user,cb) {
  if (user.password) {
    if (user.password !== user.passwordconfirm) {
      err = new Error('Passwords do not match');
      cb(err);
    }
    else if (user.password === undefined || user.password.length < 8) {
      err = new Error('Password is too short');
      cb(err);
    }
    else {
      var salt = bcrypt.genSaltSync(10),
        hash = bcrypt.hashSync(user.password, salt);
        user.password = hash;
        cb(null,user);
    }
  }
}

var sendEmail = function(options,cb) {
 //require mailer 
 var mailtransport = options.mailtransport,
     user          = options.user,
     mailoptions   = {};

     mailoptions.to = (options.to) ? options.to : 'ecasilla@icloud.com'
     mailoptions.cc = options.cc; //options.ccc;
     mailoptions.bcc = options.bcc;
     mailoptions.replyTo = options.replyTo;
     mailoptions.subject = options.subject;
     if (options.generatetextemail) {
       mailoptions.generateTextFromHTML = true;
     }
     mailoptions.html        = options.html;
     mailoptions.text = options.text;
     mailtransport.sendMail(mailoptions, cb);
};


//Post to auth/forgot with the users email
var forgot = function(req,res,next) {
 var arr = [ 
   function(cb){cb(null,req,res,next)},
   getUser,
   generateToken,
   emailConfig,
   sendEmail
 ];

 waterfall(arr, 
   function(err,results) {
     if (err){ 
       return next(err);
       res.redirect('/forgot');
     }
     res.send(results);
     next();
   }); 
};

//GET if the user token is vaild show the change password page
var reset = function(req,res,next) {
  var token = req.params.token;
  User.findOne({"attributes.reset_token": token},function(err,user) {
   if (err || !user) {
    req.flash('error', 'Password reset token is invalid.');
    return res.redirect('/auth/forgot');
   }
   //if (hasExpired(user.attributes.reset_token_expires_millis)) {
     //req.flash('error', 'Password reset token is has expired.');
     //return res.redirect('/auth/forgot');
   //}
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
             title: 'Reset Password'
           },
           user: req.user
         }
       });
     });

  });
};


//POST change the users old password to the new password in the form
var token = function(req,res,next) {
 waterfall([
   function(cb){cb(null,req,res,next)},
     invalidateUserToken,
     resetPassword,
     emailConfig,
     sendEmail,
 ],
 function(err,results) {
   if (err) {
    req.flash("Opps Something went wrong Please Try Again!");
    res.redirect("/reset");
   }
  res.flash("Password Sucessfully Changed!");
  res.redirect("/login");
 }); 
};


/**
 * logs user in via facebook oauth2
 * @param  {object} req
 * @param  {object} res
 * @return {Function} next() callback
 */
var facebook = function (req, res, next) {
	if (configError) {
		next(configError);
	}
	else {
		passport.authenticate('facebook', {
			scope: loginExtSettings.passport.oauth.facebook.scope
		})(req, res, next);
	}
};

/**
 * facebook oauth callback
 * @param  {object} req
 * @param  {object} res
 * @return {Function} next() callback
 */
var facebookcallback = function (req, res, next) {
	var loginUrl = (req.session.return_url) ? req.session.return_url : authLoggedInHomepage;
	var loginFailureUrl = (req.session.return_url) ? req.session.return_url : authLoginPath + '?return_url=' + req.session.return_url;
	passport.authenticate('facebook', {
		successRedirect: loginUrl,
		failureRedirect: loginFailureUrl,
		failureFlash: 'Invalid facebook authentication credentials username or password.'
	})(req, res, next);
};
/**
 * logs user in via instagram oauth2
 * @param  {object} req
 * @param  {object} res
 * @return {Function} next() callback
 */
var instagram = function (req, res, next) {
	if (configError) {
		next(configError);
	}
	else {
		passport.authenticate('instagram', {
			scope: loginExtSettings.passport.oauth.instagram.scope
		})(req, res, next);
	}
};

/**
 * instagram oauth callback
 * @param  {object} req
 * @param  {object} res
 * @return {Function} next() callback
 */
var instagramcallback = function (req, res, next) {
	var loginUrl = (req.session.return_url) ? req.session.return_url : authLoggedInHomepage;
	var loginFailureUrl = (req.session.return_url) ? req.session.return_url : authLoginPath + '?return_url=' + req.session.return_url;
	passport.authenticate('instagram', {
		successRedirect: loginUrl,
		failureRedirect: loginFailureUrl,
		failureFlash: 'Invalid instagram authentication credentials username or password.'
	})(req, res, next);
};
/**
 * logs user in via twitter oauth2
 * @param  {object} req
 * @param  {object} res
 * @return {Function} next() callback
 */
var twitter = function (req, res, next) {
	if (configError) {
		next(configError);
	}
	else {
		passport.authenticate('twitter', {
			scope: loginExtSettings.passport.oauth.twitter.scope
		})(req, res, next);
	}
};

/**
 * twitter oauth callback
 * @param  {object} req
 * @param  {object} res
 * @return {Function} next() callback
 */
var twittercallback = function (req, res, next) {
	var loginUrl = (req.session.return_url) ? req.session.return_url : authLoggedInHomepage;
	var loginFailureUrl = (req.session.return_url) ? req.session.return_url : authLoginPath + '?return_url=' + req.session.return_url;
	passport.authenticate('twitter', {
		successRedirect: loginUrl,
		failureRedirect: loginFailureUrl,
		failureFlash: 'Invalid twitter authentication credentials username or password.'
	})(req, res, next);
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
		if (req.isAuthenticated()) {
			if (req.session.linkaccount === true) {
				var updateuser = {};
				updateuser.attributes = merge(req.user.attributes, req.session.linkaccountdata);
				CoreController.updateModel({
					cached: req.headers.periodicCache !== 'no-periodic-cache',
					model: User,
					id: req.user._id,
					updatedoc: updateuser,
					// saverevision: true,
					// population: 'contenttypes',
					res: res,
					req: req,
					callback: function (err, updateduser) {
						if (err) {
							next(err);
						}
						else {
							logger.verbose('linked ', req.session.linkaccountservice, ' instagram account for ', req.user.id, req.user.email, req.user.username);
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
					res.redirect(authLoginPath + '?return_url=' + req.originalUrl);
				}
				else {
					res.redirect(authLoginPath);
				}
			}
		}
	}
};

var authenticateUser = function (options) {
	var username = options.username,
		donecallback = options.done,
		nonusercallback = options.nonusercallback,
		existinusercallback = options.existinusercallback,
		exitinguserquery = options.exitinguserquery;
	User.findOne(exitinguserquery, function (err, user) {
		if (err) {
			logger.silly('login error');
			donecallback(err);
		}
		else if (!user) {
			logger.silly('login no user');
			nonusercallback();
		}
		else {
			logger.silly('login found exiting user');
			existinusercallback(user);
		}
	});
};

var linkSocialAccount = function (options) {
	var done = options.donecallback,
		findsocialaccountquery = options.findsocialaccountquery,
		socialaccountattributes = options.socialaccountattributes,
		newaccountdata = options.newaccountdata,
		linkaccountservice = options.linkaccountservice,
		requestobj = options.requestobj;
	User.findOne(findsocialaccountquery,
		function (err, existingUser) {
			if (err) {
				return done(err);
			}
			else if (existingUser) {
				logger.info('ext - controller/auth.js - already has an account, trying to connect account');
				existingUser.attributes = merge(existingUser.attributes, socialaccountattributes);
				existingUser.save(done);
			}
			else if (requestobj.user) {
				requestobj.session.linkaccount = true;
				requestobj.session.linkaccountservice = 'instagram';
				requestobj.session.linkaccountdata = socialaccountattributes;
				done(null, requestobj.user);
			}
			else {
				logger.info('ext - controller/auth.js - creating new ' + linkaccountservice + ' user');
				newaccountdata.attributes = socialaccountattributes;
				User.create(newaccountdata, done);
			}
		});
};

/**
 * uses passport to log users in, calls done(err,user) when complete, can define what credentials to check here
 * @param  {object} req
 * @param  {object} res
 * @return {Function} done(err,user) callback
 */
var usePassport = function () {
	passport.use(new LocalStrategy(function (username, password, done) {
		authenticateUser({
			exitinguserquery: {
				$or: [{
					username: {
						$regex: new RegExp(username, 'i')
					}
				}, {
					email: {
						$regex: new RegExp(username, 'i')
					}
				}]
			},
			nonusercallback: function () {
				done(null, false, {
					message: 'Unknown user ' + username
				});
			},
			existinusercallback: function (user) {
				if (loginExtSettings && loginExtSettings.settings.usepassword === false) {
					logger.verbose(' skip password usage ');
					done(null, user);
				}
				else {
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
			},
			donecallback: done
		});
	}));

	if (loginExtSettings && loginExtSettings.passport && loginExtSettings.passport.oauth.facebook && loginExtSettings.passport.oauth.facebook.appid) {
		passport.use(new FacebookStrategy({
				clientID: loginExtSettings.passport.oauth.facebook.appid,
				clientSecret: loginExtSettings.passport.oauth.facebook.appsecret,
				callbackURL: loginExtSettings.passport.oauth.facebook.callbackurl,
				passReqToCallback: true
			},
			function (req, accessToken, refreshToken, profile, done) {
				var facebookdata = profile._json;

				authenticateUser({
					exitinguserquery: {
						email: facebookdata.email,
						'attributes.facebookid': facebookdata.id,
						'attributes.facebookaccesstoken': accessToken.toString()
					},
					existinusercallback: function (user) {
						return done(null, user);
					},
					nonusercallback: function () {
						linkSocialAccount({
							donecallback: done,
							linkaccountservice: 'facebook',
							requestobj: req,
							findsocialaccountquery: {
								email: facebookdata.email,
								'attributes.facebookid': facebookdata.id
							},
							socialaccountattributes: {
								facebookid: facebookdata.id,
								facebookaccesstoken: accessToken,
								facebookusername: facebookdata.username,
								facebookaccesstokenupdated: new Date()
							},
							newaccountdata: {
								email: facebookdata.email,
								activated: true,
								accounttype: 'social-sign-in',
								firstname: facebookdata.first_name,
								lastname: facebookdata.last_name
							}
						});
					},
					donecallback: done
				});
			}));
	}

	if (loginExtSettings && loginExtSettings.passport && loginExtSettings.passport.oauth.instagram && loginExtSettings.passport.oauth.instagram.clientid) {
		passport.use(new InstagramStrategy({
				clientID: loginExtSettings.passport.oauth.instagram.clientid,
				clientSecret: loginExtSettings.passport.oauth.instagram.clientsecret,
				callbackURL: loginExtSettings.passport.oauth.instagram.callbackurl,
				passReqToCallback: true,
			},
			function (req, accessToken, refreshToken, profile, done) {
				// console.log('instagram req:',req); 	// console.log('instagram accessToken:',accessToken); // console.log('instagram refreshToken:',refreshToken); // console.log('instagram profile:',profile);

				var instagramdata = profile;
				authenticateUser({
					exitinguserquery: {
						// email: instagramdata.email,
						'attributes.instagramid': instagramdata.id,
						'attributes.instagramaccesstoken': accessToken.toString()
					},
					existinusercallback: function (user) {
						console.log('user from instagram passport', user);
						return done(null, user);
					},
					nonusercallback: function () {
						linkSocialAccount({
							donecallback: done,
							linkaccountservice: 'instagram',
							requestobj: req,
							findsocialaccountquery: {
								'attributes.instagramid': instagramdata.id,
							},
							socialaccountattributes: {
								instagramid: instagramdata.id,
								instagramaccesstoken: accessToken,
								instagramusername: instagramdata.username,
								instagramaccesstokenupdated: new Date()
							},
							newaccountdata: {
								email: instagramdata.username + '@instagram.account.com',
								username: instagramdata.username,
								activated: true,
								accounttype: 'social-sign-in',
								firstname: instagramdata.first_name,
								lastname: instagramdata.last_name
							}
						});
					},
					donecallback: done
				});
			}));

	}

	if (loginExtSettings && loginExtSettings.passport && loginExtSettings.passport.oauth.twitter && loginExtSettings.passport.oauth.twitter.consumerKey) {
		passport.use(new TwitterStrategy({
				consumerKey: loginExtSettings.passport.oauth.twitter.consumerKey,
				consumerSecret: loginExtSettings.passport.oauth.twitter.consumerSecret,
				callbackURL: loginExtSettings.passport.oauth.twitter.callbackurl,
				passReqToCallback: true,
			},
			function (req, token, tokenSecret, profile, done) {
				// console.log('twitter req:',req); 	// console.log('twitter accessToken:',accessToken); // console.log('twitter refreshToken:',refreshToken);
				// console.log('twitter profile:', profile);

				var twitterdata = profile;
				authenticateUser({
					exitinguserquery: {
						// email: twitterdata.email,
						'attributes.twitterid': twitterdata.id,
						'attributes.twitteraccesstoken': token.toString(),
						'attributes.twitteraccesstokensecret': tokenSecret.toString()
					},
					existinusercallback: function (user) {
						console.log('user from twitter passport', user);
						return done(null, user);
					},
					nonusercallback: function () {
						linkSocialAccount({
							donecallback: done,
							linkaccountservice: 'twitter',
							requestobj: req,
							findsocialaccountquery: {
								'attributes.twitterid': twitterdata.id
							},
							socialaccountattributes: {
								twitterid: twitterdata.id,
								twitterusername: twitterdata.username,
								twitteraccesstoken: token,
								twitteraccesstokensecret: tokenSecret,
								twitteraccesstokenupdated: new Date()
							},
							newaccountdata: {
								email: twitterdata.username + '@twitter.account.com',
								username: twitterdata.username,
								activated: true,
								accounttype: 'social-sign-in',
								firstname: twitterdata.name,
							}
						});
					},
					donecallback: done
				});
			}));
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
	authLoginPath = (appSettings.authLoginPath) ? appSettings.authLoginPath : authLoginPath;
	authLogoutPath = (appSettings.authLogoutPath) ? appSettings.authLogoutPath : authLogoutPath;
	authLoggedInHomepage = (appSettings.authLoggedInHomepage) ? appSettings.authLoggedInHomepage : authLoggedInHomepage;

	var appenvironment = appSettings.application.environment;
	if (appSettings.loginExtSettings) {
		loginExtSettings = appSettings.loginExtSettings;
	}
	if (appSettings.authskipconfload) {
		usePassport();
	}
	else {
		fs.readJson(loginExtSettingsFile, function (err, settingJSON) {
			if (err) {
				usePassport();
				throw new Error(err);
			}
			else {
				// console.log('settingJSON', settingJSON);
				if (settingJSON[appenvironment]) {
					loginExtSettings = settingJSON[appenvironment];
					authLoginPath = (loginExtSettings.settings.authLoginPath) ? loginExtSettings.settings.authLoginPath : authLoginPath;
					authLogoutPath = (loginExtSettings.settings.authLogoutPath) ? loginExtSettings.settings.authLogoutPath : authLogoutPath;
					authLoggedInHomepage = (loginExtSettings.settings.authLoggedInHomepage) ? loginExtSettings.settings.authLoggedInHomepage : authLoggedInHomepage;

					// console.log('settings file authLoginPath',authLoginPath);
					usePassport();
				}
				else {
					configError = new Error('Invalid login configuration, no transport for env: ' + appenvironment);
					throw configError;
				}
			}
		});
	}
  
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
		rememberme          : rememberme,
		login               : login,
		logout              : logout,
    forgot              : forgot,
    reset               : reset,
    token               : token,
		facebook            : facebook,
		facebookcallback    : facebookcallback,
		instagram           : instagram,
		instagramcallback   : instagramcallback,
		twitter             : twitter,
		twittercallback     : twittercallback,
		ensureAuthenticated : ensureAuthenticated
	};
};


/**
 * store user id in session
 * @param  {object} req
 * @param  {object} res
 * @return {Function} next() callback
 */
passport.serializeUser(function (user, done) {
	logger.verbose('controller - auth.js - serialize user');
	done(null, user._id);
});

/**
 * retrieves user data
 * @param  {object} req
 * @param  {object} res
 * @return {Function} next() callback
 */
passport.deserializeUser(function (token, done) {
	logger.verbose('controller - auth.js - deserialize user');
	User.findOne({
			_id: token
		})
		.populate('userroles primaryasset')
		.exec(function (err, user) {
			done(err, user);
		});
});

module.exports = controller;
