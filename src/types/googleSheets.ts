import type { Person } from './person'

export type SheetCell = string | number | boolean | null

/** Values API output may omit values entirely for an empty range. */
export interface GoogleSheetsValueRange {
  range?: string
  majorDimension?: 'ROWS' | 'COLUMNS'
  values?: SheetCell[][]
}

export interface SheetRowIssue {
  row: number // One-based sheet row; the requested range must start at row 1.
  column: number // One-based column within the returned range.
  field: keyof Person
  message: string
}

export type SheetDataError =
  | { code: 'EMPTY_SPREADSHEET' | 'UNEXPECTED_RESPONSE_SHAPE'; message: string }
  | { code: 'MISSING_HEADERS'; message: string; missingHeaders: string[] }
  | { code: 'DUPLICATE_HEADERS'; message: string; duplicateHeaders: string[] }
  | { code: 'INVALID_ROWS'; message: string; issues: SheetRowIssue[] }

/** All-or-nothing: a failure never exposes a silently truncated record array. */
export type SheetParseResult =
  | { ok: true; records: Person[] }
  | { ok: false; error: SheetDataError }

export interface GoogleSheetsConfig {
  spreadsheetId: string
  range: string
}

export interface SheetsConfigIssue {
  field: keyof GoogleSheetsConfig
  message: string
}

export type SheetsConfigResult =
  | { ok: true; config: GoogleSheetsConfig }
  | { ok: false; issues: SheetsConfigIssue[] }

export type SheetsAccessError =
  | { code: 'INVALID_CONFIGURATION'; message: string; issues: SheetsConfigIssue[] }
  | { code: 'ACCESS_TOKEN_REQUIRED' | 'INVALID_ACCESS_TOKEN' | 'NETWORK_ERROR' | 'ABORTED' | 'INVALID_JSON'; message: string }
  | { code: 'HTTP_ERROR'; message: string; status: number }

export type SheetsReadResult = SheetParseResult | { ok: false; error: SheetsAccessError }

/** Authentication supplies a short-lived token per call. No token is stored. */
export interface GoogleSheetsReader {
  readProfiles(accessToken: string, signal?: AbortSignal): Promise<SheetsReadResult>
}
