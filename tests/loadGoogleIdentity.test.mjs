import assert from 'node:assert/strict'
import test from 'node:test'
import { loadGoogleIdentity, GOOGLE_IDENTITY_SCRIPT } from '../src/auth/loadGoogleIdentity.ts'
import { mockGoogleIdentity } from './fixtures/googleIdentity.mjs'

test('GIS script loading is shared, retries after failure and removes settled event listeners', async (t) => {
  const oldWindow = globalThis.window
  const oldDocument = globalThis.document
  const scripts = []
  class Script extends EventTarget {
    listeners = new Set()
    addEventListener(type, listener) { this.listeners.add(type); super.addEventListener(type, listener) }
    removeEventListener(type, listener) { this.listeners.delete(type); super.removeEventListener(type, listener) }
    remove() { this.removed = true }
  }
  globalThis.window = {}
  globalThis.document = { createElement: () => new Script(), head: { appendChild: (script) => scripts.push(script) } }
  t.after(() => {
    if (oldWindow === undefined) delete globalThis.window
    else globalThis.window = oldWindow
    if (oldDocument === undefined) delete globalThis.document
    else globalThis.document = oldDocument
  })
  const first = loadGoogleIdentity()
  assert.equal(loadGoogleIdentity(), first)
  assert.equal(scripts.length, 1)
  assert.equal(scripts[0].src, GOOGLE_IDENTITY_SCRIPT)
  const failed = assert.rejects(first)
  scripts[0].dispatchEvent(new Event('error'))
  await failed
  assert.equal(scripts[0].removed, true)
  assert.equal(scripts[0].listeners.size, 0)
  const retry = loadGoogleIdentity()
  assert.equal(scripts.length, 2)
  const { google } = mockGoogleIdentity()
  globalThis.window.google = google
  scripts[1].dispatchEvent(new Event('load'))
  assert.equal(await retry, google)
  assert.equal(scripts[1].listeners.size, 0)
  assert.equal(await loadGoogleIdentity(), google)
  assert.equal(scripts.length, 2)
})
