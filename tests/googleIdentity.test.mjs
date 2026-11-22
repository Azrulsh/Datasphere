import assert from 'node:assert/strict'
import test from 'node:test'
import { readAppConfig } from '../src/config/appConfig.ts'
import { createGoogleIdentityClient } from '../src/auth/googleIdentity.ts'
import { decodeDisplayIdentity } from '../src/auth/identityClaims.ts'
import { appConfig, clientId, fakeAccessToken, fakeCredential, mockGoogleIdentity, readonlyScope, tokenResponse } from './fixtures/googleIdentity.mjs'

const now = 1_700_000_000_000

function clientHarness() {
  const { google, calls } = mockGoogleIdentity()
  const users = []
  const errors = []
  let starts = 0
  let nonce = 0
  const client = createGoogleIdentityClient(clientId, google, {
    onUser: (user) => users.push(user), onError: (error) => errors.push(error), onSignInStart: () => { starts++ },
  }, () => now, () => `test-nonce-${++nonce}`)
  client.renderButton({})
  return { client, google, calls, users, errors, starts: () => starts }
}

test('app config requires a Web OAuth client ID plus Spreadsheet ID and range', () => {
  assert.equal(readAppConfig({}).issues.length, 3)
  const env = { VITE_GOOGLE_CLIENT_ID: clientId, VITE_GOOGLE_SHEET_ID: appConfig.sheet.spreadsheetId, VITE_GOOGLE_SHEET_RANGE: appConfig.sheet.range }
  assert.deepEqual(readAppConfig(env), { ok: true, config: appConfig })
  for (const key of Object.keys(env)) assert.equal(readAppConfig({ ...env, [key]: '' }).ok, false)
  for (const value of ['invalid', '123.apps.googleusercontent.com', 'https://example.test/client', 'client-secret']) {
    assert.equal(readAppConfig({ ...env, VITE_GOOGLE_CLIENT_ID: value }).ok, false)
  }
})

test('GIS official sign-in button uses a nonce and yields display identity without authorizing Sheets', () => {
  const h = clientHarness()
  assert.equal(h.calls.initializations[0].auto_select, false)
  h.calls.buttons[0].options.click_listener()
  h.calls.initializations[0].callback({ credential: fakeCredential(h.calls.initializations[0], now) })
  assert.equal(h.starts(), 1)
  assert.deepEqual(h.users, [{ id: 'test-user', name: 'Generated account', email: 'generated@example.test' }])
  assert.equal(h.calls.tokenRequests, 0)
})

test('sign-in failure is sanitized, while a cancelled sign-in does not block retry', () => {
  const h = clientHarness()
  h.calls.buttons[0].options.click_listener()
  assert.equal(h.users.length, 0) // Closing the Google UI produces no identity and leaves the button usable.
  h.calls.buttons[0].options.click_listener()
  h.calls.initializations[0].callback({ credential: 'invalid-private-credential' })
  assert.equal(h.errors.length, 1)
  assert.ok(!h.errors[0].message.includes('invalid-private-credential'))
  h.calls.buttons[0].options.click_listener()
  h.calls.initializations[0].callback({ credential: fakeCredential(h.calls.initializations[0], now) })
  assert.equal(h.users.length, 1)
})

test('display decoder checks audience, issuer, nonce, expiration and subject without claiming signature verification', () => {
  const initialization = { client_id: clientId, nonce: 'test-nonce' }
  for (const changes of [{ aud: 'other-client' }, { iss: 'https://other.test' }, { nonce: 'old-nonce' }, { exp: now / 1000 }, { sub: '' }]) {
    assert.throws(() => decodeDisplayIdentity(fakeCredential(initialization, now, changes), clientId, initialization.nonce, now))
  }
})

test('token authorization is explicit, requests only read-only scope and uses an account hint', async () => {
  const h = clientHarness()
  const pending = h.client.authorize({ id: 'test-user' })
  assert.equal(h.calls.tokenRequests, 1)
  assert.equal(h.calls.tokenConfigs[0].scope, readonlyScope)
  assert.equal(h.calls.tokenConfigs[0].include_granted_scopes, false)
  assert.equal(h.calls.tokenConfigs[0].login_hint, 'test-user')
  h.calls.tokenConfigs[0].callback(tokenResponse())
  assert.deepEqual(await pending, { accessToken: fakeAccessToken, expiresAt: now + 3_600_000 })
})

test('OAuth denial, missing scope, blocked and closed popups return actionable failures', async () => {
  for (const kind of ['denied', 'scope', 'blocked', 'closed', 'invalid', 'sdk-failure']) {
    const h = clientHarness()
    const pending = h.client.authorize({ id: 'test-user' })
    const rejected = assert.rejects(pending, (error) => !!error.code && !error.message.includes('sensitive-response'))
    const config = h.calls.tokenConfigs[0]
    if (kind === 'denied') config.callback({ error: 'access_denied', error_description: 'sensitive-response' })
    if (kind === 'scope') config.callback(tokenResponse({ scope: 'openid' }))
    if (kind === 'blocked') config.error_callback({ type: 'popup_failed_to_open' })
    if (kind === 'closed') config.error_callback({ type: 'popup_closed' })
    if (kind === 'invalid') config.callback(tokenResponse({ expires_in: 0 }))
    if (kind === 'sdk-failure') {
      h.google.accounts.oauth2.hasGrantedAllScopes = () => { throw new Error('sensitive-response') }
      config.callback(tokenResponse())
    }
    await rejected
  }
})

test('duplicate token requests are blocked; disposal rejects pending authorization and ignores late credentials', async () => {
  const h = clientHarness()
  const pending = h.client.authorize({ id: 'test-user' })
  const cancelled = assert.rejects(pending, { code: 'CANCELLED' })
  await assert.rejects(h.client.authorize({ id: 'test-user' }), { code: 'BUSY' })
  assert.equal(h.calls.tokenRequests, 1)
  h.client.dispose()
  await cancelled
  h.calls.tokenConfigs[0].callback(tokenResponse())
  h.calls.buttons[0].options.click_listener()
  h.calls.initializations[0].callback({ credential: fakeCredential(h.calls.initializations[0], now) })
  assert.equal(h.users.length, 0)
})

test('sign-out rotates nonce and ignores credentials from the previous sign-in', () => {
  const h = clientHarness()
  const old = h.calls.initializations[0]
  h.calls.buttons[0].options.click_listener()
  h.client.signOut()
  assert.notEqual(h.calls.initializations[1].nonce, old.nonce)
  h.calls.buttons[0].options.click_listener()
  old.callback({ credential: fakeCredential(old, now) })
  assert.equal(h.users.length, 0)
  assert.equal(h.calls.disabled, 1)
})
