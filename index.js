'use strict';
const path = require('path');
const periodic = require('periodicjs');
const LocalStrategy = require('passport-local').Strategy;
const utilities = require('./utilities');
const passport = utilities.passport;
// const passportSettings = utilities.getSettings();
module.exports = () => {
  return new Promise((resolve, reject) => {
    passport.use(new LocalStrategy({
      passReqToCallback: true,
    }, utilities.auth.localLoginVerifyCallback));
    passport.serializeUser(utilities.auth.serialize);
    passport.deserializeUser(utilities.auth.deserialize);
    resolve(true);
  });
};