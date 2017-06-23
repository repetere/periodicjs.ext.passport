'use strict';
const periodic = require('periodicjs');

module.exports = {
  passport: require('passport'),
  getSettings: () => {
    return periodic.settings.extensions[ 'periodicjs.ext.passport' ];
  },
};