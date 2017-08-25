'use strict';
const path = require('path');

module.exports = function entityLink(options){
  const { reactapp,entitytype,title,linkSuffix,passport } = options;
  return {
    "component": "Title",
    "props": {
      "style": {
        "textAlign": "center"
      }
    },
    "children": [ {
      component: "span",
      children: title
    },
    {
      component: 'ResponsiveLink',
      props: {
        style: {
          marginLeft:'1rem',
          fontSize: '50%',
          color:(entitytype==='user')?'black':undefined,
          textDecoration:(entitytype==='user')?'none':undefined,
        },
        location: path.join(reactapp.manifest_prefix, passport.paths[ `user${linkSuffix}` ]),
        // location: path.join(reactapp.manifest_prefix, passport.paths[ `${entitytype}_auth_forgot` ]),
      },
      children: 'User'
    },
    {
      component: "span",
      props: {
        style: {
          fontSize: '50%',
        },
      },
      children: " | "
    },
    {
      component: 'ResponsiveLink',
      props: {
        style: {
          fontSize:'50%',
          color:(entitytype==='account')?'black':undefined,
          textDecoration:(entitytype==='account')?'none':undefined,
        },
        location: path.join(reactapp.manifest_prefix, passport.paths[ `account${linkSuffix}` ]),
        // location: path.join(reactapp.manifest_prefix, passport.paths[ `${entitytype}_auth_forgot` ]),
      },
      children: 'Account'
    },
    ]
  };
}