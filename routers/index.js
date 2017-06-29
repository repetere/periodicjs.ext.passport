'use strict';

const fs = require('fs-extra');
const path = require('path');
const periodic = require('periodicjs');
const authRouter = require('./auth');
const utilities = require('../utilities');
const passportRouter = periodic.express.Router();
const passportSettings = utilities.getSettings();
const auth_route_prefix = passportSettings.routing.authenication_route_prefix;
const auth_route = periodic.utilities.routing.route_prefix(auth_route_prefix);

passportRouter.use(utilities.passport.initialize());
if (passportSettings.passport.sessions) {
  passportRouter.use(utilities.passport.session());
}
passportRouter.use(auth_route,authRouter);// /auth

module.exports = passportRouter;