'use strict';
const periodic = require('periodicjs');
const moment = require('moment');
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
const passportSettings = periodic.settings.extensions[ 'periodicjs.ext.passport' ];

function checkUserPassword(options) {
  const { user } = options;
  return new Promise((resolve, reject) => {
    try {
      if (passportSettings.registration.require_password) {
        if (user.password !== user[ passportSettings.registration.matched_password_field ]) {
          return reject(new Error('Passwords do not match'));
        }
        periodic.utilities.auth.encryptPassword({ password: user.password })
          .then(passwordHash => {
            user.password = passwordHash;
            user.name = (user.name) ? user.name : user.username;
            user[ passportSettings.registration.matched_password_field ] = undefined;
            delete user[ passportSettings.registration.matched_password_field ];
            return resolve(user);
          })
          .catch(reject);
      } else { 
        return resolve(user);
      }
    } catch (e) {
      return reject(e);
    }
  });
}

function validate(options) {
  const { user } = options;
  return new Promise((resolve, reject) => {
    try {
      checkUserPassword(options)
        .then(resolve) 
        .catch(reject);
    } catch (e) {
      return reject(e);
    }
  });
}

module.exports = {
  validate,
  checkUserPassword,
};