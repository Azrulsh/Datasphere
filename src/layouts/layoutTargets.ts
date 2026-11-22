import type { LayoutName, LayoutTarget } from '../types/layout'
import { gridLayout } from './gridLayout.ts'
import { helixLayout } from './helixLayout.ts'
import { sphereLayout } from './sphereLayout.ts'
import { tablePosition } from './tableLayout.ts'
import { validateRecordCount } from './layoutUtils.ts'

export const LAYOUT_OPTIONS: ReadonlyArray<{ name: LayoutName; label: string }> = [
  { name: 'table', label: 'Table' },
  { name: 'sphere', label: 'Sphere' },
  { name: 'helix', label: 'Helix' },
  { name: 'grid', label: 'Grid' },
]

export function createLayoutTargets(layout: LayoutName, count: number): LayoutTarget[] {
  validateRecordCount(count)
  switch (layout) {
    case 'sphere': return sphereLayout(count)
    case 'helix': return helixLayout(count)
    case 'grid': return gridLayout(count)
    case 'table': return Array.from({ length: count }, (_, index) => ({
      position: tablePosition(index, count), normal: { x: 0, y: 0, z: 1 },
    }))
  }
}
