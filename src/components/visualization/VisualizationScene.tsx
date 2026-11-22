import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Person } from '../../types/person'
import type { LayoutName } from '../../types/layout'
import { DataTile } from './DataTile'
import { LayoutControls } from './LayoutControls'
import { createVisualizationScene } from './createVisualizationScene'

interface VisualizationSceneProps { records: readonly Person[]; loading?: boolean; sourceLabel?: string }

export function VisualizationScene({ records, loading = false, sourceLabel = 'PROFILE DATA' }: VisualizationSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<ReturnType<typeof createVisualizationScene> | null>(null)
  const [layout, setLayout] = useState<LayoutName>('table')
  const elements = useMemo(() => records.map(() => document.createElement('div')), [records])
  const inactive = loading || records.length === 0

  useEffect(() => {
    if (!hostRef.current || inactive) return
    const controller = createVisualizationScene(hostRef.current, elements)
    controllerRef.current = controller
    return () => {
      controllerRef.current = null
      controller.dispose()
    }
  }, [elements, inactive])

  useEffect(() => { controllerRef.current?.setLayout(layout) }, [layout, elements, inactive])

  const descriptions: Record<LayoutName, string> = {
    table: `20 columns · ${Math.ceil(records.length / 20)} rows`,
    sphere: `${records.length} profiles · Fibonacci sphere`,
    helix: `Double Helix · ${Math.min(2, records.length)} strands · ${Math.ceil(records.length / 2)} levels`,
    grid: `X: 5 · Y: 4 · Z: ${Math.ceil(records.length / 20)}`,
  }

  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0c121d]" aria-label="Profile visualization">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
        <LayoutControls disabled={inactive} selected={layout} onSelect={(name) => {
          if (name === layout) controllerRef.current?.reset()
          else setLayout(name)
        }} />
        <span className="text-xs text-slate-400" role="status">{descriptions[layout]}</span>
      </div>
      <div className="scene-shell relative">
        <div ref={hostRef} tabIndex={inactive ? -1 : 0} role="region" aria-label={`3D ${layout} profile layout. Drag to rotate, scroll to zoom, right-drag or arrow keys to pan.`} aria-describedby="scene-help" className="absolute inset-0 overflow-hidden outline-offset-[-3px]" />
        {!inactive && records.map((person, index) => createPortal(<DataTile person={person} index={index} />, elements[index], String(index)))}
        {inactive && <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="text-lg font-medium">{loading ? 'Preparing your profiles…' : 'No profiles to explore'}</span>
          <p className="text-sm text-slate-400">{loading ? 'Setting up the visualization.' : 'The selected data source contains no profiles.'}</p>
        </div>}
        <div className="absolute right-4 bottom-4 flex gap-1 rounded-lg border border-white/10 bg-[#101827]/95 p-1" role="group" aria-label="Camera controls">
          <button className="camera-button" type="button" disabled={inactive} aria-label="Zoom out" onClick={() => controllerRef.current?.zoom(1.25)}>−</button>
          <button className="camera-button" type="button" disabled={inactive} aria-label="Zoom in" onClick={() => controllerRef.current?.zoom(0.8)}>+</button>
          <button className="camera-button" type="button" disabled={inactive} onClick={() => controllerRef.current?.fitAll()}>Fit all</button>
          <button className="camera-button" type="button" disabled={inactive} onClick={() => controllerRef.current?.reset()}>Reset</button>
        </div>
        <span className="pointer-events-none absolute top-4 left-5 text-xs tracking-wider text-slate-400">{layout.toUpperCase()} / {sourceLabel}</span>
      </div>
      <div className="flex flex-wrap justify-between gap-4 border-t border-white/10 px-5 py-4 text-sm text-slate-400">
        <p id="scene-help">Drag to rotate · Scroll to zoom · Right-drag to pan<br className="sm:hidden" /><span className="text-xs text-slate-400"> · Touch: pinch / two-finger pan · Focus table + arrow keys to pan</span></p>
        <div className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Net worth legend in US dollars">
          <span><i className="legend-dot bg-red-400" /> &lt; $100k</span>
          <span><i className="legend-dot bg-orange-400" /> $100k–$200k</span>
          <span><i className="legend-dot bg-emerald-400" /> &gt; $200k</span>
        </div>
      </div>
    </section>
  )
}
