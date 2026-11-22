// Real Three.js classes with a small synthetic DOM; these are not browser tests.
import './helpers/tsx.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { Frustum, Matrix4, Object3D, PerspectiveCamera, Scene, Vector3 } from 'three'
import { createLayoutTargets } from '../src/layouts/layoutTargets.ts'

const { createVisualizationScene } = await import('../src/components/visualization/createVisualizationScene.ts')

class TrackedTarget extends EventTarget {
  listeners = new Map()
  addEventListener(type, callback, options) {
    super.addEventListener(type, callback, options)
    const key = `${type}:${typeof options === 'boolean' ? options : !!options?.capture}`
    if (!this.listeners.has(key)) this.listeners.set(key, new Set())
    this.listeners.get(key).add(callback)
  }
  removeEventListener(type, callback, options) {
    super.removeEventListener(type, callback, options)
    const key = `${type}:${typeof options === 'boolean' ? options : !!options?.capture}`
    this.listeners.get(key)?.delete(callback)
  }
  get listenerCount() { return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0) }
}

class Element extends TrackedTarget {
  style = {}
  children = []
  parentNode = null
  clientWidth = 1200
  clientHeight = 600
  constructor(ownerDocument) { super(); this.ownerDocument = ownerDocument }
  setAttribute() {}
  appendChild(child) {
    child.remove()
    child.parentNode = this
    this.children.push(child)
    return child
  }
  remove() {
    if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((child) => child !== this)
    this.parentNode = null
  }
  getBoundingClientRect() { return { width: this.clientWidth, height: this.clientHeight, left: 0, top: 0 } }
}

function environment(t, reducedMotion) {
  const elements = []
  const document = new TrackedTarget()
  document.defaultView = { Element }
  document.createElement = () => {
    const element = new Element(document)
    elements.push(element)
    return element
  }
  const frames = new Map()
  const observers = []
  let nextFrame = 0
  t.mock.method(globalThis, 'requestAnimationFrame', (callback) => { frames.set(++nextFrame, callback); return nextFrame })
  t.mock.method(globalThis, 'cancelAnimationFrame', (id) => frames.delete(id))
  return { document, elements, frames, observers, reducedMotion }
}

function setup(t, reducedMotion) {
  for (const name of ['requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver']) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name)
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: function () {} })
    t.after(() => { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name] })
  }
  const env = environment(t, reducedMotion)
  for (const [name, value] of Object.entries({ document: env.document, window: { matchMedia: () => ({ matches: reducedMotion }) } })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name)
    Object.defineProperty(globalThis, name, { configurable: true, value })
    t.after(() => { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name] })
  }
  globalThis.ResizeObserver = class {
    disconnected = false
    constructor(callback) { this.callback = callback; env.observers.push(this) }
    observe() {}
    disconnect() { this.disconnected = true }
  }
  env.host = env.document.createElement('div')
  env.cards = Array.from({ length: 200 }, () => env.document.createElement('div'))
  let scene
  let camera
  let renders = 0
  const updateProjectionMatrix = PerspectiveCamera.prototype.updateProjectionMatrix
  t.mock.method(PerspectiveCamera.prototype, 'updateProjectionMatrix', function () {
    camera = this
    return updateProjectionMatrix.call(this)
  })
  t.mock.method(Scene.prototype, 'updateMatrixWorld', function (...args) {
    scene = this
    renders++
    return Object3D.prototype.updateMatrixWorld.apply(this, args)
  })
  return { ...env, get scene() { return scene }, get camera() { return camera }, get renders() { return renders } }
}

function assertFramed(env) {
  const frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(env.camera.projectionMatrix, env.camera.matrixWorldInverse))
  for (const object of env.scene.children) {
    for (const x of [-112, 112]) for (const y of [-140, 140]) {
      assert.ok(frustum.containsPoint(new Vector3(x, y, 0).applyMatrix4(object.matrixWorld)))
    }
  }
}

test('200 objects survive repeated layouts; camera actions render once and resize/cleanup work', (t) => {
  const env = setup(t, true)
  const api = createVisualizationScene(env.host, env.cards)
  t.after(() => api.dispose())
  const objects = [...env.scene.children]
  assert.equal(objects.length, 200)
  assert.equal(env.host.children.length, 1)
  for (let round = 0; round < 10; round++) {
    for (const layout of ['sphere', 'helix', 'grid', 'table']) {
      api.setLayout(layout)
      const targets = createLayoutTargets(layout, 200)
      assert.deepEqual(env.scene.children, objects)
      objects.forEach((object, index) => {
        assert.ok(object.position.distanceTo(new Vector3(...Object.values(targets[index].position))) < 1e-8)
        const normal = new Vector3(0, 0, 1).applyQuaternion(object.quaternion)
        assert.ok(normal.distanceTo(new Vector3(...Object.values(targets[index].normal))) < 1e-8)
        assert.ok(object.matrixWorld.elements.every(Number.isFinite))
      })
      assert.equal(env.frames.size, 0)
      if (round === 0) { api.fitAll(); assertFramed(env) }
    }
  }
  for (const action of [() => api.zoom(0.8), api.reset, api.reset, api.fitAll]) {
    const before = env.renders
    action()
    assert.equal(env.renders - before, 1)
  }
  env.host.clientWidth = 360
  env.host.clientHeight = 640
  env.observers[0].callback()
  assert.equal(env.host.children[0].style.width, '360px')
  assert.equal(env.host.children[0].style.height, '640px')
  for (const layout of ['sphere', 'helix', 'grid', 'table']) {
    api.setLayout(layout)
    api.fitAll()
    assertFramed(env)
  }
  env.host.clientWidth = 0
  const before = env.renders
  env.observers[0].callback()
  assert.equal(env.renders, before)
  api.dispose()
  assert.equal(env.host.children.length, 0)
  assert.equal(env.scene.children.length, 0)
  assert.ok(env.observers.every((observer) => observer.disconnected))
  assert.equal(env.document.listenerCount, 0)
  assert.ok(env.elements.every((element) => element.listenerCount === 0))
})

test('rapid switching keeps one frame chain and teardown/remount removes all scene resources', (t) => {
  const env = setup(t, false)
  for (let mount = 0; mount < 3; mount++) {
    const api = createVisualizationScene(env.host, env.cards)
    assert.equal(env.host.children.length, 1)
    for (const layout of ['sphere', 'helix', 'grid', 'table', 'sphere']) {
      api.setLayout(layout)
      assert.equal(env.frames.size, 1)
    }
    api.dispose()
    assert.equal(env.frames.size, 0)
    assert.equal(env.host.children.length, 0)
    assert.equal(env.scene.children.length, 0)
    assert.equal(env.document.listenerCount, 0)
    assert.ok(env.elements.every((element) => element.listenerCount === 0))
  }
  assert.ok(env.observers.every((observer) => observer.disconnected))
})
