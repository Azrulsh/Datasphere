// Entirely synthetic identity/token fixtures, never real Google credentials.
export const clientId = '123-test-client.apps.googleusercontent.com'
export const fakeAccessToken = 'test-oauth-access-token'
export const readonlyScope = 'https://www.googleapis.com/auth/spreadsheets.readonly'
export const appConfig = { clientId, sheet: { spreadsheetId: 'test-spreadsheet', range: 'Sheet1!A:F' } }

export function fakeCredential(initialization, now, changes = {}) {
  const claims = {
    sub: 'test-user', name: 'Generated account', email: 'generated@example.test',
    aud: initialization.client_id, iss: 'https://accounts.google.com',
    nonce: initialization.nonce, exp: Math.floor(now / 1000) + 3600, ...changes,
  }
  return `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`
}

export function tokenResponse(changes = {}) {
  return { access_token: fakeAccessToken, scope: readonlyScope, token_type: 'Bearer', expires_in: 3600, ...changes }
}

export function mockGoogleIdentity() {
  const calls = { initializations: [], buttons: [], tokenConfigs: [], tokenRequests: 0, revoked: [], disabled: 0, cancelled: 0 }
  const google = { accounts: {
    id: {
      initialize: (config) => calls.initializations.push(config),
      renderButton: (element, options) => calls.buttons.push({ element, options }),
      disableAutoSelect: () => { calls.disabled++ },
      cancel: () => { calls.cancelled++ },
    },
    oauth2: {
      initTokenClient: (config) => {
        calls.tokenConfigs.push(config)
        return { requestAccessToken: () => { calls.tokenRequests++ } }
      },
      hasGrantedAllScopes: (response, ...scopes) => scopes.every((scope) => response.scope?.split(' ').includes(scope)),
      revoke: (token, callback) => { calls.revoked.push(token); callback() },
    },
  } }
  return { google, calls }
}
