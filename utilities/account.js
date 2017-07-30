'use strict';
const path = require('path');
const periodic = require('periodicjs');
const moment = require('moment');
const utilAuth = require('./auth');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const complexity = require('complexity');
const passportSettings = periodic.settings.extensions['periodicjs.ext.passport'];

function checkUserPassword(options) {
  const { user } = options;
  return new Promise((resolve, reject) => {
    try {
      if (passportSettings.registration.require_password) {
        if (user.password !== user[passportSettings.registration.matched_password_field]) {
          return reject(new Error('Passwords do not match'));
        } else if (passportSettings.registration.use_complexity && user.password && !complexity.check(user.password, passportSettings.registration.complexity_settings[passportSettings.registration.use_complexity_setting])) {
          console.log(complexity.check(user.password, passportSettings.registration.complexity_settings[passportSettings.registration.use_complexity_setting]));
          return new Error('Password does not meet complexity requirements');
        } else {
          periodic.utilities.auth.encryptPassword({ password: user.password })
            .then(passwordHash => {
              user.password = passwordHash;
              user.name = (user.name) ? user.name : user.username;
              user[passportSettings.registration.matched_password_field] = undefined;
              delete user[passportSettings.registration.matched_password_field];
              return resolve(user);
            })
            .catch(reject);
        }
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

function resetPasswordNotification(options) {
  return new Promise((resolve, reject) => {
    try {
      const passportLocals = periodic.locals.extensions.get('periodicjs.ext.passport');
      const { user } = options;
      user.password = '******';
      user.apikey = '******';
      const resetPasswordEmail = {
        from: periodic.settings.periodic.emails.server_from_address,
        to: user.email,
        bcc: periodic.settings.periodic.emails.notification_address,
        subject: passportSettings.email_subjects.reset_notification || `${periodic.settings.name} - Password reset notification ${(periodic.settings.application.environment!=='production')?'['+periodic.settings.application.environment+']':''}`,
        generateTextFromHTML: true,
        emailtemplatefilepath: path.resolve(periodic.config.app_root, passportSettings.emails.reset_notification),
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
      return resolve(periodic.core.mailer.sendEmail(resetPasswordEmail));
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

function invalidateToken(options) {
  return new Promise((resolve, reject) => {
    try {
      const { user, } = options;
      const passportAttributes = {
        reset_token: '',
        reset_token_link: '',
        reset_token_expires_millis: 0,
      };
      const coreDataModel = utilAuth.getAuthCoreDataModel(user);

      user.extensionattributes = Object.assign({}, user.extensionattributes);
      user.extensionattributes.passport = Object.assign({}, user.extensionattributes.passport, passportAttributes);
      resolve(user);
      // coreDataModel.update({
      //     updatedoc: user,
      //     depopulate: false,
      //   })
      //   .then(resolve)
      //   .catch(reject);
    } catch (e) {
      reject(e);
    }
  });
};

function hasExpired(token_expires_millis) {
  const now = new Date();
  const diff = (now.getTime() - token_expires_millis);
  return diff > 0;
};

function getToken(options) {
  const { req, entitytype, token, } = options;
  return new Promise((resolve, reject) => {
    try {
      const coreDataModel = utilAuth.getAuthCoreDataModel({ entitytype });
      let updatedUserAccount = {};
      coreDataModel.load({ query: { 'extensionattributes.passport.reset_token_link': token, }, })
        .then(user => {
          if (!user) {
            throw new Error('Invalid token');
          }
          updatedUserAccount = user;
          if (hasExpired(user.extensionattributes.passport.reset_token_expires_millis)) {
            throw new Error('Password reset token has expired');
          } else {
            resolve({
              reset_token: user.extensionattributes.passport.reset_token,
              user,
            });
          }
        })
        .catch(reject);
    } catch (e) {
      reject(e);
    }
  });
}

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
          if (sendEmail) {
            return emailForgotPasswordLink({ user: updatedUserAccount });
          } else {
            return true;
          }
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

function resetPassword(options) {
  const { req, user, entitytype, sendEmail } = options;
  return new Promise((resolve, reject) => {
    try {
      const coreDataModel = utilAuth.getAuthCoreDataModel({ entitytype });
      let updatedUserAccount = {};
      invalidateToken({ user })
        .then(updatedUser => {
          updatedUser.password = req.body.password;
          updatedUser[passportSettings.registration.matched_password_field] = req.body[passportSettings.registration.matched_password_field];
          updatedUserAccount = updatedUser;
          return validate({ user: updatedUser });
        })
        .then(validatedUser => {
          updatedUserAccount = validatedUser;
          coreDataModel.update({
              updatedoc: validatedUser,
              depopulate: false,
            })
            .then(changedPWUser => {
              return changedPWUser;
            })
            .catch(reject);
        })
        .then(updatedUser => {
          if (sendEmail) {
            return resetPasswordNotification({ user: updatedUserAccount });
          } else {
            return true;
          }
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
  getToken,
  checkUserPassword,
  resetPassword,
  forgotPassword,
  hasExpired,
};