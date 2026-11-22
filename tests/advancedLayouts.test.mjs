import assert from 'node:assert/strict'
import test from 'node:test'
import { createLayoutTargets } from '../src/layouts/layoutTargets.ts'
import { sphereLayout } from '../src/layouts/sphereLayout.ts'
import { helixLayout, HELIX_RADIUS, HELIX_ANGLE_STEP, HELIX_VERTICAL_SPACING } from '../src/layouts/helixLayout.ts'
import { gridLayout, GRID_DEPTH_SPACING } from '../src/layouts/gridLayout.ts'
import { COLUMN_SPACING, ROW_SPACING, TILE_WIDTH, TILE_HEIGHT } from '../src/layouts/tableLayout.ts'

const names = ['table', 'sphere', 'helix', 'grid']
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`)
const length = ({ x, y, z }) => Math.hypot(x, y, z)
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

for (const name of names) {
  test(`${name}: finite, unique coordinates and unit normals for 1, 3, 40 and 200 records`, () => {
    for (const count of [1, 3, 40, 200]) {
      const targets = createLayoutTargets(name, count)
      assert.equal(targets.length, count)
      assert.equal(new Set(targets.map(({ position: p }) => `${p.x},${p.y},${p.z}`)).size, count)
      for (const { position, normal } of targets) {
        assert.ok([...Object.values(position), ...Object.values(normal)].every(Number.isFinite))
        near(length(normal), 1)
      }
    }
  })
}

test('all layouts handle empty data and reject malformed counts', () => {
  for (const name of names) {
    assert.deepEqual(createLayoutTargets(name, 0), [])
    for (const count of [-1, 1.5, NaN, Infinity]) {
      assert.throws(() => createLayoutTargets(name, count), RangeError)
    }
  }
})

test('sphere: constant radius, outward normals and equal-area vertical distribution', () => {
  for (const count of [40, 200]) {
    const targets = sphereLayout(count)
    const radius = length(targets[0].position)
    for (let index = 0; index < count; index++) {
      const { position, normal } = targets[index]
      near(length(position), radius)
      near(position.x / radius, normal.x)
      near(position.y / radius, normal.y)
      near(position.z / radius, normal.z)
      near(normal.y, 1 - 2 * (index + 0.5) / count)
    }
    near(targets.reduce((sum, { position }) => sum + position.y, 0), 0)
  }
  assert.ok(length(sphereLayout(200)[0].position) > length(sphereLayout(40)[0].position))
})

test('sphere and helix: card bounding spheres do not intersect at final positions', () => {
  const diagonal = Math.hypot(TILE_WIDTH, TILE_HEIGHT)
  for (const layout of [sphereLayout, helixLayout]) {
    for (const count of [3, 40, 200]) {
      const targets = layout(count)
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          assert.ok(distance(targets[i].position, targets[j].position) > diagonal)
        }
      }
    }
  }
})

test('double helix: 100 paired levels with two strands separated by exactly 180 degrees', () => {
  const targets = helixLayout(200)
  assert.equal(new Set(targets.map(({ position }) => position.y)).size, 100)
  for (let level = 0; level < 100; level++) {
    const a = targets[level * 2]
    const b = targets[level * 2 + 1]
    near(a.position.x, -b.position.x)
    near(a.position.z, -b.position.z)
    near(a.position.y, b.position.y)
    near(a.normal.x * b.normal.x + a.normal.z * b.normal.z, -1)
    near(Math.hypot(a.position.x, a.position.z), HELIX_RADIUS)
    near(a.normal.y, 0)
    near(a.position.x / HELIX_RADIUS, a.normal.x)
    near(a.position.z / HELIX_RADIUS, a.normal.z)
    if (level > 0) {
      const previous = targets[(level - 1) * 2]
      near(previous.position.y - a.position.y, HELIX_VERTICAL_SPACING)
      near(previous.normal.x * a.normal.x + previous.normal.z * a.normal.z, Math.cos(HELIX_ANGLE_STEP))
    }
  }
  near(targets[0].position.y + targets.at(-1).position.y, 0)
})

test('double helix: odd counts keep the last record, paired spacing and centered vertical bounds', () => {
  const targets = helixLayout(41)
  assert.equal(targets.length, 41)
  near(targets[0].position.y + targets.at(-1).position.y, 0)
  assert.equal(new Set(targets.map(({ position }) => position.y)).size, 21)
})

test('grid: exactly X=5, Y=4, Z=10, all centered for 200 indices', () => {
  const targets = gridLayout(200)
  for (const [axis, dimension, spacing] of [['x', 5, COLUMN_SPACING], ['y', 4, ROW_SPACING], ['z', 10, GRID_DEPTH_SPACING]]) {
    const values = [...new Set(targets.map(({ position }) => position[axis]))].sort((a, b) => a - b)
    assert.equal(values.length, dimension)
    near(values[0] + values.at(-1), 0)
    for (let index = 1; index < values.length; index++) near(values[index] - values[index - 1], spacing)
  }
  assert.equal(new Set(targets.map(({ position }) => `${position.x},${position.y},${position.z}`)).size, 200)
  assert.equal(targets[1].position.x - targets[0].position.x, COLUMN_SPACING)
  assert.equal(targets[0].position.y - targets[5].position.y, ROW_SPACING)
  assert.equal(targets[0].position.z - targets[20].position.z, GRID_DEPTH_SPACING)
})

test('grid: 40 indices use two depth layers and partial grids stay centered in occupied bounds', () => {
  assert.equal(new Set(gridLayout(40).map(({ position }) => position.z)).size, 2)
  assert.deepEqual(gridLayout(1)[0].position, { x: 0, y: 0, z: 0 })
  const targets = gridLayout(6)
  for (const axis of ['x', 'y', 'z']) {
    const values = targets.map(({ position }) => position[axis])
    near(Math.min(...values) + Math.max(...values), 0)
  }
})
