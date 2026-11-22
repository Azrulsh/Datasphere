import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { parseSheetValues, parseGoogleSheetsResponse } from '../src/data/parseSheetValues.ts'
import { generatedSheetRow, generatedSheetValues, sheetHeaders } from './fixtures/sheets.mjs'

function parseCell(column, value) {
  const row = generatedSheetRow()
  row[column] = value
  return parseSheetValues([sheetHeaders, row])
}

test('maps all six required headers by name, including reordered and extra columns', () => {
  const order = [5, 3, 1, 4, 2, 0]
  const row = generatedSheetRow(7)
  const result = parseSheetValues([
    ['Unused', ...order.map((index) => sheetHeaders[index])],
    ['ignored', ...order.map((index) => row[index])],
  ])
  assert.deepEqual(result, { ok: true, records: [{
    name: row[0], photo: row[1], age: row[2], country: row[3], interest: row[4], netWorth: row[5],
  }] })
})

test('normalizes header case, surrounding whitespace, BOM and nonbreaking spaces', () => {
  const result = parseSheetValues([
    ['\ufeff NAME ', ' photo\u00a0', ' AGE ', '\tCountry ', ' interest ', ' \u202fNET\u00a0 WORTH\u00a0'],
    generatedSheetRow(),
  ])
  assert.equal(result.ok, true)
})

test('parses USD currency symbols, commas, grouping spaces, decimals and numeric cells', () => {
  for (const value of ['$251,260.80', ' $ 251,260.80 ', 'USD 251,260.80', 'US$251,260.80', '251 260.80', '251260.80', 251260.8]) {
    const result = parseCell(5, value)
    assert.equal(result.ok, true)
    assert.equal(result.records[0].netWorth, 251260.8)
  }
  assert.equal(parseCell(5, '-$1,000.25').records[0].netWorth, -1000.25)
  assert.equal(parseCell(5, 0).records[0].netWorth, 0)
})

test('reports missing required headers by normalized name', () => {
  const result = parseSheetValues([['Name', 'Photo', 'Age', 'Country'], generatedSheetRow()])
  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'MISSING_HEADERS')
  assert.deepEqual(result.error.missingHeaders, ['interest', 'net worth'])
})

test('rejects duplicate normalized required headers instead of choosing one silently', () => {
  const result = parseSheetValues([[...sheetHeaders, ' NAME '], [...generatedSheetRow(), 'ambiguous']])
  assert.equal(result.error.code, 'DUPLICATE_HEADERS')
  assert.deepEqual(result.error.duplicateHeaders, ['name'])
})

test('accepts zero/integer ages and rejects empty, negative, fractional or nonfinite ages', () => {
  for (const value of [0, 30, ' 30 ', '30.0']) assert.equal(parseCell(2, value).ok, true)
  for (const value of ['', ' ', -1, 1.5, '30 years', '3e1', '0x1e', Infinity, NaN, null, true, Number.MAX_SAFE_INTEGER + 1]) {
    const result = parseCell(2, value)
    assert.equal(result.error.code, 'INVALID_ROWS')
    assert.deepEqual(result.error.issues.map(({ row, column, field }) => ({ row, column, field })), [{ row: 2, column: 3, field: 'age' }])
  }
})

test('rejects malformed, empty, nonfinite and unsupported-locale currency values', () => {
  for (const value of ['', ' ', null, true, Infinity, NaN, 'NaN', '1,2,3', '$12,34.56', '$1.234,56', '12.3.4', '€100', 'USD 100 USD', '12e3', '0x10', '$.50', '123.456']) {
    const result = parseCell(5, value)
    assert.equal(result.error.code, 'INVALID_ROWS')
    assert.equal(result.error.issues[0].field, 'netWorth')
  }
})

test('distinguishes an empty spreadsheet and a header-only range', () => {
  for (const values of [[], [[]], [[], []], [[null, ' \u00a0 ']], [[null], [' \u202f ']], [sheetHeaders]]) {
    assert.equal(parseSheetValues(values).error.code, 'EMPTY_SPREADSHEET')
  }
  assert.equal(parseGoogleSheetsResponse({ range: 'Sheet1!A1:F201', majorDimension: 'ROWS' }).error.code, 'EMPTY_SPREADSHEET')
})

test('blank rows and omitted trailing cells produce row-specific errors without partial data', () => {
  const result = parseSheetValues([sheetHeaders, generatedSheetRow(), [], generatedSheetRow(1).slice(0, 5), generatedSheetRow(2)])
  assert.equal(result.error.code, 'INVALID_ROWS')
  assert.equal(Object.hasOwn(result, 'records'), false)
  assert.equal(result.error.issues.filter(({ row }) => row === 3).length, 6)
  assert.deepEqual(result.error.issues.filter(({ row }) => row === 4).map(({ field }) => field), ['netWorth'])
})

test('requires nonempty text for name, country and interest', () => {
  for (const column of [0, 3, 4]) {
    for (const value of [' \u00a0\u202f ', null, 123, false]) {
      assert.equal(parseCell(column, value).error.code, 'INVALID_ROWS')
    }
  }
})

test('normalizes surrounding/common nonbreaking spaces in data and grouped currency', () => {
  const result = parseSheetValues([sheetHeaders, [
    '\u00a0Generated\u202frow\u00a0', '\u00a0https://images.example.test/a.jpg\u202f', '\u00a030\u202f',
    '\u202fTest Country\u00a0', '\u00a0Test Interest\u202f', '\u00a0$251\u202f260.80\u00a0',
  ]])
  assert.equal(result.ok, true)
  assert.deepEqual(result.records[0], {
    name: 'Generated row', photo: 'https://images.example.test/a.jpg', age: 30,
    country: 'Test Country', interest: 'Test Interest', netWorth: 251260.8,
  })
})

test('preserves the exact input record order without sorting or deduplicating', () => {
  const order = [8, 2, 8, 1]
  const result = parseSheetValues([sheetHeaders, ...order.map(generatedSheetRow)])
  assert.equal(result.ok, true)
  assert.deepEqual(result.records.map(({ name }) => name), order.map((index) => `Generated row ${index}`))
})

test('parses a generated 200-row fixture plus header into exactly 200 ordered records', () => {
  const result = parseGoogleSheetsResponse({ range: 'Sheet1!A1:F201', majorDimension: 'ROWS', values: generatedSheetValues(200) })
  assert.equal(result.ok, true)
  assert.equal(result.records.length, 200)
  result.records.forEach((record, index) => {
    assert.equal(record.name, `Generated row ${index}`)
    assert.equal(record.netWorth, 251260.8 + index)
  })
})

test('rejects unexpected response shapes and column-major output', () => {
  for (const value of [null, undefined, {}, 'csv text', [null], [42], [[{}]], [[[]]], [[undefined]]]) {
    assert.equal(parseSheetValues(value).error.code, 'UNEXPECTED_RESPONSE_SHAPE')
  }
  for (const value of [null, [], {}, { error: {} }, { values: {} }, { values: null }, { values: undefined }, { range: 123 }, { majorDimension: 'COLUMNS', values: generatedSheetValues() }]) {
    assert.equal(parseGoogleSheetsResponse(value).error.code, 'UNEXPECTED_RESPONSE_SHAPE')
  }
})

test('accepts absolute HTTPS image links, including signed query parameters', () => {
  for (const value of ['https://images.example.test/a.jpg', 'HTTPS://IMAGES.EXAMPLE.TEST/a.png?size=96&signature=test%2Bvalue', 'https://images.example.test/image?id=123']) {
    const result = parseCell(1, value)
    assert.equal(result.ok, true)
    assert.equal(result.records[0].photo, new URL(value).href)
  }
})

test('rejects unsafe, relative, malformed and credential-bearing photo URLs', () => {
  for (const value of ['', null, false, '/a.jpg', '//images.example.test/a.jpg', 'http://images.example.test/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'file:///a.jpg', 'https:images.example.test/a.jpg', 'https://', 'https://[bad]/a.jpg', 'https://user:pass@images.example.test/a.jpg', 'https://images.example.test/a b.jpg', 'https://images.\nexample.test/a.jpg']) {
    const result = parseCell(1, value)
    assert.equal(result.error.code, 'INVALID_ROWS')
    assert.equal(result.error.issues[0].field, 'photo')
  }
})

test('keeps user text as literal strings that React text content escapes', () => {
  const text = '<img src=x onerror="alert(1)"> & sample'
  const result = parseCell(0, text)
  assert.equal(result.records[0].name, text)
  const markup = renderToStaticMarkup(createElement('span', null, result.records[0].name))
  assert.ok(markup.includes('&lt;img'))
  assert.ok(!markup.includes('<img'))
})
