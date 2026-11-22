import assert from 'node:assert/strict'
import test from 'node:test'
import { createSessionController } from '../src/auth/sessionController.ts'
import { createGoogleIdentityClient } from '../src/auth/googleIdentity.ts'
import { sessionView } from '../src/auth/sessionView.ts'
import { createGoogleSheetsReader } from '../src/services/googleSheets.ts'
import { createLayoutTargets } from '../src/layouts/layoutTargets.ts'
import { generatedSheetValues } from './fixtures/sheets.mjs'
import { appConfig, fakeAccessToken, fakeCredential, mockGoogleIdentity, tokenResponse } from './fixtures/googleIdentity.mjs'

const flush = () => new Promise((resolve) => setImmediate(resolve))

function harness(options = {}) {
  const { google, calls } = mockGoogleIdentity()
  let time = 1_700_000_000_000
  let nonce = 0
  const timers = new Set()
  const requests = []
  if (options.initFailure) google.accounts.id.initialize = () => { throw new Error('private initialization details') }
  const reader = createGoogleSheetsReader(appConfig.sheet, async (url, init) => {
    requests.push({ url, init })
    if (options.fetcher) return options.fetcher(url, init)
    return new Response(JSON.stringify({ values: generatedSheetValues(200) }))
  })
  const controller = createSessionController(appConfig, {
    loadIdentity: async () => { if (options.loadFailure) throw new Error('private loader details'); return google },
    makeIdentityClient: (clientId, sdk, handlers) => createGoogleIdentityClient(clientId, sdk, handlers, () => time, () => `test-nonce-${++nonce}`),
    reader, now: () => time,
    scheduleExpiry: (callback, milliseconds) => {
      const timer = { callback, deadline: time + milliseconds }
      timers.add(timer)
      return () => timers.delete(timer)
    },
  })
  return {
    controller, calls, requests, timers,
    async signIn() {
      controller.start()
      await flush()
      controller.renderSignInButton({})
      calls.buttons.at(-1).options.click_listener()
      calls.initializations.at(-1).callback({ credential: fakeCredential(calls.initializations.at(-1), time) })
    },
    async connect() {
      controller.authorize()
      calls.tokenConfigs.at(-1).callback(tokenResponse())
      await flush()
    },
    advance(milliseconds) {
      time += milliseconds
      for (const timer of [...timers]) if (timer.deadline <= time) { timers.delete(timer); timer.callback() }
    },
  }
}

test('SDK loading and authentication initialization failures offer retry without disclosing details', async () => {
  for (const options of [{ loadFailure: true }, { initFailure: true }]) {
    const h = harness(options)
    h.controller.start()
    await flush()
    assert.equal(h.controller.getSnapshot().status, 'gis-error')
    assert.ok(!JSON.stringify(h.controller.getSnapshot()).includes('private'))
    h.controller.stop()
  }
})

test('sign-in and Sheets authorization remain separate; cancelled sign-in remains retryable', async () => {
  const h = harness()
  h.controller.start()
  await flush()
  h.controller.renderSignInButton({})
  h.calls.buttons[0].options.click_listener()
  assert.equal(h.controller.getSnapshot().status, 'signed-out')
  assert.ok(h.controller.getSnapshot().notice.includes('cancel'))
  h.calls.initializations[0].callback({ credential: 'invalid' })
  assert.equal(h.controller.getSnapshot().status, 'signed-out')
  assert.ok(h.controller.getSnapshot().error)
  await h.signIn()
  assert.equal(h.controller.getSnapshot().status, 'signed-in')
  assert.equal(h.requests.length, 0)
  assert.equal(h.calls.tokenRequests, 0)
  h.controller.stop()
})

test('authorized 200-row data flows through the Phase 3 parser into visualization props with unchanged geometry', async () => {
  const h = harness()
  await h.signIn()
  await h.connect()
  const snapshot = h.controller.getSnapshot()
  assert.equal(snapshot.status, 'ready')
  assert.equal(snapshot.records.length, 200)
  assert.equal(snapshot.records[199].name, 'Generated row 199')
  assert.equal(h.requests[0].init.headers.Authorization, `Bearer ${fakeAccessToken}`)
  assert.equal(h.requests[0].init.method, 'GET')
  assert.ok(!JSON.stringify(snapshot).includes(fakeAccessToken))
  const view = sessionView(snapshot)
  assert.equal(view.records, snapshot.records)
  assert.match(view.countLabel, /Expected 200 loaded/)
  for (const [layout, dimensions] of [['table', [20, 10, 1]], ['grid', [5, 4, 10]]]) {
    const targets = createLayoutTargets(layout, view.records.length)
    for (const [index, axis] of ['x', 'y', 'z'].entries()) assert.equal(new Set(targets.map(({ position }) => position[axis])).size, dimensions[index])
  }
  for (const layout of ['sphere', 'helix']) assert.equal(createLayoutTargets(layout, view.records.length).length, 200)
  h.controller.stop()
})

test('valid dynamic datasets remain visible with an explicit expected-count difference', async () => {
  const h = harness({ fetcher: async () => new Response(JSON.stringify({ values: generatedSheetValues(3) })) })
  await h.signIn(); await h.connect()
  assert.equal(sessionView(h.controller.getSnapshot()).records.length, 3)
  assert.match(sessionView(h.controller.getSnapshot()).countLabel, /dataset count differs/)
  h.controller.stop()
})

test('authorization denial preserves identity, clears data and allows an explicit successful retry', async () => {
  const h = harness()
  await h.signIn()
  h.controller.authorize(); h.controller.authorize()
  assert.equal(h.calls.tokenRequests, 1)
  h.calls.tokenConfigs[0].callback({ error: 'access_denied' })
  await flush()
  assert.equal(h.controller.getSnapshot().status, 'authorization-error')
  assert.equal(h.controller.getSnapshot().user.id, 'test-user')
  assert.equal(h.controller.getSnapshot().authorized, false)
  assert.equal(h.requests.length, 0)
  await h.connect()
  assert.equal(h.controller.getSnapshot().status, 'ready')
  h.controller.stop()
})

test('invalid spreadsheet rows, empty responses, malformed envelopes and network failures never fall back to samples', async () => {
  const invalid = generatedSheetValues()
  invalid[1][2] = 'invalid age'
  for (const [fetcher, status] of [
    [async () => new Response(JSON.stringify({ values: invalid })), 'data-error'],
    [async () => new Response(JSON.stringify({ range: 'Sheet1!A:F' })), 'empty'],
    [async () => new Response(JSON.stringify({ values: {} })), 'data-error'],
    [async () => { throw new Error(`sensitive ${fakeAccessToken}`) }, 'data-error'],
  ]) {
    const h = harness({ fetcher })
    await h.signIn(); await h.connect()
    const snapshot = h.controller.getSnapshot()
    assert.equal(snapshot.status, status)
    assert.deepEqual(snapshot.records, [])
    assert.equal(sessionView(snapshot).records, null)
    assert.ok(!JSON.stringify(snapshot).includes(fakeAccessToken))
    h.controller.stop()
  }
})

test('validation errors retain actionable row, column and field details', async () => {
  const values = generatedSheetValues()
  values[1][2] = 'invalid'
  const h = harness({ fetcher: async () => new Response(JSON.stringify({ values })) })
  await h.signIn(); await h.connect()
  assert.match(h.controller.getSnapshot().error.details[0], /Row 2, column 3 \(age\)/)
  h.controller.stop()
})

test('401 clears authorization and requires a user-triggered renewal; 403 retains a retry path', async () => {
  for (const [status, expected] of [[401, 'expired'], [403, 'permission-denied']]) {
    const h = harness({ fetcher: async () => new Response('', { status }) })
    await h.signIn(); await h.connect()
    assert.equal(h.controller.getSnapshot().status, expected)
    assert.equal(h.requests.length, 1)
    assert.equal(h.calls.tokenRequests, 1)
    h.controller.refresh()
    if (status === 401) assert.equal(h.calls.tokenRequests, 2)
    else { await flush(); assert.equal(h.requests.length, 2) }
    h.controller.stop()
    await flush()
  }
})

test('refresh reuses the OAuth token, preserves visible data while loading and blocks duplicate clicks', async () => {
  const h = harness()
  await h.signIn(); await h.connect()
  const previous = h.controller.getSnapshot().records
  h.controller.refresh(); h.controller.refresh()
  assert.equal(h.controller.getSnapshot().status, 'loading')
  assert.equal(sessionView(h.controller.getSnapshot()).records, previous)
  await flush()
  assert.equal(h.requests.length, 2)
  assert.equal(h.calls.tokenRequests, 1)
  assert.equal(h.controller.getSnapshot().status, 'ready')
  h.controller.stop()
})

test('expiration clears in-memory data and does not automatically open an authorization popup', async () => {
  const h = harness()
  await h.signIn(); await h.connect()
  h.advance(3_600_000)
  assert.equal(h.controller.getSnapshot().status, 'expired')
  assert.deepEqual(h.controller.getSnapshot().records, [])
  assert.equal(h.calls.tokenRequests, 1)
  h.controller.refresh()
  assert.equal(h.calls.tokenRequests, 2)
  h.controller.stop()
  await flush()
})

test('sign-out clears identity, token, profiles and expiry timer and requests revocation', async () => {
  const h = harness()
  await h.signIn(); await h.connect()
  h.controller.signOut()
  const snapshot = h.controller.getSnapshot()
  assert.equal(snapshot.status, 'signed-out')
  assert.equal(snapshot.user, null)
  assert.equal(snapshot.authorized, false)
  assert.deepEqual(snapshot.records, [])
  assert.deepEqual(h.calls.revoked, [fakeAccessToken])
  assert.equal(h.timers.size, 0)
  assert.equal(h.calls.disabled, 1)
  assert.match(snapshot.notice, /Google account remains signed in/)
  h.controller.stop()
})

test('sign-out aborts the read and ignores a late HTTP response even if transport ignores cancellation', async () => {
  let finish
  const h = harness({ fetcher: () => new Promise((resolve) => { finish = resolve }) })
  await h.signIn(); await h.connect()
  assert.equal(h.controller.getSnapshot().status, 'loading')
  h.controller.signOut()
  assert.equal(h.requests[0].init.signal.aborted, true)
  finish(new Response(JSON.stringify({ values: generatedSheetValues(200) })))
  await flush()
  assert.equal(h.controller.getSnapshot().user, null)
  assert.equal(sessionView(h.controller.getSnapshot()).records, null)
  h.controller.stop()
})

test('late OAuth callbacks after sign-out cannot fetch or restore private data', async () => {
  const h = harness()
  await h.signIn()
  h.controller.authorize()
  const old = h.calls.tokenConfigs[0]
  h.controller.signOut()
  old.callback(tokenResponse())
  await flush()
  assert.equal(h.requests.length, 0)
  assert.equal(h.controller.getSnapshot().user, null)
  h.controller.stop()
})

test('unmount aborts an active read and clears its timer and data before a late result', async () => {
  let finish
  const h = harness({ fetcher: () => new Promise((resolve) => { finish = resolve }) })
  await h.signIn(); await h.connect()
  h.controller.stop()
  assert.equal(h.requests[0].init.signal.aborted, true)
  assert.equal(h.timers.size, 0)
  finish(new Response(JSON.stringify({ values: generatedSheetValues(200) })))
  await flush()
  assert.equal(h.controller.getSnapshot().user, null)
  assert.deepEqual(h.controller.getSnapshot().records, [])
})

test('account changes cancel pending data and require authorization for the new account', async () => {
  let finish
  const h = harness({ fetcher: () => new Promise((resolve) => { finish = resolve }) })
  await h.signIn(); await h.connect()
  h.calls.buttons.at(-1).options.click_listener()
  h.calls.initializations.at(-1).callback({ credential: fakeCredential(h.calls.initializations.at(-1), 1_700_000_000_000, { sub: 'second-user' }) })
  assert.equal(h.requests[0].init.signal.aborted, true)
  finish(new Response(JSON.stringify({ values: generatedSheetValues(200) })))
  await flush()
  assert.equal(h.controller.getSnapshot().user.id, 'second-user')
  assert.equal(h.controller.getSnapshot().status, 'signed-in')
  assert.deepEqual(h.controller.getSnapshot().records, [])
  h.controller.stop()
})

test('StrictMode-style start/stop/start and unmount do not duplicate initialization or requests', async () => {
  const h = harness()
  h.controller.start(); h.controller.stop(); h.controller.start()
  await flush()
  assert.equal(h.calls.initializations.length, 1)
  assert.equal(h.requests.length, 0)
  h.controller.renderSignInButton({})
  const old = h.calls.initializations[0]
  h.calls.buttons[0].options.click_listener()
  h.controller.stop()
  old.callback({ credential: fakeCredential(old, 1_700_000_000_000) })
  assert.equal(h.controller.getSnapshot().user, null)
  assert.equal(h.timers.size, 0)
})
