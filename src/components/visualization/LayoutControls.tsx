interface LayoutControlsProps { onTable: () => void; disabled: boolean }

export function LayoutControls({ onTable, disabled }: LayoutControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Visualization layout">
      <span className="mr-2 text-sm text-slate-400">Arrangement</span>
      <button className="layout-active" type="button" aria-pressed="true" disabled={disabled} onClick={onTable}>▦ Table</button>
      {['Sphere', 'Double Helix', 'Grid'].map((name) => (
        <button className="layout-pending" type="button" disabled key={name} title={`${name} is not implemented in Phase 1`}>
          {name} <span className="ml-1 text-xs">/ Later</span>
        </button>
      ))}
    </div>
  )
}
