'use strict';
const periodic = require('periodicjs');

module.exports = {
  jsonReq: (req) => {
    return req.is('json') || req.query.format === 'json';
  },
  setReturnUrl: (req) => {
    if (req.orginalUrl && req.session) {
      req.session.return_url = req.originalUrl;
    }
    return req;
  },
};