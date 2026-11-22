export const TABLE_COLUMNS = 20
export const TILE_WIDTH = 224
export const TILE_HEIGHT = 280
export const COLUMN_SPACING = 248
export const ROW_SPACING = 304

/** Center occupied bounds; 200 records naturally produce 20 × 10. */
export function tablePosition(index: number, count: number) {
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(index) || index < 0 || index >= count) {
    throw new RangeError('Expected a valid record index and positive record count')
  }
  const columns = Math.min(TABLE_COLUMNS, count)
  const rows = Math.ceil(count / TABLE_COLUMNS)
  return {
    x: (index % TABLE_COLUMNS - (columns - 1) / 2) * COLUMN_SPACING,
    y: ((rows - 1) / 2 - Math.floor(index / TABLE_COLUMNS)) * ROW_SPACING,
    z: 0,
  }
}
