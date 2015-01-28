
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

