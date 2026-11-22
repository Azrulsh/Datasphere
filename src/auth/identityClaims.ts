import type { GoogleUser } from '../types/googleIdentity'

/** Display-only decoding/sanity checks. This does NOT verify the JWT signature or create a server session. */
export function decodeDisplayIdentity(credential: string, clientId: string, nonce: string, now = Date.now()): GoogleUser {
  try {
    const parts = credential.split('.')
    if (parts.length !== 3 || parts.some((part) => !part)) throw new Error()
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')), (character) => character.charCodeAt(0))
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>
    if (!claims || typeof claims !== 'object' || claims.aud !== clientId || claims.nonce !== nonce
      || !['https://accounts.google.com', 'accounts.google.com'].includes(String(claims.iss))
      || typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp * 1000 <= now
      || typeof claims.sub !== 'string' || !claims.sub.trim()) throw new Error()
    return {
      id: claims.sub,
      name: typeof claims.name === 'string' ? claims.name : undefined,
      email: typeof claims.email === 'string' ? claims.email : undefined,
    }
  } catch {
    throw new Error('Google sign-in did not return usable identity information. Please try signing in again.')
  }
}
