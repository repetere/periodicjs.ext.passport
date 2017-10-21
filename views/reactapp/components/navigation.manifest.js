'use strict';
// const path = require('path');

module.exports = (periodic) => {
  const reactappLocals = periodic.locals.extensions.get('periodicjs.ext.reactapp');
  const reactapp = reactappLocals.reactapp();
  
  return {
    wrapper: {
      style: {},
    },
    container: {
      style: {},
    },
    layout: {
      component: 'Menu',
      props: {
        style: {},
      },
      children: [
        reactappLocals.server_manifest.core_navigation.getSidebarNav({
          title: 'Login',
          links: [
            {
              'href': `${reactapp.manifest_prefix}extension/oauth2server/standard/clients`,
              'label': 'OAUTH2 Clients',
              'id': 'oauth2server-clients',
            },
          ],
        }),
      ],
    },
  };
};