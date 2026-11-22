import type { LayoutTarget } from '../types/layout'
import { TILE_HEIGHT, TILE_WIDTH } from './tableLayout.ts'
import { validateRecordCount } from './layoutUtils.ts'

export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

/** Equal-area latitude bands and a golden-angle spiral avoid pole clustering. */
export function sphereLayout(count: number): LayoutTarget[] {
  validateRecordCount(count)
  // Radius scales with sqrt(count), retaining room for the card diagonal.
  const radius = Math.max(TILE_HEIGHT * 1.6, Math.hypot(TILE_WIDTH, TILE_HEIGHT) * Math.sqrt(count) * 0.4)
  return Array.from({ length: count }, (_, index) => {
    const y = 1 - 2 * (index + 0.5) / count
    const horizontal = Math.sqrt(1 - y * y)
    const angle = index * GOLDEN_ANGLE
    const normal = { x: Math.sin(angle) * horizontal, y, z: Math.cos(angle) * horizontal }
    return {
      position: { x: normal.x * radius, y: normal.y * radius, z: normal.z * radius },
      normal,
    }
  })
}
