export function validateRecordCount(count: number): void {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError('Record count must be a non-negative integer')
  }
}
