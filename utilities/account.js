'use strict';
const path = require('path');
const periodic = require('periodicjs');
const moment = require('moment');
const utilAuth = require('./auth');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const passportSettings = periodic.settings.extensions['periodicjs.ext.passport'];

function checkUserPassword(options) {
  const { user } = options;
  return new Promise((resolve, reject) => {
    try {
      if (passportSettings.registration.require_password) {
        if (user.password !== user[passportSettings.registration.matched_password_field]) {
          return reject(new Error('Passwords do not match'));
        }
        periodic.utilities.auth.encryptPassword({ password: user.password })
          .then(passwordHash => {
            user.password = passwordHash;
            user.name = (user.name) ? user.name : user.username;
            user[passportSettings.registration.matched_password_field] = undefined;
            delete user[passportSettings.registration.matched_password_field];
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

function emailForgotPasswordLink(options) {
  return new Promise((resolve, reject) => {
    try {
      const passportLocals = periodic.locals.extensions.get('periodicjs.ext.passport');
      const { user } = options;
      user.password = '******';
      user.apikey = '******';
      console.log({ user, passportSettings });
      const forgotEmail = {
        from: periodic.settings.periodic.emails.server_from_address,
        to: user.email,
        bcc: periodic.settings.periodic.emails.notification_address,
        subject: passportSettings.email_subjects.forgot || `${periodic.settings.name} - Reset your password ${(periodic.settings.application.environment!=='production')?'['+periodic.settings.application.environment+']':''}`,
        generateTextFromHTML: true,
        emailtemplatefilepath: path.resolve(periodic.config.app_root, passportSettings.emails.forgot),
        emailtemplatedata: {
          appname: periodic.settings.name,
          hostname: periodic.settings.application.hostname || periodic.settings.name,
          basepath: passportLocals.paths[`${user.entitytype}_auth_reset`],
          url: periodic.settings.application.url,
          protocol: periodic.settings.application.protocol,
          user,
          // update_message: 'welcome', 
        }
      };
      return resolve(periodic.core.mailer.sendEmail(forgotEmail));
    } catch (e) {
      reject(e);
    }
  });
};

function encode(data) {
  return jwt.sign(data, passportSettings.forgot.token.secret);
};

function generateToken(options) {
  return new Promise((resolve, reject) => {
    try {
      const { user, } = options;
      //Generate reset token and URL link; also, create expiry for reset token
      //make sure attributes exists || create it via merge
      const salt = bcrypt.genSaltSync(10);
      const now = new Date();
      const expires = new Date(now.getTime() + (passportSettings.forgot.token.reset_token_expires_minutes * 60 * 1000)).getTime();
      const reset_token = encode({
        email: user.email,
        apikey: user.apikey,
      });
      const reset_token_link = periodic.core.utilities.makeNiceName(bcrypt.hashSync(reset_token, salt));
      const reset_token_expires_millis = expires;
      const passportAttributes = {
        reset_token,
        reset_token_link,
        reset_token_expires_millis,
      };
      const coreDataModel = utilAuth.getAuthCoreDataModel(user);

      user.extensionattributes = Object.assign({}, user.extensionattributes);
      user.extensionattributes.passport = Object.assign({}, user.extensionattributes.passport, passportAttributes);
      coreDataModel.update({
          updatedoc: user,
          depopulate: false,
        })
        .then(resolve)
        .catch(reject);
    } catch (e) {
      reject(e);
    }
  });
};

function forgotPassword(options) {
  const { req, entitytype, email, sendEmail } = options;
  return new Promise((resolve, reject) => {
    try {
      const coreDataModel = utilAuth.getAuthCoreDataModel({ entitytype });
      let updatedUserAccount = {};
      coreDataModel.load({ query: { email, }, })
        .then(user => {
          updatedUserAccount = user;
          // console.log({ user });
          return generateToken({ user });
        })
        .then(updatedUser => {
          // console.log({ updatedUser });
          return emailForgotPasswordLink({ user: updatedUserAccount });
        })
        .then(emailStatus => {
          resolve({
            email: emailStatus,
            user: updatedUserAccount,
          });
        })
        .catch(reject);
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  validate,
  checkUserPassword,
  forgotPassword,
};