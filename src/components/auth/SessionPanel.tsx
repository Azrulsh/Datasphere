import type { createSessionController, SessionSnapshot, SessionStatus } from '../../auth/sessionController'
import { GoogleSignInButton } from './GoogleSignInButton'

type Controller = ReturnType<typeof createSessionController>
const titles: Record<SessionStatus, string> = {
  'gis-loading': 'Preparing Google Sign-In…',
  'gis-error': 'Google Sign-In is unavailable',
  'signed-out': 'Your data. Your perspective.',
  'signed-in': 'Connect your Google Sheet',
  'authorizing': 'Waiting for Google permission…',
  'authorization-error': 'Sheets permission is needed',
  'loading': 'Loading spreadsheet profiles…',
  'ready': 'Your profiles are ready',
  'empty': 'No spreadsheet profiles found',
  'data-error': 'Unable to load the spreadsheet',
  'permission-denied': 'This account cannot read the Sheet',
  'expired': 'Authorize Google Sheets again',
}

export function SessionPanel({ snapshot, controller }: { snapshot: SessionSnapshot; controller: Controller }) {
  const busy = ['gis-loading', 'authorizing', 'loading'].includes(snapshot.status)
  return (
    <section className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0c121d] px-5 py-10 sm:px-10" aria-label="Google account and spreadsheet connection">
      <div className="w-full max-w-2xl">
        <p className="mb-3 text-xs font-medium tracking-[0.15em] text-cyan-400">GOOGLE SHEETS / READ ONLY</p>
        <h2 className="text-2xl font-semibold" role={busy ? 'status' : undefined}>{titles[snapshot.status]}</h2>
        <p className="mt-3 text-base text-slate-400">Sign in with Google, then allow read-only access through Google Sheets. DataSphere reads the configured private Sheet and displays only validated profiles.</p>
        {snapshot.error && <div role="alert" className="mt-5 rounded-lg border border-amber-300/25 bg-amber-300/5 p-4 text-sm text-amber-100">
          <p>{snapshot.error.message}</p>
          {!!snapshot.error.details?.length && <details className="mt-3">
            <summary className="cursor-pointer">View validation details ({snapshot.error.details.length})</summary>
            <ul className="mt-3 max-h-60 list-disc space-y-2 overflow-y-auto pl-5">
              {snapshot.error.details.map((detail, index) => <li key={index}>{detail}</li>)}
            </ul>
          </details>}
        </div>}
        {snapshot.notice && <p role="status" className="mt-4 text-sm text-slate-300">{snapshot.notice}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {snapshot.status === 'signed-out' && <GoogleSignInButton renderButton={controller.renderSignInButton} />}
          {snapshot.status === 'gis-error' && <button type="button" className="layout-active" onClick={controller.restart}>Retry Google service</button>}
          {snapshot.user && !busy && <button type="button" className="layout-active" onClick={controller.refresh}>
            {snapshot.authorized ? 'Retry loading data' : snapshot.status === 'expired' ? 'Authorize again' : 'Connect Google Sheets'}
          </button>}
          {snapshot.status === 'permission-denied' && <button type="button" className="camera-button" onClick={controller.authorize}>Authorize again</button>}
        </div>
        <p className="mt-6 text-sm text-slate-400">DataSphere does not modify the spreadsheet. Signing out here does not sign you out of Google.</p>
      </div>
    </section>
  )
}
