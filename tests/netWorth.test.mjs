import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyNetWorth, formatNetWorth } from '../src/utils/netWorth.ts'

test('net worth thresholds include both endpoints in orange', () => {
  for (const [value, expected] of [
    [-1, 'red'], [0, 'red'], [99_999.99, 'red'],
    [100_000, 'orange'], [150_000, 'orange'], [200_000, 'orange'],
    [200_000.01, 'green'], [1_000_000, 'green'],
  ]) assert.equal(classifyNetWorth(value), expected)
})

test('invalid numbers never silently become green', () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.throws(() => classifyNetWorth(value), RangeError)
  }
})

test('net worth uses US dollars with grouping', () => {
  assert.equal(formatNetWorth(125_000), '$125,000')
  assert.equal(formatNetWorth(99_999.99), '$99,999.99')
  assert.equal(formatNetWorth(200_000.01), '$200,000.01')
})
