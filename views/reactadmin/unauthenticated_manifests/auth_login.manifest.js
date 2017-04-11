'use strict';
const path = require('path');

module.exports = (periodic) => {
  let reactadmin = periodic.app.controller.extension.reactadmin;
  // console.log('`${reactadmin.manifest_prefix}api/oauth2async/signin?format=json`',
  // `${reactadmin.manifest_prefix}api/oauth2async/signin?format=json`);
  // console.log('reactadmin.manifest_prefix', reactadmin.manifest_prefix);
  return {
    containers: {
      [`${reactadmin.manifest_prefix}auth/login`]: {
        "layout": {
          "component": "Hero",
          "props": {
            "size": "isFullheight"
          },
          "children": [{
            "component": "HeroBody",
            "props": {},
            "children": [{
              "component": "Container",
              "props": {},
              "children": [{
                "component": "Columns",
                "children": [{
                    "component": "Column",
                    "props": {
                      "size": "is3"
                    }
                  },
                  {
                    "component": "Column",
                    "props": {},
                    "children": [
                      { 
                        "component": "ResponsiveForm",
                        "asyncprops": {
                          onSubmit: ['oauth2data', 'data']
                        },
                        "props": {
                          "cardForm": true,
                          cardFormTitle:'Sign In',
                          "cardFormProps": {
                            "isFullwidth": true,
                           
                          },
                          // "onSubmit": "func:this.props.loginUser",
                          // onSubmit: {
                          //   url: '/api/oauth2async/signin',
                          //   options: {
                          //     method: 'POST',
                          //   },
                          //   successCallback: 'func:this.props.loginUser',
                          // },
                          /*
                          "footergroups": [{
                            "gridProps": {},
                            "formElements": [{
                                "type": "submit",
                                "value": "Login",
                                "name": "login",
                                "passProps": {
                                  "style": {
                                    "color": "#1fc8db"
                                  }
                                },
                                "layoutProps": {}
                              },
                              {
                                "type": "layout",
                                "value": {
                                  component: 'div',
                                  props: {
                                    style: {
                                      color:'black'
                                    }
                                  },
                                  children: "Forgot Password"
                                },
                                // "name": "forgot",
                                // "passProps": {
                                //   "style": {
                                //     "color": "#69707a"
                                //   }
                                // },
                                "layoutProps": {}
                              },
                              {
                                "type": "submit",
                                "value": "New User",
                                "name": "register",
                                "passProps": {
                                  "style": {
                                    "color": "#69707a"
                                  }
                                },
                                "layoutProps": {}
                              }
                            ]
                          }],*/
                          "formgroups": [{
                              "gridProps": {},
                              "formElements": [{
                                "type": "text",
                                "label": "Username",
                                "name": "username",
                                "layoutProps": {
                                  "horizontalform": true
                                }
                              }]
                            },
                            {
                              "gridProps": {},
                              "formElements": [{
                                "type": "text",
                                "label": "Password",
                                "name": "password",
                                "submitOnEnter": true,
                                "passProps": {
                                  "type": "password"
                                },
                                "layoutProps": {
                                  "horizontalform": true
                                }
                              }]
                            },
                            {
                              "gridProps": {
                                style:{
                                  justifyContent:'center',
                                }
                              },
                              "formElements": [
                                {
                                  type: "group",
                                  label:" ",
                                  "layoutProps": {
                                    "horizontalform": true,
                                    innerFormItem:true,
                                  },
                                  groupElements: [
                                    {
                                      "type": "checkbox",
                                      // "label": "a",
                                      "placeholder": "Remember Me",
                                      "name": "rememberme",
                                      "passProps": {
                                        "type": "rememberme"
                                      },
                                      "layoutProps": {
                                        "horizontalform": true
                                      }
                                    },
                                    {
                                      "type": "layout",
                                      value: {
                                        component: 'ResponsiveLink',
                                        props: {
                                          location:'/auth/forgot'
                                        },
                                        children:'Forgot Password'
                                      }
                                    }
                                    
                                  ]
                                }
                                
                              ]
                            },
                            {
                              "gridProps": {
                                style:{
                                  justifyContent:'center',
                                }
                              },
                              "formElements": [
                                {
                                  "type": "submit",
                                  "value": "Login",
                                  // "placeholder": "Remember Me",
                                  "name": "login",
                                  "passProps": {
                                    "color": "isPrimary"
                                  },
                                  "layoutProps": {
                                    formItemStyle: {
                                      justifyContent:'center'
                                    },
                                    "horizontalform": true
                                  }
                                },
                                {
                                  "type": "layout",
                                  value: {
                                    component: 'FormHorizontal',
                                    children: [
                                      {
                                        component: 'ResponsiveButton',
                                        props: {
                                          onClick: 'func:this.props.reduxRouter.push',
                                          onclickProps:'/auth/user/new',
                                          style: {
                                          },
                                          buttonProps: {
                                            // color: 'isPrimary',
                                          },
                                        },
                                        children:'New User',
                                      }
                                    ]
                                    
                                  },
                                  "layoutProps": {
                                    style: {
                                      justifyContent:'center'
                                    },
                                    // "horizontalform": true
                                  }
                                }
                              ]
                            }
                          ]
                        }
                      }
                    ]
                  },
                  {
                    "component": "Column",
                    "props": {
                      "size": "is3"
                    }
                  }
                ]
              }]
            }]
          }]
        },
        "resources": {
          // oauth2data: `${reactadmin.manifest_prefix}api/oauth2async/signin?format=json`,
        },
        'pageData': {
          'title': `Login | ${reactadmin.settings.name}`,
          'navLabel': 'Login',
        },
        "onFinish": "render"
      }
    },
  };
};