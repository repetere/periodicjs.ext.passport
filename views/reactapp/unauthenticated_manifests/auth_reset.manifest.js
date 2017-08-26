'use strict';
const path = require('path');
const hrline = require('../components/hrline');
const entityLink = require('../components/entityLink');

module.exports = (periodic) => {
  let reactapp = periodic.locals.extensions.get('periodicjs.ext.reactapp').reactapp();
  let passport = periodic.locals.extensions.get('periodicjs.ext.passport');
  const passportSettings = periodic.settings.extensions[ 'periodicjs.ext.passport' ].reactapp;
  // `${reactapp.manifest_prefix}api/oauth2async/signin?format=json`);
  // console.log('reactapp.manifest_prefix', reactapp.manifest_prefix);
  const getContainerManifest = (entitytype) => {
    return {
      // [`${reactapp.manifest_prefix}auth/reset/:token`]: {
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
                    title: 'Reset password',
                    linkSuffix: '_auth_reset',
                  }),
                  {
                    'component': 'ResponsiveForm',
                    asyncprops: {
                      formdata: ['tokendata', 'data',],
                    },
                    'props': {
                      flattenFormData:true,
                      'cardForm': true,
                      // cardFormTitle:'Register',
                      'cardFormProps': {
                        'isFullwidth': true,
                      },
                      onSubmit: {
                        url: passport.paths[`${entitytype}_auth_reset`]+'/:token',
                        params: [
                          {
                            key: ':token',
                            val: 'token',
                          },
                        ],
                        options: {
                          method: 'POST',
                        },
                        success: {
                          notification: {
                            text: 'Password reset successfully',
                            timeout: 4000,
                            type: 'success',
                          },
                        },
                        // successCallback: 'func:this.props.reduxRouter.push',
                        // successProps: reactapp.settings.auth.logged_in_homepage
                      },
                      hiddenFields: [
                        {
                          form_name: 'token',
                          form_val: 'token',
                        },
                        {
                          form_name: 'entitytype',
                          form_static_val: entitytype||reactapp.settings.login.options.headers.entitytype,
                        },
                      ],
                      'validations': [
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
                            'name': 'user.email',
                            disabled: true,
                            // "submitOnEnter": true,
                            'passProps': {
                              'type': 'email',
                              state: 'isDisabled',
                            },
                            'layoutProps': {
                              // "horizontalform": true
                            },
                          },],
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
                          },],
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
                              'value': 'Reset',
                              // "placeholder": "Remember Me",
                              'name': 'reset',
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
                                      onclickProps: '/auth/login',
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
            },],
          },],
        },],
      },
      'resources': {
        // tokendata: `/auth/asyncreset/:token?format=json&entitytype=${entitytype||reactapp.settings.login.options.headers.entitytype}`,
        tokendata: passport.paths[ entitytype+'_auth_reset' ]+'/get_token_data/:token',
      },
      'pageData': {
        'title': `Reset Password | ${reactapp.settings.name}`,
        'navLabel': 'Reset Password',
      },
      'onFinish': 'render',
    };
  };
  return {
    containers: (passportSettings.include_manifests) ? {
      [ path.join(reactapp.manifest_prefix, passport.paths[ 'account_auth_reset' ]) + '/:token' ]: getContainerManifest('account'),
      [ path.join(reactapp.manifest_prefix, passport.paths[ 'user_auth_reset' ]) + '/:token' ]: getContainerManifest('user'),
    } : {},
  };
};