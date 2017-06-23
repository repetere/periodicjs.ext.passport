'use strict';

const periodic = require('periodicjs');
const csrf = require('csurf');
const controllers = require('../controllers');
const authRouter = periodic.express.Router();

authRouter.get('/', controllers.auth.ensureAuthenticated, (req, res) => { res.send('login page') });
// authRouter.use(periodic.core.cache.disableCache);

module.exports = authRouter;