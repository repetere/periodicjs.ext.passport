'use strict';
const path = require('path');
const hrline = require('../components/hrline');
const entityLink = require('../components/entityLink');

module.exports = (periodic) => {
  let reactapp = periodic.locals.extensions.get('periodicjs.ext.reactapp').reactapp();
  let passport = periodic.locals.extensions.get('periodicjs.ext.passport');
  // console.log({reactapp})
  const passportSettings = periodic.settings.extensions[ 'periodicjs.ext.passport' ].reactapp;
  const getContainerManifest = (entitytype) => {
    return {
      // [`${reactapp.manifest_prefix}auth/forgot`]: {
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
                  (passportSettings.include_core_data_entity_options)
                  ? entityLink({
                    reactapp,
                    entitytype,
                    passport,
                    title: 'Recover Password',
                    linkSuffix: '_auth_forgot',
                  })
                  : null,
                  {
                    'component': 'ResponsiveForm',
                    'props': {
                      'cardForm': true,
                    // cardFormTitle:'Sign In',
                      'cardFormProps': {
                        'isFullwidth': true,
                      },
                      onSubmit: {
                        url: passport.paths[`${entitytype}_auth_forgot`]+'?ra=true',
                      // url: `${reactapp.manifest_prefix}auth/forgot`,
                        options: {
                          method: 'POST',
                        },
                        success: {
                          notification: {
                            text: 'Password reset instructions were sent to your email address',
                            timeout: 4000,
                            type: 'success',
                          },
                        },
                      },
                      hiddenFields: [
                        {
                          form_name: 'entitytype',
                          form_static_val: entitytype||reactapp.settings.login.options.headers.entitytype,
                        },
                      ],
                      'validations': [
                        {
                          'name': 'email',
                          'constraints': {
                            'email': {
                              presence: {
                                message: '^Your email is required.',
                              },
                              'length': {
                                'minimum': 3,
                                'message': '^Your email is required.',
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
                            'submitOnEnter': true,
                            'passProps': {
                              'type': 'email',
                            },
                            'layoutProps': {
                              'horizontalform': true,
                            },
                          },],
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
                              'value': 'Recover Password',
                            // "placeholder": "Remember Me",
                              'name': 'recoverpassword',
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
                                    // onclickProps:`${reactapp.manifest_prefix}auth/login`,
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
            },],
          },],
        },],
      },
      'resources': {
        // oauth2data: `${reactapp.manifest_prefix}api/oauth2async/signin?format=json`,
      },
      'pageData': {
        'title': `Forgot Password | ${reactapp.settings.name}`,
        'navLabel': 'Forgot Password',
      },
      'onFinish': 'render',
    };
  };
  return {
    containers: (passportSettings.include_manifests) ? {
      [ path.join(reactapp.manifest_prefix, passport.paths[ 'account_auth_forgot' ]) ]: getContainerManifest('account'),
      [ path.join(reactapp.manifest_prefix, passport.paths[ 'user_auth_forgot' ]) ]: getContainerManifest('user'),
    } : {},
  };
};