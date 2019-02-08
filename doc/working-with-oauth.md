Adding Oauth Client for OAuth2Client

add client token and secret to passport configuration under $p.settings.extensions['periodicjs.ext.passport'].oauth.oauth2client

example:
```json
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
     oauth2client: [ [Object] ] } 
   }
```
