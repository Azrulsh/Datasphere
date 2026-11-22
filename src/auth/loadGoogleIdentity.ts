import type { GoogleIdentityServices } from '../types/googleIdentity'

export const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client'
let pending: Promise<GoogleIdentityServices> | null = null

function availableGoogle(): GoogleIdentityServices | undefined {
  const google = window.google
  if (typeof google?.accounts?.id?.initialize === 'function'
    && typeof google.accounts.oauth2?.initTokenClient === 'function') return google
  return undefined
}

/** A shared, bounded script load survives StrictMode without duplicate downloads. */
export function loadGoogleIdentity(): Promise<GoogleIdentityServices> {
  const existing = availableGoogle()
  if (existing) return Promise.resolve(existing)
  if (pending) return pending
  pending = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GOOGLE_IDENTITY_SCRIPT
    script.async = true
    script.defer = true
    const cleanup = () => {
      clearTimeout(timeout)
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onError)
    }
    const onError = () => {
      cleanup()
      script.remove()
      pending = null
      reject(new Error('Google Identity Services could not be loaded.'))
    }
    const onLoad = () => {
      const google = availableGoogle()
      if (!google) { onError(); return }
      cleanup()
      pending = null
      resolve(google)
    }
    const timeout = setTimeout(onError, 15_000)
    script.addEventListener('load', onLoad)
    script.addEventListener('error', onError)
    document.head.appendChild(script)
  })
  return pending
}
