import type { SessionSnapshot } from './sessionController'

/** This is the only selector that supplies production visualization records. */
export function sessionView(snapshot: SessionSnapshot) {
  const records = snapshot.user && ['ready', 'loading'].includes(snapshot.status) && snapshot.records.length > 0
    ? snapshot.records : null
  return {
    records,
    busy: ['gis-loading', 'authorizing', 'loading'].includes(snapshot.status),
    sourceLabel: records ? 'Google Sheets · Live data' : 'Private Google Sheets',
    countLabel: records
      ? `${records.length} profiles · ${records.length === 200 ? 'Expected 200 loaded' : 'Expected 200; dataset count differs'}`
      : snapshot.user
        ? snapshot.status === 'loading' ? 'Loading spreadsheet profiles…'
          : snapshot.authorized ? 'No validated profiles loaded' : 'Read-only authorization required'
        : 'Sign in and authorize read-only access',
  }
}
