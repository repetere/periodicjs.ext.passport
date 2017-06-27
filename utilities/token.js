'use strict';
const periodic = require('periodicjs');
const moment = require('moment');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const passportSettings = periodic.settings.extensions[ 'periodicjs.ext.passport' ];

function encode(data) {
  return jwt.sign(data, passportSettings.registration.token.secret);
};

function decode(data) {
  return new Promise((resolve, reject) => {
    try {
      jwt.verify(data, passportSettings.registration.token.secret, {}, (err, decoded_token) => {
        logger.debug('jwt decode data', { data, decoded_token });
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
};

function getTokenExpiresTime() {
  const now = new Date();
  return new Date(now.getTime() + (passportSettings.registration.token.reset_token_expires_minutes * 60 * 1000)).getTime();
};

function generateUserActivationData(options) {
  const { user } = options;
  return new Promise((resolve, reject) => {
    try {
      let salt;
      const expires = getTokenExpiresTime();
      const user_activation_token = encode({
        email: user.email,
      });
      bcrypt.genSalt(10)
        .then(generatedSalt => {
          salt = generatedSalt;
      })
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