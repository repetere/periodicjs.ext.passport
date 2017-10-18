'use strict';
const periodic = require('periodicjs');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const logger = periodic.logger;
const passportSettings = periodic.settings.extensions['periodicjs.ext.passport'];
let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (e) {
  bcrypt = require('bcrypt-nodejs');
}

function encode(data) {
  return jwt.sign(data, passportSettings.registration.token.secret);
}

function decode(data) {
  return new Promise((resolve, reject) => {
    try {
      jwt.verify(data, passportSettings.registration.token.secret, {}, (err, decoded_token) => {
        logger.debug('jwt decode data', { data, decoded_token, });
        if (err) {
          reject(err);
        } else {
          resolve(decoded_token);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

function getTokenExpiresTime() {
  const now = new Date();
  return new Date(now.getTime() + (passportSettings.registration.token.activation_token_expires_minutes * 60 * 1000)).getTime();
}

function generateUserActivationData(options) {
  const { user, } = options;
  return new Promise((resolve, reject) => {
    try {
      const expires = getTokenExpiresTime();
      const user_activation_token = encode({
        email: user.email,
      });
      bcrypt.genSalt(10)
        .then(generatedSalt => {
          const passportextensionattributes = {
            user_activation_token,
            user_activation_token_link: periodic.core.utilities.makeNiceName(bcrypt.hashSync(user_activation_token, generatedSalt)),
            reset_activation_expires_millis: expires,
          };
          // console.log({ passportextensionattributes, user });
          user.extensionattributes = Object.assign({}, user.extensionattributes);
          user.extensionattributes.passport = Object.assign({}, user.extensionattributes.passport, passportextensionattributes);
          resolve(user);
        })
        .catch(reject);
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  encode,
  decode,
  getTokenExpiresTime,
  generateUserActivationData,
};