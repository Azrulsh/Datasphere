import type { LayoutTarget } from '../types/layout'
import { COLUMN_SPACING, ROW_SPACING } from './tableLayout.ts'
import { validateRecordCount } from './layoutUtils.ts'

export const GRID_COLUMNS = 5 // X
export const GRID_ROWS = 4 // Y
export const GRID_DEPTH_SPACING = 420 // Z

/** X varies fastest, then Y, then Z: 200 records fill exactly 5 × 4 × 10. */
export function gridLayout(count: number): LayoutTarget[] {
  validateRecordCount(count)
  const columns = Math.min(GRID_COLUMNS, count)
  const rows = Math.min(GRID_ROWS, Math.ceil(count / GRID_COLUMNS))
  const layers = Math.ceil(count / (GRID_COLUMNS * GRID_ROWS))
  return Array.from({ length: count }, (_, index) => ({
    position: {
      x: (index % GRID_COLUMNS - (columns - 1) / 2) * COLUMN_SPACING,
      y: ((rows - 1) / 2 - Math.floor(index / GRID_COLUMNS) % GRID_ROWS) * ROW_SPACING,
      z: ((layers - 1) / 2 - Math.floor(index / (GRID_COLUMNS * GRID_ROWS))) * GRID_DEPTH_SPACING,
    },
    normal: { x: 0, y: 0, z: 1 },
  }))
}
