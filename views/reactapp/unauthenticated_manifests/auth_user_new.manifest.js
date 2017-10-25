'use strict';
const path = require('path');
const hrline = require('../components/hrline');
const entityLink = require('../components/entityLink');

module.exports = (periodic) => {
  let reactapp = periodic.locals.extensions.get('periodicjs.ext.reactapp').reactapp();
  let passport = periodic.locals.extensions.get('periodicjs.ext.passport');
  // console.log({reactapp})
  // console.log('passport.paths', passport.paths);
  // console.log('`${reactapp.manifest_prefix}api/oauth2async/signin?format=json`',
  const passportSettings = periodic.settings.extensions[ 'periodicjs.ext.passport' ].reactapp;
  
  const getContainerManifest = (entitytype) => {
    return {
      layout: {
        'component': 'Hero',
        'props': {
          'size': 'isFullheight',
        },
        'children': [{
          'component': 'HeroBody',
          'props': {},
          'children': [{
            'component': 'Container',
            'props': {},
            'children': [{
              'component': 'Columns',
              'children': [{
                'component': 'Column',
                'props': {
                  'size': 'is3',
                },
              },
              {
                'component': 'Column',
                'props': {},
                'children': [
                  (passportSettings.include_core_data_entity_options)
                  ? entityLink({
                    reactapp,
                    entitytype,
                    passport,
                    title: 'Register',
                    linkSuffix: '_auth_register',
                  })
                  : null,
                  {
                    'component': 'ResponsiveForm',
                    'props': {
                      'cardForm': true,
                      // cardFormTitle:'Register',
                      // cardFormTitle:'Register',
                      'cardFormProps': {
                        'isFullwidth': true,
                      },
                      onSubmit: {
                        url: passport.paths[ `${entitytype}_auth_register` ]+'?ra=true',
                        options: {
                          method: 'POST',
                        },
                        successCallback: 'func:this.props.loginUser',
                      },
                      hiddenFields: [
                        {
                          form_name: '__returnURL',
                          form_static_val: reactapp.settings.auth.logged_in_homepage,
                        },
                        {
                          form_name: 'entitytype',
                          form_static_val: entitytype||reactapp.settings.login.options.headers.entitytype,
                        },
                      ],
                      'validations': [
                        {
                          'name': 'username',
                          'constraints': {
                            'username': {
                              presence: {
                                message: '^Your username is required.',
                              },
                              'length': {
                                'minimum': 3,
                                'message': '^Your username is required.',
                              },
                            },
                          },
                        },
                        {
                          'name': 'password',
                          'constraints': {
                            'password': {
                              presence: {
                                message: '^Your username is required',
                              },
                              'length': {
                                'minimum': 8,
                                'message': '^Your password is too short',
                              },
                            },
                          },
                        },
                      ],
                      'formgroups': [
                        {
                          'gridProps': {},
                          'formElements': [{
                            'type': 'text',
                            'label': 'Email',
                            'name': 'email',
                            'layoutProps': {
                              // "horizontalform": true
                            },
                          }, ],
                        },
                        {
                          'gridProps': {},
                          'formElements': [{
                            'type': 'text',
                            'label': 'Username',
                            'name': 'username',
                            'layoutProps': {
                              // "horizontalform": true
                            },
                          }, ],
                        },
                        {
                          'gridProps': {},
                          'formElements': [{
                            'type': 'text',
                            'label': 'Password',
                            'name': 'password',
                            // "submitOnEnter": true,
                            'passProps': {
                              'type': 'password',
                            },
                            'layoutProps': {
                              // "horizontalform": true
                            },
                          }, ],
                        },
                        {
                          'gridProps': {},
                          'formElements': [{
                            'type': 'text',
                            'label': 'Confirm password',
                            'name': 'confirmpassword',
                            'submitOnEnter': true,
                            'passProps': {
                              'type': 'password',
                            },
                            'layoutProps': {
                              // "horizontalform": true
                            },
                          }, ],
                        },
                        hrline,
                        {
                          'gridProps': {
                            style: {
                              justifyContent: 'center',
                            },
                          },
                          'formElements': [
                            {
                              'type': 'submit',
                              'value': 'Register',
                              // "placeholder": "Remember Me",
                              'name': 'register',
                              'passProps': {
                                'color': 'isPrimary',
                              },
                              'layoutProps': {
                                formItemStyle: {
                                  justifyContent: 'center',
                                },
                                'horizontalform': true,
                              },
                            },
                            {
                              'type': 'layout',
                              value: {
                                component: 'FormHorizontal',
                                props: {
                                  style: {
                                    justifyContent: 'center',
                                  },
                                },
                                children: [
                                  {
                                    component: 'ResponsiveButton',
                                    props: {
                                      onClick: 'func:this.props.reduxRouter.push',
                                      onclickProps: path.join(reactapp.manifest_prefix, passport.paths[ `${entitytype}_auth_login` ]),
                                      style: {
                                      },
                                      buttonProps: {
                                        // color: 'isPrimary',
                                      },
                                    },
                                    children: 'Login',
                                  },
                                ],
                              
                              },
                              'layoutProps': {
                                formItemStyle: {
                                  justifyContent: 'center',
                                },
                                style: {
                                  justifyContent: 'center',
                                },
                                // "horizontalform": true
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
              {
                'component': 'Column',
                'props': {
                  'size': 'is3',
                },
              },
              ],
            }, ],
          }, ],
        }, ],
      },
      'resources': {
        // oauth2data: `${reactapp.manifest_prefix}api/oauth2async/signin?format=json`,
      },
      'pageData': {
        'title': `Register | ${reactapp.settings.name}`,
        'navLabel': 'Register',
      },
      'onFinish': 'render',
    };
  };
    
  return {
    containers: (passportSettings.include_manifests) ? {
      [ path.join(reactapp.manifest_prefix, passport.paths[ 'account_auth_register' ]) ]: getContainerManifest('account'),
      [ path.join(reactapp.manifest_prefix, passport.paths[ 'user_auth_register' ]) ]: getContainerManifest('user'),
    } : {},
  };
};