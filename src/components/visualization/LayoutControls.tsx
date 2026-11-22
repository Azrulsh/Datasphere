import { LAYOUT_OPTIONS } from '../../layouts/layoutTargets'
import type { LayoutName } from '../../types/layout'

interface LayoutControlsProps {
  selected: LayoutName
  onSelect: (layout: LayoutName) => void
  disabled: boolean
}

export function LayoutControls({ selected, onSelect, disabled }: LayoutControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Visualization layout">
      <span className="mr-2 text-sm text-slate-400">Arrangement</span>
      {LAYOUT_OPTIONS.map(({ name, label }) => (
        <button className={name === selected ? 'layout-active' : 'layout-inactive'} type="button" disabled={disabled}
          key={name} aria-pressed={name === selected} onClick={() => onSelect(name)}
          title={name === 'helix' ? 'Double Helix: two intertwined strands' : label}>
          {label}
        </button>
      ))}
    </div>
  )
}
