import type { Person } from '../types/person'
import type { SheetCell, SheetParseResult, SheetRowIssue } from '../types/googleSheets'

const headers: Record<keyof Person, string> = {
  name: 'name', photo: 'photo', age: 'age', country: 'country', interest: 'interest', netWorth: 'net worth',
}
const fields = Object.keys(headers) as Array<keyof Person>
const cleanText = (value: string) => value.replace(/[\u00a0\u202f]/g, ' ').trim()
const normalizeHeader = (value: SheetCell) => typeof value === 'string'
  ? cleanText(value).replace(/\s+/g, ' ').toLowerCase()
  : ''

function requiredText(value: SheetCell | undefined): string | null {
  if (typeof value !== 'string') return null
  return cleanText(value) || null
}

function ageValue(value: SheetCell | undefined): number | null {
  const text = typeof value === 'string' ? cleanText(value) : ''
  const number = typeof value === 'number' ? value : /^\d+(?:\.0+)?$/.test(text) ? Number(text) : NaN
  return Number.isSafeInteger(number) && number >= 0 ? number : null
}

function worthValue(value: SheetCell | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const text = cleanText(value)
  // USD formats only. Validate grouping BEFORE removing separators: "1,2,3" is invalid.
  const match = /^([+-]?)(?:USD\s*|US\$\s*|\$\s*)?((?:\d{1,3}(?:,\d{3})+|\d{1,3}(?: \d{3})+|\d+)(?:\.\d{1,2})?)$/i.exec(text)
  if (!match) return null
  const number = Number(match[1] + match[2].replace(/[, ]/g, ''))
  return Number.isFinite(number) ? number : null
}

function photoValue(value: SheetCell | undefined): string | null {
  const text = requiredText(value)
  if (!text || !/^https:\/\//i.test(text) || /\s/.test(text)
    || [...text].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return null
  try {
    const url = new URL(text)
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return null
    return url.href
  } catch {
    return null
  }
}

const unexpected = (message: string): SheetParseResult => ({
  ok: false, error: { code: 'UNEXPECTED_RESPONSE_SHAPE', message },
})
const empty = (): SheetParseResult => ({
  ok: false, error: { code: 'EMPTY_SPREADSHEET', message: 'The selected range has no profile records. Include the header row and at least one data row.' },
})

/** First row is the header. Every subsequent row is validated, including blank rows. */
export function parseSheetValues(input: unknown): SheetParseResult {
  if (!Array.isArray(input)) return unexpected('Expected a two-dimensional array of spreadsheet cell values.')
  for (const [rowIndex, row] of input.entries()) {
    if (!Array.isArray(row)) return unexpected(`Row ${rowIndex + 1} must be an array of cells.`)
    for (const [columnIndex, cell] of row.entries()) {
      if (cell !== null && !['string', 'number', 'boolean'].includes(typeof cell)) {
        return unexpected(`Row ${rowIndex + 1}, column ${columnIndex + 1} must contain a primitive cell value.`)
      }
    }
  }
  const values = input as SheetCell[][]
  const entirelyBlank = values.every((row) => row.every((cell) => cell === null || (typeof cell === 'string' && !cleanText(cell))))
  if (values.length === 0 || entirelyBlank) return empty()

  const normalizedHeaders = values[0].map(normalizeHeader)
  const columns = new Map<keyof Person, number>()
  const missingHeaders: string[] = []
  const duplicateHeaders: string[] = []
  for (const field of fields) {
    const indices = normalizedHeaders.flatMap((header, index) => header === headers[field] ? [index] : [])
    if (indices.length === 0) missingHeaders.push(headers[field])
    else if (indices.length > 1) duplicateHeaders.push(headers[field])
    else columns.set(field, indices[0])
  }
  if (missingHeaders.length) return {
    ok: false, error: { code: 'MISSING_HEADERS', missingHeaders, message: `Header row is missing required columns: ${missingHeaders.join(', ')}.` },
  }
  if (duplicateHeaders.length) return {
    ok: false, error: { code: 'DUPLICATE_HEADERS', duplicateHeaders, message: `Use each required header once. Duplicated columns: ${duplicateHeaders.join(', ')}.` },
  }
  if (values.length === 1) return empty()

  const records: Person[] = []
  const issues: SheetRowIssue[] = []
  for (let index = 1; index < values.length; index++) {
    const row = values[index]
    const read = (field: keyof Person) => row[columns.get(field)!]
    const person = {
      name: requiredText(read('name')),
      photo: photoValue(read('photo')),
      age: ageValue(read('age')),
      country: requiredText(read('country')),
      interest: requiredText(read('interest')),
      netWorth: worthValue(read('netWorth')),
    }
    const messages: Record<keyof Person, string> = {
      name: 'Name must be nonempty text.',
      photo: 'Photo must be an absolute HTTPS URL without credentials or unescaped whitespace.',
      age: 'Age must be a finite, nonnegative safe integer (for example, 30).',
      country: 'Country must be nonempty text.',
      interest: 'Interest must be nonempty text.',
      netWorth: 'Net Worth must be a finite USD amount, such as $251,260.80; use valid grouping and up to two decimal places.',
    }
    const invalidFields = fields.filter((field) => person[field] === null)
    if (invalidFields.length) {
      invalidFields.forEach((field) => issues.push({ row: index + 1, column: columns.get(field)! + 1, field, message: messages[field] }))
    } else {
      // Each nullable field has been validated above; no partial records escape.
      records.push(person as Person)
    }
  }
  if (issues.length) return {
    ok: false, error: { code: 'INVALID_ROWS', message: `Fix ${issues.length} field error(s) in ${new Set(issues.map(({ row }) => row)).size} spreadsheet row(s). No records were accepted.`, issues },
  }
  return { ok: true, records }
}

/** Validate the JSON envelope independently of transport or authentication. */
export function parseGoogleSheetsResponse(input: unknown): SheetParseResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return unexpected('Expected a Google Sheets ValueRange object.')
  const response = input as Record<string, unknown>
  if (!['range', 'majorDimension', 'values'].some((key) => Object.hasOwn(response, key))) {
    return unexpected('Response does not contain ValueRange fields (range, majorDimension or values).')
  }
  if (response.majorDimension !== undefined && response.majorDimension !== 'ROWS') return unexpected('Expected row-major values. Request majorDimension=ROWS.')
  if (response.range !== undefined && typeof response.range !== 'string') return unexpected('ValueRange.range must be a string when present.')
  if (!Object.hasOwn(response, 'values')) return empty()
  return parseSheetValues(response.values)
}
