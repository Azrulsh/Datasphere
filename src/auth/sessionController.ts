import { createGoogleIdentityClient, GoogleIdentityError } from './googleIdentity.ts'
import { loadGoogleIdentity } from './loadGoogleIdentity.ts'
import { createGoogleSheetsReader } from '../services/googleSheets.ts'
import type { AppConfig } from '../config/appConfig'
import type { GoogleIdentityServices, GoogleUser, IdentityClient, IdentityHandlers, OAuthGrant } from '../types/googleIdentity'
import type { GoogleSheetsReader, SheetsReadResult } from '../types/googleSheets'
import type { Person } from '../types/person'

export type SessionStatus = 'gis-loading' | 'gis-error' | 'signed-out' | 'signed-in' | 'authorizing'
  | 'authorization-error' | 'loading' | 'ready' | 'empty' | 'data-error' | 'permission-denied' | 'expired'

export interface SessionIssue { message: string; details?: string[] }
export interface SessionSnapshot {
  status: SessionStatus
  user: GoogleUser | null
  records: readonly Person[]
  authorized: boolean
  error: SessionIssue | null
  notice: string | null
}

interface Dependencies {
  loadIdentity?: () => Promise<GoogleIdentityServices>
  makeIdentityClient?: (clientId: string, google: GoogleIdentityServices, handlers: IdentityHandlers) => IdentityClient
  reader?: GoogleSheetsReader
  now?: () => number
  scheduleExpiry?: (callback: () => void, milliseconds: number) => () => void
}

const initialState = (): SessionSnapshot => ({ status: 'gis-loading', user: null, records: [], authorized: false, error: null, notice: null })

function dataIssue(result: Extract<SheetsReadResult, { ok: false }>): SessionIssue {
  const error = result.error
  if (error.code === 'INVALID_ROWS') return {
    message: error.message,
    details: error.issues.map(({ row, column, field, message }) => `Row ${row}, column ${column} (${field}): ${message}`),
  }
  if (error.code === 'INVALID_CONFIGURATION') return { message: error.message, details: error.issues.map(({ message }) => message) }
  return { message: error.message }
}

/** Framework-independent state machine. Tokens never enter the public snapshot. */
export function createSessionController(config: AppConfig, dependencies: Dependencies = {}) {
  const reader = dependencies.reader ?? createGoogleSheetsReader(config.sheet)
  const now = dependencies.now ?? Date.now
  const scheduleExpiry = dependencies.scheduleExpiry ?? ((callback, milliseconds) => {
    const timer = setTimeout(callback, milliseconds)
    return () => clearTimeout(timer)
  })
  let snapshot = initialState()
  const subscribers = new Set<() => void>()
  let active = false
  let lifecycle = 0
  let authVersion = 0
  let readVersion = 0
  let identity: IdentityClient | null = null
  let grant: OAuthGrant | null = null
  let request: AbortController | null = null
  let cancelExpiry: (() => void) | null = null

  const publish = (patch: Partial<SessionSnapshot>) => {
    snapshot = { ...snapshot, ...patch }
    if (active) subscribers.forEach((notify) => notify())
  }
  const cancelRead = () => { readVersion++; request?.abort(); request = null }
  const clearGrant = () => { grant = null; cancelExpiry?.(); cancelExpiry = null }
  const usableGrant = () => grant !== null && grant.expiresAt > now() + 15_000
  const expire = () => {
    clearGrant()
    cancelRead()
    publish({ status: 'expired', records: [], authorized: false, error: { message: 'Your Google Sheets authorization expired. Authorize again to reload the data.' }, notice: null })
  }

  const loadData = async () => {
    if (!active || !snapshot.user || snapshot.status === 'loading') return
    if (!usableGrant()) { expire(); return }
    const token = grant!.accessToken
    const version = ++readVersion
    const currentLifecycle = lifecycle
    const abort = new AbortController()
    request = abort
    publish({ status: 'loading', authorized: true, error: null, notice: null })
    let result: SheetsReadResult
    try { result = await reader.readProfiles(token, abort.signal) }
    catch { result = { ok: false, error: { code: 'NETWORK_ERROR', message: 'The spreadsheet could not be loaded. Check your connection and retry.' } } }
    if (!active || currentLifecycle !== lifecycle || version !== readVersion || abort.signal.aborted) return
    request = null
    if (result.ok === true) {
      publish({ status: 'ready', records: result.records, authorized: true, error: null })
      return
    }
    if (result.error.code === 'HTTP_ERROR' && result.error.status === 401) { expire(); return }
    const status: SessionStatus = result.error.code === 'EMPTY_SPREADSHEET' ? 'empty'
      : result.error.code === 'HTTP_ERROR' && result.error.status === 403 ? 'permission-denied' : 'data-error'
    publish({ status, records: [], error: dataIssue(result) })
  }

  const start = () => {
    if (active) return
    active = true
    const version = ++lifecycle
    publish(initialState())
    void (async () => {
      try {
        const google = await (dependencies.loadIdentity ?? loadGoogleIdentity)()
        if (!active || version !== lifecycle) return
        identity = (dependencies.makeIdentityClient ?? createGoogleIdentityClient)(config.clientId, google, {
          onSignInStart: () => {
            if (!active || version !== lifecycle || snapshot.user) return
            publish({ status: 'signed-out', error: null, notice: 'Complete sign-in with Google. If you close or cancel the dialog, select the Google button again.' })
          },
          onUser: (user) => {
            if (!active || version !== lifecycle) return
            authVersion++
            cancelRead()
            clearGrant()
            identity?.cancelAuthorization()
            publish({ status: 'signed-in', user, records: [], authorized: false, error: null, notice: null })
          },
          onError: () => {
            if (!active || version !== lifecycle || snapshot.user) return
            publish({ status: 'signed-out', error: { message: 'Google sign-in did not complete. Try the Google button again and check your browser’s sign-in settings.' }, notice: null })
          },
        })
        publish({ status: 'signed-out', error: null })
      } catch {
        if (!active || version !== lifecycle) return
        publish({ status: 'gis-error', error: { message: 'Google Identity Services is unavailable. Check your connection, content blockers and browser settings, then retry.' } })
      }
    })()
  }

  const stop = () => {
    active = false
    lifecycle++
    authVersion++
    cancelRead()
    clearGrant()
    identity?.dispose()
    identity = null
    snapshot = initialState()
  }

  const authorize = () => {
    if (!active || !identity || !snapshot.user || ['authorizing', 'loading'].includes(snapshot.status)) return
    const version = ++authVersion
    const currentLifecycle = lifecycle
    const userId = snapshot.user.id
    clearGrant()
    cancelRead()
    publish({ status: 'authorizing', records: [], authorized: false, error: null, notice: null })
    // Do not await SDK loading here: requestAccessToken must run within the click.
    let pending: Promise<OAuthGrant>
    try { pending = identity.authorize(snapshot.user) }
    catch { pending = Promise.reject(new Error()) }
    void pending.then((response) => {
      if (!active || version !== authVersion || currentLifecycle !== lifecycle || snapshot.user?.id !== userId) return
      grant = response
      if (!usableGrant()) { expire(); return }
      cancelExpiry = scheduleExpiry(() => {
        if (active && version === authVersion && currentLifecycle === lifecycle) expire()
      }, response.expiresAt - now() - 15_000)
      void loadData()
    }).catch((error: unknown) => {
      if (!active || version !== authVersion || currentLifecycle !== lifecycle) return
      publish({ status: 'authorization-error', authorized: false, records: [], error: {
        message: error instanceof GoogleIdentityError ? error.message : 'Google Sheets authorization could not complete. Connect again to retry.',
      } })
    })
  }

  return {
    start,
    stop,
    restart: () => { stop(); start() },
    getSnapshot: () => snapshot,
    subscribe: (notify: () => void) => { subscribers.add(notify); return () => { subscribers.delete(notify) } },
    renderSignInButton: (element: HTMLElement) => {
      if (!active || !identity) return
      try { identity.renderButton(element) }
      catch { publish({ status: 'gis-error', error: { message: 'The Google sign-in button could not be displayed. Reload the Google service and try again.' } }) }
    },
    authorize,
    refresh: () => {
      if (!active || ['loading', 'authorizing'].includes(snapshot.status)) return
      if (usableGrant()) void loadData()
      else authorize()
    },
    signOut: () => {
      const token = grant?.accessToken
      authVersion++
      cancelRead()
      clearGrant()
      publish({ status: 'signed-out', user: null, records: [], authorized: false, error: null, notice: 'Signed out of DataSphere. Your Google account remains signed in.' })
      try { identity?.signOut() } catch { /* Local identity/data have already been cleared. */ }
      if (token) identity?.revoke(token)
    },
  }
}
