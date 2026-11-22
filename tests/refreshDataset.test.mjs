import assert from 'node:assert/strict'
import test from 'node:test'
import { createSessionController } from '../src/auth/sessionController.ts'
import { createGoogleIdentityClient } from '../src/auth/googleIdentity.ts'
import { createGoogleSheetsReader } from '../src/services/googleSheets.ts'
import { generatedSheetValues } from './fixtures/sheets.mjs'
import { appConfig, fakeCredential, mockGoogleIdentity, tokenResponse } from './fixtures/googleIdentity.mjs'

test('refresh replaces a changed 200-row dataset in source order without mutating the previous snapshot', async (t) => {
  const { google, calls } = mockGoogleIdentity()
  const now = 1_700_000_000_000
  let reads = 0
  const values = generatedSheetValues(200)
  const reader = createGoogleSheetsReader(appConfig.sheet, async () => {
    reads++
    return new Response(JSON.stringify({ values }))
  })
  const controller = createSessionController(appConfig, {
    loadIdentity: async () => google,
    makeIdentityClient: (clientId, sdk, handlers) => createGoogleIdentityClient(clientId, sdk, handlers, () => now, () => 'refresh-test-nonce'),
    reader, now: () => now, scheduleExpiry: () => () => {},
  })
  t.after(() => controller.stop())
  const flush = () => new Promise((resolve) => setImmediate(resolve))
  controller.start()
  await flush()
  controller.renderSignInButton({})
  calls.buttons[0].options.click_listener()
  calls.initializations[0].callback({ credential: fakeCredential(calls.initializations[0], now) })
  controller.authorize()
  calls.tokenConfigs[0].callback(tokenResponse())
  await flush()
  const original = controller.getSnapshot().records
  assert.equal(original.length, 200)
  values[1][0] = 'Changed source name'
  values[1][5] = '$100,000.00'
  ;[values[2], values[3]] = [values[3], values[2]]
  controller.refresh()
  await flush()
  const refreshed = controller.getSnapshot()
  assert.equal(refreshed.status, 'ready')
  assert.equal(reads, 2)
  assert.equal(refreshed.records.length, 200)
  assert.equal(refreshed.records[0].name, 'Changed source name')
  assert.equal(refreshed.records[0].netWorth, 100_000)
  assert.equal(refreshed.records[1].name, 'Generated row 2')
  assert.equal(refreshed.records[2].name, 'Generated row 1')
  assert.equal(refreshed.records[199].name, 'Generated row 199')
  assert.equal(new Set(refreshed.records).size, 200)
  assert.equal(original[0].name, 'Generated row 0')
})
