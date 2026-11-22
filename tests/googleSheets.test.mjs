import assert from 'node:assert/strict'
import test from 'node:test'
import { readGoogleSheetsConfig, validateGoogleSheetsConfig } from '../src/config/googleSheets.ts'
import { createGoogleSheetsReader } from '../src/services/googleSheets.ts'
import { generatedSheetValues } from './fixtures/sheets.mjs'

const config = { spreadsheetId: 'test_spreadsheet-id', range: "'Profile Data'!A1:F201" }
const token = 'test-access-token' // Test-only placeholder, never a real credential.

test('validates and trims sheet configuration without reading global env', () => {
  const result = readGoogleSheetsConfig({ VITE_GOOGLE_SHEET_ID: ` ${config.spreadsheetId} `, VITE_GOOGLE_SHEET_RANGE: ` ${config.range} ` })
  assert.deepEqual(result, { ok: true, config })
  for (const range of ['Sheet1!A:F', "'Profile Data'!A1:F201", "'People''s Data'!A:F", 'Sheet1!$A$1:$F$201', 'Sheet1!b:g']) {
    assert.equal(validateGoogleSheetsConfig({ ...config, range }).ok, true)
  }
})

test('reports missing env and malformed IDs or ranges with actionable configuration issues', () => {
  assert.equal(readGoogleSheetsConfig({}).issues.length, 2)
  for (const spreadsheetId of ['', 'https://docs.google.com/spreadsheets/d/test/edit', 'bad/id', 'bad id']) {
    const result = validateGoogleSheetsConfig({ ...config, spreadsheetId })
    assert.equal(result.ok, false)
    assert.equal(result.issues[0].field, 'spreadsheetId')
  }
  for (const range of ['', 'A:F', 'Sheet1!A2:F201', 'Sheet1!F:A', 'Sheet1!A:E', 'Sheet1!A1:F0', 'Profile Data!A:F', 'Sheet1!A:F\nmalformed']) {
    assert.equal(validateGoogleSheetsConfig({ ...config, range }).ok, false)
  }
})

test('reader construction is inert; invalid configuration or missing tokens never fetch', async () => {
  let calls = 0
  const fetcher = async () => { calls++; throw new Error('must not fetch') }
  const reader = createGoogleSheetsReader(config, fetcher)
  assert.equal(calls, 0)
  for (const value of ['', ' ', undefined]) {
    assert.equal((await reader.readProfiles(value)).error.code, 'ACCESS_TOKEN_REQUIRED')
  }
  for (const value of ['Bearer token', 'token\r\ninjection']) {
    assert.equal((await reader.readProfiles(value)).error.code, 'INVALID_ACCESS_TOKEN')
  }
  const invalid = createGoogleSheetsReader({ spreadsheetId: '', range: '' }, fetcher)
  assert.equal((await invalid.readProfiles(token)).error.code, 'INVALID_CONFIGURATION')
  assert.equal(calls, 0)
})

test('explicit read uses only GET, encoded range, row-major raw values and bearer header', async () => {
  let calls = 0
  const signal = new AbortController().signal
  const reader = createGoogleSheetsReader(config, async (input, init) => {
    calls++
    const url = new URL(input)
    assert.equal(url.origin, 'https://sheets.googleapis.com')
    assert.equal(decodeURIComponent(url.pathname), `/v4/spreadsheets/${config.spreadsheetId}/values/${config.range}`)
    assert.equal(url.searchParams.get('majorDimension'), 'ROWS')
    assert.equal(url.searchParams.get('valueRenderOption'), 'UNFORMATTED_VALUE')
    assert.equal(url.searchParams.has('key'), false)
    assert.equal(input.includes(token), false)
    assert.equal(init.method, 'GET')
    assert.equal(init.headers.Authorization, `Bearer ${token}`)
    assert.equal(init.credentials, 'omit')
    assert.equal(init.cache, 'no-store')
    assert.equal(init.redirect, 'error')
    assert.equal(init.signal, signal)
    return new Response(JSON.stringify({ values: generatedSheetValues(200), majorDimension: 'ROWS' }))
  })
  const result = await reader.readProfiles(token, signal)
  assert.equal(calls, 1)
  assert.equal(result.ok, true)
  assert.equal(result.records.length, 200)
})

test('HTTP failures retain status but never expose response bodies or credentials', async () => {
  for (const status of [401, 403, 404, 429, 500]) {
    const reader = createGoogleSheetsReader(config, async () => new Response(`sensitive body ${token}`, { status }))
    const result = await reader.readProfiles(token)
    assert.equal(result.error.code, 'HTTP_ERROR')
    assert.equal(result.error.status, status)
    assert.equal(JSON.stringify(result).includes(token), false)
    assert.equal(JSON.stringify(result).includes('sensitive body'), false)
  }
})

test('transport failures use sanitized messages without leaking thrown error content', async () => {
  const reader = createGoogleSheetsReader(config, async () => { throw new Error(`request failed with ${token}`) })
  const result = await reader.readProfiles(token)
  assert.equal(result.error.code, 'NETWORK_ERROR')
  assert.equal(JSON.stringify(result).includes(token), false)
})

test('handles pre-aborted and in-flight cancelled reads separately from network errors', async () => {
  const controller = new AbortController()
  controller.abort()
  let calls = 0
  const reader = createGoogleSheetsReader(config, async () => { calls++; throw new DOMException('cancelled', 'AbortError') })
  assert.equal((await reader.readProfiles(token, controller.signal)).error.code, 'ABORTED')
  assert.equal(calls, 0)
  assert.equal((await reader.readProfiles(token)).error.code, 'ABORTED')
})

test('passes an in-flight AbortSignal through to fetch and returns a cancelled result', async () => {
  const controller = new AbortController()
  const reader = createGoogleSheetsReader(config, async (_input, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError')), { once: true })
  }))
  const pending = reader.readProfiles(token, controller.signal)
  controller.abort()
  assert.equal((await pending).error.code, 'ABORTED')
})

test('distinguishes invalid JSON, invalid response shape and row validation errors', async () => {
  const responses = [
    [() => new Response('invalid JSON'), 'INVALID_JSON'],
    [() => new Response(JSON.stringify({ values: 'invalid shape' })), 'UNEXPECTED_RESPONSE_SHAPE'],
    [() => new Response(JSON.stringify({ values: [generatedSheetValues()[0], []] })), 'INVALID_ROWS'],
  ]
  for (const [response, code] of responses) {
    const result = await createGoogleSheetsReader(config, async () => response()).readProfiles(token)
    assert.equal(result.error.code, code)
  }
})
