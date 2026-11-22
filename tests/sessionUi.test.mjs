import './helpers/tsx.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const { default: App } = await import('../src/App.tsx')
const { AppLayout } = await import('../src/components/layout/AppLayout.tsx')
const { SessionPanel } = await import('../src/components/auth/SessionPanel.tsx')
const { sessionView } = await import('../src/auth/sessionView.ts')

const controller = { renderSignInButton: () => {}, restart: () => {}, refresh: () => {}, authorize: () => {} }
const base = { status: 'signed-out', user: null, records: [], authorized: false, error: null, notice: null }

test('missing configuration renders actionable settings with branding and no sample cards', () => {
  const markup = renderToStaticMarkup(createElement(App))
  assert.match(markup, /DataSphere/)
  assert.match(markup, /VITE_GOOGLE_CLIENT_ID/)
  assert.match(markup, /VITE_GOOGLE_SHEET_ID/)
  assert.match(markup, /VITE_GOOGLE_SHEET_RANGE/)
  assert.ok(!markup.includes('data-tile'))
  assert.ok(!markup.includes('Local sample dataset'))
})

test('signed-out and signed-in panels expose distinct identity and Sheets authorization actions', () => {
  const signedOut = renderToStaticMarkup(createElement(SessionPanel, { snapshot: base, controller }))
  assert.match(signedOut, /Sign in with Google/)
  assert.match(signedOut, /read-only access/)
  const signedIn = renderToStaticMarkup(createElement(SessionPanel, { snapshot: { ...base, user: { id: 'test-user' }, status: 'signed-in' }, controller }))
  assert.match(signedIn, /Connect Google Sheets/)
  assert.ok(!signedIn.includes('aria-label="Sign in with Google"'))
})

test('validation details are rendered safely as actionable text with retry controls', () => {
  const snapshot = {
    ...base, user: { id: 'test-user' }, status: 'data-error', authorized: true,
    error: { message: 'Fix spreadsheet rows.', details: ['Row 2, column 3 (age): <invalid>'] },
  }
  const markup = renderToStaticMarkup(createElement(SessionPanel, { snapshot, controller }))
  assert.match(markup, /role="alert"/)
  assert.match(markup, /Row 2, column 3/)
  assert.match(markup, /&lt;invalid&gt;/)
  assert.match(markup, /Retry loading data/)
})

test('live data source badge identifies the expected 200 records without fixture labels', () => {
  const view = sessionView({ ...base, status: 'ready', user: { id: 'test-user' }, records: Array.from({ length: 200 }, () => ({})) })
  const markup = renderToStaticMarkup(createElement(AppLayout, { sourceLabel: view.sourceLabel, sourceDetail: view.countLabel }, 'Visualization slot'))
  assert.match(markup, /Google Sheets/)
  assert.match(markup, /Expected 200 loaded/)
  assert.ok(!markup.includes('fictional'))
  assert.ok(!markup.includes('Portraits are placeholders'))
})
