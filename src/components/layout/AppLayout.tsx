import type { ReactNode } from 'react'

interface AppLayoutProps {
  children: ReactNode
  sourceLabel: string
  sourceDetail: string
  actions?: ReactNode
}

export function AppLayout({ children, sourceLabel, sourceDetail, actions }: AppLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col bg-[#090d14] text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-10">
        <a href="./" className="flex items-center gap-3 text-xl font-semibold tracking-tight" aria-label="DataSphere home">
          <span className="brand-orbit" aria-hidden="true">◉</span> DataSphere
        </a>
        {actions ?? <span className="text-sm text-slate-400">Interactive 3D data visualization</span>}
      </header>
      <main className="flex flex-1 flex-col px-4 py-7 sm:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-medium tracking-[0.2em] text-cyan-400">PEOPLE, IN PERSPECTIVE</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Explore the connections.</h1>
            <p className="mt-3 max-w-xl text-base text-slate-400">Explore profiles in four arrangements. A different perspective on every person.</p>
          </div>
          <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm">
            <span className="font-medium text-cyan-300">{sourceLabel}</span>
            <p className="mt-1 text-slate-400">{sourceDetail}</p>
          </div>
        </div>
        {children}
      </main>
      <footer className="flex flex-wrap justify-between gap-2 px-5 pb-5 text-xs text-slate-400 sm:px-10">
        <span>DataSphere / Interactive profile explorer</span>
        <span>Three.js CSS3D · Google Sheets read-only access</span>
      </footer>
    </div>
  )
}
