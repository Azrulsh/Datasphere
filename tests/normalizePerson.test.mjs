import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizePerson } from '../src/data/normalizePerson.ts'

const row = { Name: ' Sample Person ', Photo: ' /portrait.jpg ', Age: ' 30 ', Country: ' Malaysia ', Interest: ' Art ', ' Net Worth ': ' $200,000.50 ' }

test('normalizes original spaced CSV headers and numeric values', () => {
  assert.deepEqual(normalizePerson(row), {
    name: 'Sample Person', photo: '/portrait.jpg', age: 30,
    country: 'Malaysia', interest: 'Art', netWorth: 200_000.5,
  })
})

test('rejects missing or malformed required numeric values', () => {
  for (const changes of [{ Name: ' ' }, { Age: '' }, { Age: '30 years' }, { Age: '-1' }, { ' Net Worth ': '' }, { ' Net Worth ': 'unknown' }]) {
    assert.throws(() => normalizePerson({ ...row, ...changes }))
  }
})
