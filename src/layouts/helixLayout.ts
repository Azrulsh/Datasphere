import type { LayoutTarget } from '../types/layout'
import { validateRecordCount } from './layoutUtils.ts'

export const HELIX_RADIUS = 720
export const HELIX_ANGLE_STEP = Math.PI / 6
export const HELIX_VERTICAL_SPACING = 104

/** Consecutive pairs share a height and occupy opposite strands around Y. */
export function helixLayout(count: number): LayoutTarget[] {
  validateRecordCount(count)
  const levels = Math.ceil(count / 2)
  return Array.from({ length: count }, (_, index) => {
    const level = Math.floor(index / 2)
    const strand = index % 2
    const angle = level * HELIX_ANGLE_STEP + strand * Math.PI
    const normal = { x: Math.sin(angle), y: 0, z: Math.cos(angle) }
    return {
      position: {
        x: normal.x * HELIX_RADIUS,
        y: ((levels - 1) / 2 - level) * HELIX_VERTICAL_SPACING,
        z: normal.z * HELIX_RADIUS,
      },
      normal,
    }
  })
}
