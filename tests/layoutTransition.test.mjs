import assert from 'node:assert/strict'
import test from 'node:test'
import { Object3D, Vector3 } from 'three'
import { createLayoutTransition } from '../src/components/visualization/layoutTransition.ts'

function frameScheduler() {
  let time = 0
  let id = 0
  const pending = new Map()
  return {
    request: (callback) => { pending.set(++id, callback); return id },
    cancel: (frame) => pending.delete(frame),
    now: () => time,
    get size() { return pending.size },
    step(nextTime) {
      time = nextTime
      const callbacks = [...pending.values()]
      pending.clear()
      callbacks.forEach((callback) => callback(time))
    },
  }
}

test('transition interpolates position/orientation and stops requesting frames at completion', () => {
  const frames = frameScheduler()
  const card = new Object3D()
  const target = new Object3D()
  target.position.set(100, 200, -100)
  target.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI)
  let renders = 0
  const transition = createLayoutTransition([card], () => renders++, frames)
  transition.start([target], 1000)
  assert.equal(frames.size, 1)
  frames.step(500)
  assert.deepEqual(card.position.toArray(), [50, 100, -50])
  assert.ok(Math.abs(card.quaternion.angleTo(target.quaternion) - Math.PI / 2) < 1e-8)
  frames.step(1000)
  assert.deepEqual(card.position.toArray(), target.position.toArray())
  assert.ok(card.quaternion.angleTo(target.quaternion) < 1e-8)
  assert.equal(frames.size, 0)
  assert.equal(renders, 2)
})

test('rapid switching cancels the old frame chain and starts from the current pose', () => {
  const frames = frameScheduler()
  const card = new Object3D()
  const a = new Object3D()
  const b = new Object3D()
  a.position.x = 100
  b.position.x = -100
  const transition = createLayoutTransition([card], () => {}, frames)
  transition.start([a], 1000)
  frames.step(500)
  transition.start([b], 1000)
  assert.equal(card.position.x, 50)
  assert.equal(frames.size, 1)
  frames.step(1000)
  assert.equal(card.position.x, -25)
  frames.step(1500)
  assert.equal(card.position.x, -100)
  assert.equal(frames.size, 0)
})

test('disposing during a transition removes pending frames and prevents a new loop', () => {
  const frames = frameScheduler()
  const card = new Object3D()
  const target = new Object3D()
  target.position.x = 100
  let renders = 0
  const transition = createLayoutTransition([card], () => renders++, frames)
  transition.start([target], 1000)
  transition.dispose()
  frames.step(2000)
  assert.equal(frames.size, 0)
  assert.equal(renders, 0)
  transition.start([target], 1000)
  assert.equal(frames.size, 0)
})

test('zero-duration transitions honor reduced motion without scheduling animation', () => {
  const frames = frameScheduler()
  const card = new Object3D()
  const target = new Object3D()
  target.position.x = 100
  let progress = 0
  createLayoutTransition([card], () => {}, frames).start([target], 0, (value) => { progress = value })
  assert.equal(card.position.x, 100)
  assert.equal(progress, 1)
  assert.equal(frames.size, 0)
})
