'use strict';

var logger,
	User,
	passport,
	loginExtSettings,
	merge = require('utils-merge'),
	FacebookStrategy = require('passport-facebook').Strategy,
	InstagramStrategy = require('passport-instagram').Strategy,
	TwitterStrategy = require('passport-twitter').Strategy,
	LocalStrategy = require('passport-local').Strategy;

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
				// logger.silly('instagram req:',req); 	// logger.silly('instagram accessToken:',accessToken); // logger.silly('instagram refreshToken:',refreshToken); // logger.silly('instagram profile:',profile);

				var instagramdata = profile;
				authenticateUser({
					exitinguserquery: {
						// email: instagramdata.email,
						'attributes.instagramid': instagramdata.id,
						'attributes.instagramaccesstoken': accessToken.toString()
					},
					existinusercallback: function (user) {
						logger.silly('user from instagram passport', user);
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
				// logger.silly('twitter req:',req); 	// logger.silly('twitter accessToken:',accessToken); // logger.silly('twitter refreshToken:',refreshToken);
				// logger.silly('twitter profile:', profile);

				var twitterdata = profile;
				authenticateUser({
					exitinguserquery: {
						// email: twitterdata.email,
						'attributes.twitterid': twitterdata.id,
						'attributes.twitteraccesstoken': token.toString(),
						'attributes.twitteraccesstokensecret': tokenSecret.toString()
					},
					existinusercallback: function (user) {
						logger.silly('user from twitter passport', user);
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

var serialize = function () {
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
};

var deserialize = function () {
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
};
var passportController = function (resources, passportResources) {
	logger = resources.logger;
	User = passportResources.User;
	passport = passportResources.passport;
	loginExtSettings = passportResources.loginExtSettings;
	return {
		usePassport: usePassport,
		deserialize: deserialize,
		serialize: serialize,
		passport: passport,
		authenticateUser: authenticateUser,
		linkSocialAccount: linkSocialAccount
	};
};

module.exports = passportController;
