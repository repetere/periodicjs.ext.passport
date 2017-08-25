'use strict';
const path = require('path');
const periodic = require('periodicjs');
const moment = require('moment');
const utilAuth = require('./auth');
const utilToken = require('./token');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const complexity = require('complexity');
const passportSettings = periodic.settings.extensions['periodicjs.ext.passport'];

function checkUserPassword(options) {
  const { user, } = options;
  return new Promise((resolve, reject) => {
    try {
      if (passportSettings.registration.require_password) {
        if (user.password !== user[passportSettings.registration.matched_password_field]) {
          return reject(new Error('Passwords do not match'));
        } else if (passportSettings.registration.use_complexity && user.password && !complexity.check(user.password, passportSettings.registration.complexity_settings[passportSettings.registration.use_complexity_setting])) {
          const complexityErrors = complexity.checkError(user.password, passportSettings.registration.complexity_settings[passportSettings.registration.use_complexity_setting]);
          const complexityErrArray = Object.keys(complexityErrors).filter(complexError => complexityErrors[complexError] === false);
          return reject(new Error(`Password does not meet complexity requirements (missing: ${complexityErrArray.toString()})`));
        } else {
          periodic.utilities.auth.encryptPassword({ password: user.password, })
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
  const { user, } = options;
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

function getEmailPaths(options) {
  const passportLocals = periodic.locals.extensions.get('periodicjs.ext.passport');  
  const { user, ra, routeSuffix } = options; //routeSuffix='_auth_complete'
  const emailUser = Object.assign({}, (typeof user.toJSON === 'function') ? user.toJSON() : user);
  emailUser.password = '******';
  emailUser.apikey = '******';
  let manifestPrefix = '';
  if (periodic.extensions.has('periodicjs.ext.reactapp')) {
    let reactapp = periodic.locals.extensions.get('periodicjs.ext.reactapp').reactapp();
    manifestPrefix = reactapp.manifest_prefix;
  }
  const basepath = (ra) ?
  path.join(manifestPrefix, passportLocals.paths[ `${emailUser.entitytype}${routeSuffix}` ])       
    : passportLocals.paths[ `${emailUser.entitytype}${routeSuffix}` ];
  
  return {
    emailUser,
    basepath,
    url: periodic.settings.application.url,
  };
}

function emailForgotPasswordLink(options) {
  return new Promise((resolve, reject) => {
    try {
      const { user, ra } = options;
      const { emailUser, basepath, url, } = getEmailPaths(Object.assign({routeSuffix:'_auth_reset'}, options));
      const forgotEmail = {
        from: periodic.settings.periodic.emails.server_from_address,
        to: emailUser.email,
        bcc: periodic.settings.periodic.emails.notification_address,
        subject: passportSettings.email_subjects.forgot || `${periodic.settings.name} - Reset your password ${(periodic.settings.application.environment!=='production')?'['+periodic.settings.application.environment+']':''}`,
        generateTextFromHTML: true,
        emailtemplatefilepath: path.resolve(periodic.config.app_root, passportSettings.emails.forgot),
        emailtemplatedata: {
          appname: periodic.settings.name,
          hostname: periodic.settings.application.hostname || periodic.settings.name,
          basepath,
          url,
          protocol: periodic.settings.application.protocol,
          user:emailUser,
          // update_message: 'welcome', 
        },
      };
      return resolve(periodic.core.mailer.sendEmail(forgotEmail));
    } catch (e) {
      reject(e);
    }
  });
}

function resetPasswordNotification(options) {
  return new Promise((resolve, reject) => {
    try {
      const { user, ra } = options;
      const { emailUser, basepath, url, } = getEmailPaths(Object.assign({routeSuffix:'_auth_reset'}, options));
      const resetPasswordEmail = {
        from: periodic.settings.periodic.emails.server_from_address,
        to: emailUser.email,
        bcc: periodic.settings.periodic.emails.notification_address,
        subject: passportSettings.email_subjects.reset_notification || `${periodic.settings.name} - Password reset notification ${(periodic.settings.application.environment!=='production')?'['+periodic.settings.application.environment+']':''}`,
        generateTextFromHTML: true,
        emailtemplatefilepath: path.resolve(periodic.config.app_root, passportSettings.emails.reset_notification),
        emailtemplatedata: {
          appname: periodic.settings.name,
          hostname: periodic.settings.application.hostname || periodic.settings.name,
          basepath,
          url,
          protocol: periodic.settings.application.protocol,
          user: emailUser,
          // update_message: 'welcome', 
        },
      };
      return resolve(periodic.core.mailer.sendEmail(resetPasswordEmail));
    } catch (e) {
      reject(e);
    }
  });
}

function accountUpdateNotification(options) {
  return new Promise((resolve, reject) => {
    try {
      const passportLocals = periodic.locals.extensions.get('periodicjs.ext.passport');
      const { user, } = options;
      const emailUser = Object.assign({}, (typeof user.toJSON==='function')?user.toJSON(): user);

      emailUser.password = '******';
      emailUser.apikey = '******';
      const resetPasswordEmail = {
        from: periodic.settings.periodic.emails.server_from_address,
        to: emailUser.email,
        bcc: periodic.settings.periodic.emails.notification_address,
        subject: passportSettings.email_subjects.account_update || `${periodic.settings.name} - Account update notification ${(periodic.settings.application.environment!=='production')?'['+periodic.settings.application.environment+']':''}`,
        generateTextFromHTML: true,
        emailtemplatefilepath: path.resolve(periodic.config.app_root, passportSettings.emails.account_update),
        emailtemplatedata: {
          appname: periodic.settings.name,
          hostname: periodic.settings.application.hostname || periodic.settings.name,
          basepath: passportLocals.paths[`${emailUser.entitytype}_auth_reset`],
          url: periodic.settings.application.url,
          protocol: periodic.settings.application.protocol,
          user:emailUser,
          // update_message: 'welcome', 
        },
      };
      return resolve(periodic.core.mailer.sendEmail(resetPasswordEmail));
    } catch (e) {
      reject(e);
    }
  });
}

function emailWelcomeMessage(options) {
  return new Promise((resolve, reject) => {
    try {
      const { user, ra } = options;
      const { emailUser, basepath, url, } = getEmailPaths(Object.assign({routeSuffix:'_auth_complete'}, options));
      const welcomeEmail = {
        from: periodic.settings.periodic.emails.server_from_address,
        to: emailUser.email,
        bcc: periodic.settings.periodic.emails.notification_address,
        subject: passportSettings.email_subjects.welcome || `Welcome to ${periodic.settings.name}${(periodic.settings.application.environment !== 'production') ? ' [' + periodic.settings.application.environment + ']' : ''}`,
        generateTextFromHTML: true,
        emailtemplatefilepath: path.resolve(periodic.config.app_root, passportSettings.emails.welcome),
        emailtemplatedata: {
          appname: periodic.settings.name,
          hostname: periodic.settings.application.hostname || periodic.settings.name,
          basepath,
          url,
          protocol: periodic.settings.application.protocol,
          user: emailUser,
          // update_message: 'welcome', 
        },
      };
      return resolve(periodic.core.mailer.sendEmail(welcomeEmail));
    } catch (e) {
      reject(e);
    }
  });
}

function encode(data) {
  return jwt.sign(data, passportSettings.forgot.token.secret);
}

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
}

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
}

function hasExpired(token_expires_millis) {
  const now = new Date();
  const diff = (now.getTime() - token_expires_millis);
  return diff > 0;
}

function getToken(options) {
  const { req, entitytype, token, } = options;
  return new Promise((resolve, reject) => {
    try {
      const coreDataModel = utilAuth.getAuthCoreDataModel({ entitytype, });
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

function checkActivationToken(options) {
  const { req, user, entitytype, token, } = options;
  return new Promise((resolve, reject) => {
    try {
      const coreDataModel = utilAuth.getAuthCoreDataModel({ entitytype, });
      let updatedUserAccount = {};
      if (!token) {
        if (!user) {
          throw new Error('Missing token and user');
        } else {
          user.extensionattributes = Object.assign({}, user.extensionattributes);
          user.extensionattributes.passport = Object.assign({}, user.extensionattributes.passport);
          user.extensionattributes.passport.reset_activation_expires_millis = undefined;
          user.extensionattributes.passport.user_activation_token_link = undefined;
          user.extensionattributes.passport.user_activation_token = undefined;
          resolve((typeof user.toJSON === 'function') ? user.toJSON() : user);
        }
      } else {
        coreDataModel.load({ query: { 'extensionattributes.passport.user_activation_token_link': token, }, })
          .then(DBuser => {
            if (!DBuser) {
              throw new Error('Invalid token');
            }
            updatedUserAccount = user;
            if (hasExpired(DBuser.extensionattributes.passport.reset_activation_expires_millis)) {
              throw new Error('Activation token has expired');
            } else {
              DBuser = (typeof DBuser.toJSON === 'function') ? DBuser.toJSON() : DBuser;
              DBuser.activated = true;
              DBuser.extensionattributes = Object.assign({}, DBuser.extensionattributes);
              DBuser.extensionattributes.passport = Object.assign({}, DBuser.extensionattributes.passport);
              DBuser.extensionattributes.passport.reset_activation_expires_millis = undefined;
              DBuser.extensionattributes.passport.user_activation_token_link = undefined;
              DBuser.extensionattributes.passport.user_activation_token = undefined;
              resolve(DBuser);
            }
          })
          .catch(reject);
      }
    } catch (e) {
      reject(e);
    }
  });
}



function forgotPassword(options) {
  const { req, entitytype, email, sendEmail, ra } = options;
  return new Promise((resolve, reject) => {
    try {
      const coreDataModel = utilAuth.getAuthCoreDataModel({ entitytype, });
      let updatedUserAccount = {};
      coreDataModel.load({ query: { email, }, })
        .then(user => {
          updatedUserAccount = user;
          // console.log({ user });
          return generateToken({ user, });
        })
        .then(updatedUser => {
          // console.log({ updatedUser });
          if (sendEmail) {
            return emailForgotPasswordLink({ user: updatedUserAccount, ra });
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
  const { req, user, entitytype, sendEmail, ra, } = options;
  return new Promise((resolve, reject) => {
    try {
      const coreDataModel = utilAuth.getAuthCoreDataModel({ entitytype, });
      let updatedUserAccount = {};
      invalidateToken({ user, })
        .then(updatedUser => {
          updatedUser.password = req.body.password;
          updatedUser[passportSettings.registration.matched_password_field] = req.body[passportSettings.registration.matched_password_field];
          updatedUserAccount = updatedUser;
          return validate({ user: updatedUser, });
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
            return resetPasswordNotification({ user: updatedUserAccount, ra, });
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

function completeRegistration(options) {
  const { req, user, entitytype, sendEmail, } = options;
  return new Promise((resolve, reject) => {
    try {
      const coreDataModel = utilAuth.getAuthCoreDataModel({ entitytype, });
      let updatedUserAccount = {};
      checkActivationToken({ req, user, entitytype, token: req.body.activation_token, })
        .then(updatedUser => {
          if (req.body.password) {
            updatedUser.password = req.body.password;
            updatedUser[passportSettings.registration.matched_password_field] = req.body[passportSettings.registration.matched_password_field];
            updatedUserAccount = updatedUser;
            return validate({ user: updatedUser, });
          } else {
            return updatedUser;
          }
        })
        .then(validatedUser => {
          const updatedUserData = Object.assign({}, req.body);
          delete updatedUserData._csrf;
          delete updatedUserData.entitytype;
          delete updatedUserData.userroles;
          delete updatedUserData.accounttype;
          delete updatedUserData.activation_token;
          // console.log({ updatedUserData });

          updatedUserAccount = Object.assign({}, validatedUser, updatedUserData);
          // console.log({ updatedUserAccount });
          coreDataModel.update({
              updatedoc: updatedUserAccount,
              depopulate: false,
            })
            .then(changedPWUser => {
              return changedPWUser;
            })
            .catch(reject);
        })
        .then(updatedUser => {
          if (sendEmail) {
            return accountUpdateNotification({ user: updatedUserAccount, });
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

function resendActivation(options) {
  const { user, entitytype = 'user', sendEmail, ra, } = options;
  const coreDataModel = utilAuth.getAuthCoreDataModel(user);
  let dbUpdatedUser = {};
  return new Promise((resolve, reject) => {
    try {
      utilToken.generateUserActivationData({ user, })
        .then(activationUser => {
          dbUpdatedUser = activationUser;
          return coreDataModel.update({
            updatedoc: activationUser,
            depopulate: false,
          });
        })
        .then(updatedUser => {
          // console.log({ updatedUser });
          if (sendEmail) {
            return emailWelcomeMessage({ user: dbUpdatedUser, ra, });
          } else {
            return true;
          }
        })
        .then(emailStatus => {
          resolve(dbUpdatedUser);
        })
        .catch(reject);
    } catch (e) {
      reject(e);
    }
  });
}

function fastRegister(options) {
  const { user, entitytype = 'user', sendEmail, ra } = options;
  const coreDataModel = utilAuth.getAuthCoreDataModel({ entitytype, });

  return new Promise((resolve, reject) => {
    try {
      let dbCreatedUser = {};
      validate({ user, })
        .then(validatedUser => {
          return utilToken.generateUserActivationData({ user: validatedUser, });
        })
        .then(activationUser => {
          return coreDataModel.create({
            newdoc: activationUser,
          });
        })
        .then(createdUser => {
          dbCreatedUser = createdUser;

          if (sendEmail) {
            return emailWelcomeMessage({ user: createdUser, ra});
          } else {
            return true;
          }
        })
        .then(emailStatus => {
          resolve(dbCreatedUser);
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
  completeRegistration,
  resetPassword,
  forgotPassword,
  hasExpired,
  resendActivation,
  fastRegister,
  getEmailPaths,
};