import assert from 'node:assert/strict'
import test from 'node:test'
import { COLUMN_SPACING, ROW_SPACING, tablePosition } from '../src/layouts/tableLayout.ts'

test('200 records occupy a centered 20 by 10 table', () => {
  const positions = Array.from({ length: 200 }, (_, index) => tablePosition(index, 200))
  assert.equal(new Set(positions.map(({ x }) => x)).size, 20)
  assert.equal(new Set(positions.map(({ y }) => y)).size, 10)
  assert.equal(new Set(positions.map(({ x, y }) => `${x},${y}`)).size, 200)
  assert.deepEqual(positions[0], { x: -9.5 * COLUMN_SPACING, y: 4.5 * ROW_SPACING, z: 0 })
  assert.deepEqual(positions[199], { x: 9.5 * COLUMN_SPACING, y: -4.5 * ROW_SPACING, z: 0 })
})

test('index 20 wraps into the next row', () => {
  assert.equal(tablePosition(20, 40).x, tablePosition(0, 40).x)
  assert.equal(tablePosition(0, 40).y - tablePosition(20, 40).y, ROW_SPACING)
})

test('small and partial tables remain centered within occupied bounds', () => {
  assert.deepEqual(tablePosition(0, 1), { x: 0, y: 0, z: 0 })
  assert.equal(tablePosition(0, 3).x, -COLUMN_SPACING)
  assert.equal(tablePosition(2, 3).x, COLUMN_SPACING)
  assert.equal(tablePosition(20, 21).y, -ROW_SPACING / 2)
})

test('invalid indices and counts are rejected', () => {
  for (const [index, count] of [[0, 0], [-1, 20], [20, 20], [0.5, 20], [0, 1.5]]) {
    assert.throws(() => tablePosition(index, count), RangeError)
  }
})
