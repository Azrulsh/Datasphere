import './helpers/tsx.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { parseSheetValues } from '../src/data/parseSheetValues.ts'
import { formatNetWorth } from '../src/utils/netWorth.ts'
import { generatedSheetValues } from './fixtures/sheets.mjs'

const { DataTile } = await import('../src/components/visualization/DataTile.tsx')

test('all 200 parsed profiles map in order to tiles with all six fields', () => {
  const result = parseSheetValues(generatedSheetValues(200))
  assert.equal(result.ok, true)
  const tiles = result.records.map((person, index) => {
    const html = renderToStaticMarkup(createElement(DataTile, { person, index }))
    for (const value of [person.name, person.photo, `${person.age} years`, person.country, person.interest, formatNetWorth(person.netWorth)]) {
      assert.ok(html.includes(value), `row ${index}: ${value}`)
    }
    assert.ok(html.includes(`aria-label="${person.name}, profile ${index + 1}"`))
    assert.ok(html.includes(`alt="${person.name} portrait"`))
    return html
  })
  assert.equal(tiles.length, 200)
  assert.equal(tiles.join('').match(/<article /g).length, 200)
  assert.ok(tiles[0].includes('Generated row 0'))
  assert.ok(tiles[199].includes('Generated row 199'))
})

test('rendered wealth classes include both equality boundaries', () => {
  const result = parseSheetValues(generatedSheetValues(1))
  for (const [netWorth, tier] of [[99_999, 'red'], [100_000, 'orange'], [200_000, 'orange'], [200_001, 'green']]) {
    const html = renderToStaticMarkup(createElement(DataTile, { person: { ...result.records[0], netWorth }, index: 0 }))
    assert.ok(html.includes(`tier-${tier}`))
    assert.ok(html.includes(formatNetWorth(netWorth)))
  }
})

test('untrusted text stays escaped and long fields retain full accessible text', () => {
  const values = generatedSheetValues(1)
  values[1][0] = '<script>alert(1)</script>'
  values[1][3] = 'A very long country name '.repeat(10).trim()
  const result = parseSheetValues(values)
  assert.equal(result.ok, true)
  const html = renderToStaticMarkup(createElement(DataTile, { person: result.records[0], index: 0 }))
  assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('&lt;script&gt;'))
  assert.ok(html.includes(`title="${values[1][2]} years · ${values[1][3]}"`))
  assert.match(html, /class="mt-1 truncate text-sm/)
  assert.match(html, /class="worth-value mt-1 truncate/)
})
