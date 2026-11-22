import { AppLayout } from './components/layout/AppLayout'
import { VisualizationScene } from './components/visualization/VisualizationScene'
import { SessionPanel } from './components/auth/SessionPanel'
import { useDataSphereSession } from './hooks/useDataSphereSession'
import { sessionView } from './auth/sessionView'
import { readAppConfig } from './config/appConfig'
import type { AppConfig } from './config/appConfig'

const configuration = readAppConfig(import.meta.env ?? {})

function ConnectedApp({ config }: { config: AppConfig }) {
  const { snapshot, controller } = useDataSphereSession(config)
  const view = sessionView(snapshot)
  const actions = snapshot.user ? <div className="flex flex-wrap items-center gap-3">
    <div className="text-sm">
      <p className="font-medium text-slate-200">{snapshot.user.name || 'Google account'}</p>
      {snapshot.user.email && <p className="text-xs text-slate-400">{snapshot.user.email}</p>}
    </div>
    {view.records && <button className="layout-active" type="button" disabled={view.busy} onClick={controller.refresh}>{view.busy ? 'Refreshing…' : 'Refresh data'}</button>}
    <button className="camera-button" type="button" onClick={controller.signOut}>Sign out</button>
  </div> : undefined
  return <AppLayout sourceLabel={view.sourceLabel} sourceDetail={view.countLabel} actions={actions}>
    {view.records ? <>
      {snapshot.status === 'loading' && <p role="status" className="mb-3 text-sm text-cyan-300">Refreshing Google Sheets data…</p>}
      <VisualizationScene records={view.records} sourceLabel="GOOGLE SHEETS" />
    </> : <SessionPanel snapshot={snapshot} controller={controller} />}
  </AppLayout>
}

export default function App() {
  if (configuration.ok === false) return <AppLayout sourceLabel="Configuration required" sourceDetail="Google Sign-In and Sheets are not connected">
    <section role="alert" className="rounded-xl border border-amber-300/20 bg-[#0c121d] p-6 sm:p-10">
      <h2 className="text-2xl font-semibold">Configure your Google connection</h2>
      <p className="mt-3 text-slate-400">Set these public settings in your local .env file, then restart Vite. See README.md for Google Cloud setup.</p>
      <ul className="mt-5 list-disc space-y-3 pl-5 text-sm text-amber-100">
        {configuration.issues.map((issue) => <li key={issue}>{issue}</li>)}
      </ul>
    </section>
  </AppLayout>
  return <ConnectedApp config={configuration.config} />
}
