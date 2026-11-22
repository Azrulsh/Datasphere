import type { Person, PersonCsvRow } from '../types/person'

/** Normalize an already parsed CSV row; fetching and CSV parsing are future work. */
export function normalizePerson(row: PersonCsvRow): Person {
  const ageText = row.Age.trim()
  const worthText = row[' Net Worth '].trim().replace(/[$,\s]/g, '')
  const age = Number(ageText)
  const netWorth = Number(worthText)
  if (!row.Name.trim() || !ageText || !worthText || !Number.isInteger(age) || age < 0 || !Number.isFinite(netWorth)) {
    throw new Error('Invalid profile: name, age and net worth are required')
  }
  return {
    name: row.Name.trim(),
    photo: row.Photo.trim(),
    age,
    country: row.Country.trim(),
    interest: row.Interest.trim(),
    netWorth,
  }
}
