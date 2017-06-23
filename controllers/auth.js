'use strict';
const periodic = require('periodicjs');

function ensureAuthenticated(req, res, next) {
  periodic.logger.info('require,auth');
  next();
}

module.exports = {
  ensureAuthenticated,
};