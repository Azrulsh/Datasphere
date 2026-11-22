import type { GoogleSheetsConfig, SheetsConfigIssue, SheetsConfigResult } from '../types/googleSheets'

interface GoogleSheetsEnvironment {
  VITE_GOOGLE_SHEET_ID?: unknown
  VITE_GOOGLE_SHEET_RANGE?: unknown
}

const columnNumber = (letters: string) => [...letters.toUpperCase()].reduce((number, letter) => number * 26 + letter.charCodeAt(0) - 64, 0)

/** Scope: tab-qualified column ranges, starting with the header at row 1. */
export function validateGoogleSheetsConfig(input: GoogleSheetsConfig): SheetsConfigResult {
  const spreadsheetId = typeof input?.spreadsheetId === 'string' ? input.spreadsheetId.trim() : ''
  const range = typeof input?.range === 'string' ? input.range.trim() : ''
  const issues: SheetsConfigIssue[] = []
  if (!/^[A-Za-z0-9_-]+$/.test(spreadsheetId)) issues.push({
    field: 'spreadsheetId', message: 'Set VITE_GOOGLE_SHEET_ID to the ID between /d/ and /edit in the spreadsheet URL, not the full URL or numeric gid.',
  })
  const match = /^(?:'(?:[^']|'')+'|[^'!:\s]+)!\$?([A-Za-z]+)(?:\$?1)?:\$?([A-Za-z]+)(?:\$?([1-9]\d*))?$/.exec(range)
  const width = match ? columnNumber(match[2]) - columnNumber(match[1]) + 1 : 0
  if (!match || !Number.isSafeInteger(width) || width < 6
    || [...range].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) issues.push({
    field: 'range', message: "Set VITE_GOOGLE_SHEET_RANGE to a tab-qualified A1 range containing the header at row 1 and at least six columns, such as Sheet1!A:F or 'Profile Data'!A1:F201.",
  })
  return issues.length ? { ok: false, issues } : { ok: true, config: { spreadsheetId, range } }
}

/** Phase 4 may pass import.meta.env here; this module reads no env at startup. */
export function readGoogleSheetsConfig(env: GoogleSheetsEnvironment): SheetsConfigResult {
  return validateGoogleSheetsConfig({
    spreadsheetId: typeof env.VITE_GOOGLE_SHEET_ID === 'string' ? env.VITE_GOOGLE_SHEET_ID : '',
    range: typeof env.VITE_GOOGLE_SHEET_RANGE === 'string' ? env.VITE_GOOGLE_SHEET_RANGE : '',
  })
}
