import { readGoogleSheetsConfig } from './googleSheets.ts'
import type { GoogleSheetsConfig } from '../types/googleSheets'

export interface AppConfig { clientId: string; sheet: GoogleSheetsConfig }

export function readAppConfig(env: Record<string, unknown>):
  { ok: true; config: AppConfig } | { ok: false; issues: string[] } {
  const clientId = typeof env.VITE_GOOGLE_CLIENT_ID === 'string' ? env.VITE_GOOGLE_CLIENT_ID.trim() : ''
  const issues: string[] = []
  if (!/^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
    issues.push('Set VITE_GOOGLE_CLIENT_ID to a Google OAuth Web application client ID ending in .apps.googleusercontent.com. No client secret is required.')
  }
  const sheet = readGoogleSheetsConfig(env)
  if (sheet.ok === false) issues.push(...sheet.issues.map(({ message }) => message))
  if (sheet.ok === false || issues.length) return { ok: false, issues }
  return { ok: true, config: { clientId, sheet: sheet.config } }
}
