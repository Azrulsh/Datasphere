export type LayoutName = 'table' | 'sphere' | 'helix' | 'grid'

export interface Coordinates { x: number; y: number; z: number }

/** A card's local +Z axis points along its normal. */
export interface LayoutTarget {
  position: Coordinates
  normal: Coordinates
}
