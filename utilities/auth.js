'use strict';
const periodic = require('periodicjs');
const passportSettings = periodic.settings.extensions['periodicjs.ext.passport'];

function getAuthCoreDataModel(authUser) {
  return (authUser.entitytype === 'account') ?
    periodic.datas(passportSettings.data.account_core_data) :
    periodic.datas(passportSettings.data.user_core_data);
}

function serialize(user, done) {
  done(null, {
    entitytype: user.entitytype,
    _id: user._id,
  });
}

function deserialize(userFromSession, done) {
  const coreDataModel = getAuthCoreDataModel(userFromSession);

  coreDataModel.load({
      query: {
        entitytype: userFromSession.entitytype,
        _id: userFromSession._id,
      },
    })
    .then(user => {
      done(null, user);
    })
    .catch(err => {
      done(err, false);
    });
}

function localLoginVerifyCallback(req, username, password, done) {
  const userRequest = Object.assign({}, req.body, req.query, req.controllerData);
  const coreDataModel = getAuthCoreDataModel(userRequest);

  coreDataModel.load({
      query: {
        username: username,
      },
    })
    .then(user => {
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      } else if (!user.validPassword(password)) {
        return done(null, false, { message: 'Incorrect password.' });
      } else {
        return done(null, user);
      }
    })
    .catch(err => {
      return done(err);
    });
}

module.exports = {
  serialize,
  deserialize,
  localLoginVerifyCallback,
};