'use strict';
const path = require('path');
const hrline = require('../components/hrline');
const entityLink = require('../components/entityLink');

module.exports = (periodic) => {
  let reactapp = periodic.locals.extensions.get('periodicjs.ext.reactapp').reactapp();
  let passport = periodic.locals.extensions.get('periodicjs.ext.passport');
  // console.log({reactapp})
  // console.log('passport.paths', passport.paths);
  // console.log('periodic.extensions.has(periodicjs.ext.reactapp)', periodic.extensions.has('periodicjs.ext.reactapp'));
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
                      title: 'Complete Account Registration',
                      linkSuffix: '_auth_complete',
                    })
                    : null,
                  {
                    'component': 'ResponsiveForm',
                    asyncprops: {
                      formdata:['activation_token_data', 'data', ],
                    },
                    'props': {
                      'cardForm': true,
                    // cardFormTitle:'Sign In',
                      'cardFormProps': {
                        'isFullwidth': true,
                      },
                      onSubmit: {
                        url: passport.paths[`${entitytype}_auth_complete`],
                      // url: `${reactapp.manifest_prefix}auth/forgot`,
                        options: {
                          method: 'POST',
                        },
                        success: {
                          notification: {
                            text: 'Completing account registration',
                            timeout: 4000,
                            type: 'success',
                          },
                        },
                        successCallback: 'func:this.props.reduxRouter.push',
                        successProps:reactapp.settings.auth.logged_in_homepage,
                      },
                      hiddenFields: [
                        {
                          form_name: 'entitytype',
                          form_static_val: entitytype||reactapp.settings.login.options.headers.entitytype,
                        },
                      ],
                      'validations': [
                        {
                          'name': 'activation_token',
                          'constraints': {
                            'activation_token': {
                              'length': {
                                'minimum': 3,
                                'message': '^Your activation token is requires .',
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
                            'label': 'Token',
                            'name': 'activation_token',
                            'submitOnEnter': true,
                          // "passProps": {
                          //   "type": "token"
                          // },
                            'layoutProps': {
                              'horizontalform': true,
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
                              'value': 'Complete Registration',
                            // "placeholder": "Remember Me",
                              'name': 'completeregistration',
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
                                      onClick: 'func:this.props.fetchAction',
                                      fetchProps: {
                                        method: 'POST',
                                        options: {
                                        },
                                        body: JSON.stringify({ entitytype,  }),
                                      },
                                      onclickProps:  passport.paths[ `${entitytype}_auth_activate` ]+'?ra=true',
                                    // onclickProps:`${reactapp.manifest_prefix}auth/login`,
                                      successProps: {
                                        success: {
                                          notification: {
                                            text: 'Resent activation token',
                                            timeout: 4000,
                                            type: 'success',
                                          },
                                        },
                                      },
                                      style: {
                                      },
                                      buttonProps: {
                                      // color: 'isPrimary',
                                      },
                                    },
                                    children: 'Resend activation',
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
        activation_token_data: {
          url: `${passport.paths[ entitytype + '_auth_complete' ]}/get_token_data`,
          options: {
            blocking: true,
            renderOnError: false,
            onError:['func:this.props.reduxRouter.push', ],
          },
        },
      },
      'pageData': {
        'title': `Complete Registration | ${reactapp.settings.name}`,
        'navLabel': 'Complete Registration',
      },
      'onFinish': 'render',
    };
  };
  return {
    containers: (passportSettings.include_manifests) ? {
      [ path.join(reactapp.manifest_prefix, passport.paths[ 'account_auth_complete' ]) ]: getContainerManifest('account'),
      [ path.join(reactapp.manifest_prefix, passport.paths[ 'user_auth_complete' ]) ]: getContainerManifest('user'),
    } : {},
  };
};