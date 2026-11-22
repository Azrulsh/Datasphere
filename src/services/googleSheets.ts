import { validateGoogleSheetsConfig } from '../config/googleSheets.ts'
import { parseGoogleSheetsResponse } from '../data/parseSheetValues.ts'
import type { GoogleSheetsConfig, GoogleSheetsReader, SheetsReadResult } from '../types/googleSheets'

/** Inert until explicitly called with a token. No token acquisition or persistence. */
export function createGoogleSheetsReader(
  config: GoogleSheetsConfig,
  fetcher: typeof fetch = globalThis.fetch,
): GoogleSheetsReader {
  const validated = validateGoogleSheetsConfig(config)
  return {
    async readProfiles(accessToken: string, signal?: AbortSignal): Promise<SheetsReadResult> {
      if (validated.ok === false) return {
        ok: false, error: { code: 'INVALID_CONFIGURATION', message: 'Configure the private spreadsheet before reading profiles.', issues: validated.issues },
      }
      if (typeof accessToken !== 'string' || !accessToken.trim()) return {
        ok: false, error: { code: 'ACCESS_TOKEN_REQUIRED', message: 'An explicit OAuth access token from the authentication layer is required.' },
      }
      if (!/^[A-Za-z0-9._~+/-]+=*$/.test(accessToken)) return {
        ok: false, error: { code: 'INVALID_ACCESS_TOKEN', message: 'The access token has an invalid format. Request a new token from the authentication layer.' },
      }
      if (signal?.aborted) return { ok: false, error: { code: 'ABORTED', message: 'The spreadsheet read was cancelled.' } }

      const { spreadsheetId, range } = validated.config
      const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`)
      url.searchParams.set('majorDimension', 'ROWS')
      url.searchParams.set('valueRenderOption', 'UNFORMATTED_VALUE')
      let response: Response
      try {
        response = await fetcher(url.href, {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
          credentials: 'omit', cache: 'no-store', redirect: 'error', signal,
        })
      } catch (error) {
        const aborted = signal?.aborted || (error instanceof Error && error.name === 'AbortError')
        // Do not propagate transport messages, request headers, tokens or API bodies.
        return { ok: false, error: { code: aborted ? 'ABORTED' : 'NETWORK_ERROR', message: aborted ? 'The spreadsheet read was cancelled.' : 'Unable to reach Google Sheets. Check the connection and retry.' } }
      }
      if (!response.ok) {
        const messages: Record<number, string> = {
          401: 'Google rejected the access token. Authenticate again before retrying.',
          403: 'Google denied access. Check the account’s Sheet permission, read-only scope and Sheets API enablement.',
          404: 'Spreadsheet or range was not found. Check the spreadsheet ID, tab and account access.',
          429: 'Google Sheets rate limit reached. Retry later.',
        }
        return { ok: false, error: { code: 'HTTP_ERROR', status: response.status, message: messages[response.status] ?? 'Google Sheets could not complete the read. Retry later.' } }
      }
      let body: unknown
      try { body = await response.json() }
      catch {
        if (signal?.aborted) return { ok: false, error: { code: 'ABORTED', message: 'The spreadsheet read was cancelled.' } }
        return { ok: false, error: { code: 'INVALID_JSON', message: 'Google Sheets returned unreadable JSON. Retry the read.' } }
      }
      return parseGoogleSheetsResponse(body)
    },
  }
}
