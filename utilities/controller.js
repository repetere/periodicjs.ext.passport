'use strict';
const periodic = require('periodicjs');

module.exports = {
  jsonReq: (req) => {
    return req.is('json') || req.query.format === 'json';
  },
  setReturnUrl: (req) => {
    req.session.return_url = (req.query && req.query.return_url) ? req.query.return_url : req.originalUrl;
    return req;
  },
};