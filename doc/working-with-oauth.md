Adding Oauth Client for OAuth2Client

add client token and secret to passport configuration under $p.settings.extensions['periodicjs.ext.passport'].oauth.oauth2client

example:
```javascript
{ routing:
   { authenication_route_prefix: 'auth',
     login: 'login',
     logout: 'logout',
   },
  emails:
   { welcome:
      'node_modules/periodicjs.ext.passport/views/email/welcome.ejs', },
  email_subjects: { welcome: false, forgot: false },
  oauth:
   { 
     oauth2client: [ 
     { client_token_id: 'sometoken',
    client_secret: 'somesecret',
    authorization_url:
     'https://connect.squareup.com/oauth2/authorize?client_id=sometoken&scope=PAYMENTS_READ%20SETTLEMENTS_READ%20ITEMS_READ%20ORDERS_READ%20MERCHANT_PROFILE_READ',
    user_entity_type: 'account',
    user_email: 'user@domain.com',
    token_url: 'https://connect.squareup.com/oauth2/token',
    service_url: 'https://some-oauth2-server:8787',
    service_name: 'square',
    scope:
     [ 'PAYMENTS_READ',
       'SETTLEMENTS_READ',
       'ITEMS_READ',
       'ORDERS_READ',
       'MERCHANT_PROFILE_READ', ],
    callback_url:
     'https://myapp.com/auth/oauth2client-square/callback',
    refresh_url:
     'https://connect.squareup.com/oauth2/clients/sometoken/access-token/renew' }
     
     ] } 
   }
```

How this impacts oauth2client
$p.locals.extensions.get('periodicjs.ext.oauth2client').oauth
```javascript
{ selectedUserAuthToken: { square: null }, // can create auth headers with user selected
  clientAuthToken: { square: [Function] }, //hold header for clients in passport configuration
  oauth2callback: [Function: oauth2callback], //return oauth callback request
  user_auth_request: [Function: user_auth_request], // returns middleware function with bearer headers on req request
  client_auth_request: [Function: client_auth_request], // returns middleware function with client auth headers on req quest
  get_auth_tokens: [Function: get_auth_tokens],
  getProfileFromAccessToken: [Function: getProfileFromAccessToken],
  oauthLoginVerifyCallback: [Function: oauthLoginVerifyCallback] }
  
  // in oauth2client creates auth routers for oauth flow
  passportExtOAuth2Clients.forEach(oauth2client_settings => {
  const client = oauth2client_settings;
  const service_name = oauth2client_settings.service_name;
  const clientAuth = utilities.oauth.client_auth_request({ client, });
  const userAuth = utilities.oauth.user_auth_request({ client, });
  let mockUserAuthReq = {};
  let mockUserAuthRes = {};
  userAuth(mockUserAuthReq, mockUserAuthRes, () => {
    if (periodic.config.debug) {
      periodic.logger.silly(`Configured ${service_name}, OAuth2 Bearer Authentication for (${capitalize(oauth2client_settings.user_entity_type || 'user')})${oauth2client_settings.user_email}`);
    }
  });
  utilities.oauth.clientAuthToken[service_name] = clientAuth;
  // utilities.oauth.selectedUserAuthToken[service_name] = userAuth;
  authRouter.get(`/oauth2client-${service_name}`, passport.authenticate(`oauth2client-${service_name}`));
  authRouter.get(`/oauth2client-${service_name}/callback`, utilities.oauth.oauth2callback({ service_name, }));
});
```
 

