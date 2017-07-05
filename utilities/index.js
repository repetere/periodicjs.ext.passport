'use strict';
const periodic = require('periodicjs');
const controller = require('./controller');
const auth = require('./auth');
const token = require('./token');
const account = require('./account');
const periodicRoutingUtil = periodic.utilities.routing;

function getSettings() {
  console.log('periodic.extensions', periodic.extensions);
  console.log('periodic.settings', periodic.settings);
  return periodic.settings.extensions[ 'periodicjs.ext.passport' ];
}


function adminRoute() {
  const auth_route_prefix = getSettings().routing.authenication_route_prefix;
  return periodicRoutingUtil.route_prefix(auth_route_prefix);
}

function getRoutes(use_admin_prefix) {
  const adminURL = (use_admin_prefix) ? adminRoute() : '';
  // console.log('getSettings()', getSettings(),{periodic});
  // console.log('periodic.settings', periodic.settings);
  const passportRoutes = getSettings().routing;
  const generatedRoutes = Object.keys(passportRoutes).reduce((result, key) => { 
    if ([ 'authenication_route_prefix', 'sso', 'oauth', 'userauth', 'activate', 'register', 'complete', 'signin', 'reset', 'forgot','login','logout' ].indexOf(key) === -1) {
      result[ key ] = `${adminURL}${periodicRoutingUtil.route_prefix(passportRoutes[key])}`;
    } else if (key === 'oauth') {
      Object.keys(passportRoutes.oauth).forEach(skey => {
        result[ `${passportRoutes.sso}_${passportRoutes.oauth[ skey ]}` ] = `${adminURL}${periodicRoutingUtil.route_prefix(passportRoutes.sso)}${periodicRoutingUtil.route_prefix(passportRoutes.oauth[ skey ])}`;
      });
    } else if (key === 'userauth') {
      [ 'activate', 'register', 'complete','signin','login','logout','forgot','reset' ].forEach(ukey => {
        result[ `user_auth_${ukey}` ] = `${adminURL}${periodicRoutingUtil.route_prefix(passportRoutes.userauth.user_core_data)}${periodicRoutingUtil.route_prefix(ukey)}`;
        result[ `account_auth_${ukey}` ] = `${adminURL}${periodicRoutingUtil.route_prefix(passportRoutes.userauth.account_core_data)}${periodicRoutingUtil.route_prefix(ukey)}`;
      });
    }
    return result;
  }, {});
  return generatedRoutes;
}

module.exports = {
  passport: require('passport'),
  routes: getRoutes(),
  paths: getRoutes(true),
  getRoutes,
  auth,
  token,
  account,
  adminRoute,
  getSettings,
  controller,
};