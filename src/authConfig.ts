export const cognitoAuthConfig = {
  authority: 'https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_dTRMpysvm',
  client_id: '1d1hfq25uin2f3mha98o6vfk66',
  redirect_uri: 'https://main.dtjfzels7mmz4.amplifyapp.com/',
  redirectSignIn: window.location.origin,
  redirectSignOut: window.location.origin,
  post_logout_redirect_uri: 'https://main.dtjfzels7mmz4.amplifyapp.com/',
  response_type: 'code',
  scope: 'phone openid email',
}
