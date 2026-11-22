import { decodeDisplayIdentity } from './identityClaims.ts'
import type { GoogleIdentityServices, IdentityClient, IdentityHandlers, OAuthGrant } from '../types/googleIdentity'

export const SHEETS_READONLY_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly'

export class GoogleIdentityError extends Error {
  code: string
  constructor(code: string, message: string) { super(message); this.code = code; this.name = 'GoogleIdentityError' }
}

/** All credential/token lifetimes are confined to callbacks and the session controller. */
export function createGoogleIdentityClient(
  clientId: string,
  google: GoogleIdentityServices,
  handlers: IdentityHandlers,
  now: () => number = Date.now,
  makeNonce: () => string = () => crypto.randomUUID(),
): IdentityClient {
  let disposed = false
  let armed = false
  let identityVersion = 0
  let authVersion = 0
  let rejectPending: ((error: GoogleIdentityError) => void) | null = null
  const cancelAuthorization = () => {
    authVersion++
    rejectPending?.(new GoogleIdentityError('CANCELLED', 'Authorization was cancelled. Connect Google Sheets when you are ready.'))
    rejectPending = null
  }
  const initialize = () => {
    const version = ++identityVersion
    const nonce = makeNonce()
    google.accounts.id.initialize({
      client_id: clientId, nonce, auto_select: false, ux_mode: 'popup',
      callback: (response) => {
        if (disposed || !armed || version !== identityVersion) return
        armed = false
        try {
          if (!response.credential) throw new Error()
          handlers.onUser(decodeDisplayIdentity(response.credential, clientId, nonce, now()))
        } catch {
          handlers.onError(new GoogleIdentityError('SIGN_IN_FAILED', 'Google sign-in failed. Try the Google button again; check your browser’s sign-in and popup settings.'))
        }
      },
    })
  }
  initialize()

  return {
    renderButton(element) {
      if (disposed) return
      google.accounts.id.renderButton(element, {
        theme: 'filled_black', size: 'large', text: 'signin_with', shape: 'rectangular',
        click_listener: () => {
          if (disposed) return
          armed = true
          handlers.onSignInStart()
        },
      })
    },
    authorize(user): Promise<OAuthGrant> {
      if (disposed || rejectPending) return Promise.reject(new GoogleIdentityError('BUSY', 'An authorization request is already in progress.'))
      const version = ++authVersion
      return new Promise((resolve, reject) => {
        rejectPending = reject
        const fail = (code: string, message: string) => {
          if (disposed || version !== authVersion) return
          rejectPending = null
          reject(new GoogleIdentityError(code, message))
        }
        try {
          const client = google.accounts.oauth2.initTokenClient({
            client_id: clientId, scope: SHEETS_READONLY_SCOPE, include_granted_scopes: false,
            login_hint: user.id, prompt: '',
            callback: (response) => {
              if (disposed || version !== authVersion || !rejectPending) return
              try {
                if (response.error) { fail('AUTHORIZATION_DENIED', 'Google Sheets authorization was not granted. Connect again and allow read-only access.'); return }
                if (!google.accounts.oauth2.hasGrantedAllScopes(response, SHEETS_READONLY_SCOPE)) {
                  fail('SCOPE_DENIED', 'Read-only Sheets permission was not granted. Connect again and allow the requested permission.'); return
                }
                const seconds = Number(response.expires_in)
                if (typeof response.access_token !== 'string' || !/^[A-Za-z0-9._~+/-]+=*$/.test(response.access_token)
                  || typeof response.token_type !== 'string' || response.token_type.toLowerCase() !== 'bearer'
                  || !Number.isFinite(seconds) || seconds <= 0 || seconds > 86_400) {
                  fail('INVALID_TOKEN', 'Google returned unusable authorization. Connect Google Sheets again.'); return
                }
                rejectPending = null
                resolve({ accessToken: response.access_token, expiresAt: now() + seconds * 1000 })
              } catch {
                fail('AUTHORIZATION_FAILED', 'Google authorization returned an unusable response. Connect Google Sheets again.')
              }
            },
            error_callback: (error) => {
              const closed = error?.type === 'popup_closed'
              fail(closed ? 'POPUP_CLOSED' : 'POPUP_BLOCKED', closed
                ? 'The authorization popup was closed. Connect Google Sheets to try again.'
                : 'Google could not open the authorization popup. Allow popups for this site and try Connect Google Sheets again.')
            },
          })
          // Synchronous in the button event stack, preserving browser user activation.
          client.requestAccessToken()
        } catch {
          fail('AUTHORIZATION_FAILED', 'Google authorization could not start. Reload the Google service and try again.')
        }
      })
    },
    cancelAuthorization,
    signOut() {
      armed = false
      cancelAuthorization()
      google.accounts.id.disableAutoSelect()
      google.accounts.id.cancel()
      // A fresh nonce makes a late credential from the previous sign-in unusable.
      initialize()
    },
    revoke(accessToken) {
      try { google.accounts.oauth2.revoke(accessToken, () => {}) } catch { /* Local sign-out must still succeed. */ }
    },
    dispose() {
      disposed = true
      armed = false
      identityVersion++
      cancelAuthorization()
      try { google.accounts.id.cancel() } catch { /* SDK cleanup is best effort. */ }
    },
  }
}
