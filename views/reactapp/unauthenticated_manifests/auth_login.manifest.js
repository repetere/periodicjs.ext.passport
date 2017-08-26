'use strict';
const path = require('path');
const hrline = require('../components/hrline');
const entityLink = require('../components/entityLink');

module.exports = (periodic) => {
  let reactapp = periodic.locals.extensions.get('periodicjs.ext.reactapp').reactapp();
  let passport = periodic.locals.extensions.get('periodicjs.ext.passport');
  const passportSettings = periodic.settings.extensions[ 'periodicjs.ext.passport' ].reactapp;
  
  const getContainerManifest = (entitytype) => {
    return {
      // [`${reactapp.manifest_prefix}auth/login`]: {
      'layout': {
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
                  entityLink({
                    reactapp,
                    entitytype,
                    passport,
                    title: 'Sign in',
                    linkSuffix: '_auth_login',
                  }),
                  {
                    'component': 'ResponsiveForm',
                    'props': {
                      'cardForm': true,
                      // cardFormTitle:'Sign In',
                      'cardFormProps': {
                        'isFullwidth': true,
                      },
                      'onSubmit': 'func:this.props.loginUser',
                      hiddenFields: [
                        {
                          form_name: '__returnURL',
                          form_static_val: reactapp.settings.auth.logged_in_homepage,
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
                      'formgroups': [{
                        'gridProps': {},
                        'formElements': [{
                          'type': 'text',
                          'label': 'Username',
                          'name': 'username',
                          'layoutProps': {
                            'horizontalform': true,
                          },
                        }, ],
                      },
                      {
                        'gridProps': {},
                        'formElements': [{
                          'type': 'text',
                          'label': 'Password',
                          'name': 'password',
                          'submitOnEnter': true,
                          'passProps': {
                            'type': 'password',
                          },
                          'layoutProps': {
                            'horizontalform': true,
                          },
                        }, ],
                      },
                      {
                        'gridProps': {
                          style: {
                            justifyContent: 'center',
                          },
                        },
                        'formElements': [
                          {
                            type: 'group',
                            label: ' ',
                            'layoutProps': {
                              'horizontalform': true,
                              innerFormItem: true,
                            },
                            groupElements: [
                              {
                                'type': 'checkbox',
                                // "label": "a",
                                'placeholder': 'Remember Me',
                                'name': 'rememberme',
                                'passProps': {
                                  'type': 'rememberme',
                                },
                                'layoutProps': {
                                  'horizontalform': true,
                                },
                              },
                              {
                                'type': 'layout',
                                value: {
                                  component: 'ResponsiveLink',
                                  props: {
                                    location: path.join(reactapp.manifest_prefix, passport.paths[ `${entitytype}_auth_forgot` ]),
                                  },
                                  children: 'Forgot Password',
                                },
                              },
                                    
                            ],
                          },
                                
                        ],
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
                            'value': 'Login',
                            // "placeholder": "Remember Me",
                            'name': 'login',
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
                                    onclickProps: path.join(reactapp.manifest_prefix, passport.paths[ `${entitytype}_auth_register` ]),
                                    style: {
                                    },
                                    buttonProps: {
                                      // color: 'isPrimary',
                                    },
                                  },
                                  children: 'New User',
                                },
                              ],
                                    
                            },
                            'layoutProps': {
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
        'title': `Login | ${reactapp.settings.name}`,
        'navLabel': 'Login',
      },
      'onFinish': 'render',
    };
  };
  return {
    containers: (passportSettings.include_manifests) ? {
      [ path.join(reactapp.manifest_prefix, passport.paths[ 'account_auth_login' ]) ]: getContainerManifest('account'),
      [ path.join(reactapp.manifest_prefix, passport.paths[ 'user_auth_login' ]) ]: getContainerManifest('user'),
    } : {},
  };
};