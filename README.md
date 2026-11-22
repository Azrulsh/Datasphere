# DataSphere — Phase 5

Phase 6 release preparation is documented in the [release runbook](docs/phase-6-release.md), including the current requirement audit, proposed Git commands, local/production acceptance gates, reviewer access and a preliminary submission email. Automated checks pass; Phase 6 remains pending until the real dataset, authenticated production flow and submission URL are verified. No publishing actions are authorized by this document.

Interactive React + Vite + TypeScript visualization using Tailwind CSS v4 and Three.js CSS3D. Production data now comes from a private Google Sheet after separate Google sign-in and read-only OAuth authorization. The original 40 fictional records remain unchanged in `src/data/sampleRecords.ts` as development fixtures; they are not imported by the application and never appear as a fallback after a live-data failure.

## Run locally

Use Node.js 24 LTS (validated with 24.22.2) and npm. Tests use Node's built-in test runner; server-rendered component tests use the existing TypeScript package through Node 24 import hooks. No new runtime or development dependencies were added in Phases 4–5.

```powershell
npm.cmd install
npm.cmd run dev -- --port 5173 --strictPort
```

Open **http://localhost:5173/**. Using strictPort avoids silently changing to an origin not registered with Google. On shells without PowerShell's `npm.ps1` restriction, `npm` can replace `npm.cmd`. If port 5173 is occupied, reuse/stop the existing server or explicitly register a different origin before changing ports.

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd audit
npm.cmd audit --omit=dev
git diff --check
```

`build` runs `tsc -b` before the Vite production build. Existing Vite, Tailwind, ESLint and TypeScript configuration is retained. Missing/malformed environment settings show a configuration panel instead of attempting Google authentication.

## Required environment configuration

Preserve an existing `.env`/`.env.local` and add only missing settings. If no local configuration exists, create one using `.env.example` as a template. Do not overwrite your existing settings with blank example values.

```dotenv
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_SHEET_ID=
VITE_GOOGLE_SHEET_RANGE=Sheet1!A:F
```

Use the **Web application** OAuth client ID, ending in `.apps.googleusercontent.com`, not a client secret. Set the Spreadsheet ID to the part between `/d/` and `/edit` in its URL. The range uses the tab name rather than the numeric `gid`; for a tab with spaces use `VITE_GOOGLE_SHEET_RANGE="'Profile Data'!A1:F201"`. Restart Vite after editing env files.

All `VITE_*` values are public browser configuration. Never put access/refresh tokens, client secrets, service-account keys or private keys in these settings. Actual `.env` files are ignored by Git; `.env.example` contains placeholders only. Phase 4 does not read, print or overwrite your local `.env` directly; Vite uses its normal environment loading at build/startup.

## Manual Google Cloud setup

No Cloud project, OAuth client, consent settings or Sheet permissions are created/changed by the application.

1. [Create/select a Google Cloud project](https://developers.google.com/workspace/guides/create-project) and [enable Google Sheets API](https://developers.google.com/workspace/guides/enable-apis) in that same project.
2. Configure Google Auth Platform/OAuth consent branding, support/contact details and audience. Use the appropriate Internal audience for a managed Workspace project, or External and add your intended accounts as test users while the app is in Testing. Follow the [consent setup guide](https://developers.google.com/workspace/guides/configure-oauth-consent).
3. Add the scope `https://www.googleapis.com/auth/spreadsheets.readonly` to the app's data access configuration. It is a sensitive scope, and Google consent/verification requirements apply to broader deployment. This scope is not limited to one tab/range; the application itself only requests its configured Sheet/range. See [Sheets scopes](https://developers.google.com/workspace/sheets/api/scopes).
4. Create an OAuth client of type **Web application**. For local development add **both `http://localhost` and `http://localhost:5173`** to Authorized JavaScript origins. Register each actual HTTPS deployment origin separately. Origins have no path or trailing route. This implementation uses popup/JavaScript callbacks, not an application redirect endpoint. See [Google Identity Services setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).
5. Copy the public client ID into your local `VITE_GOOGLE_CLIENT_ID`. No OAuth client secret is used by this browser app. Ensure the intended test account is allowed by the consent audience and can read the private spreadsheet.
6. Keep Google Sheets **Share → General access → Restricted**. Give that test account Viewer access (or use the owner account). Do not publish the Sheet, turn on public-link sharing or create a published CSV endpoint. Allow Google Console changes to propagate before retrying.

## Private Sheet preparation and CSV contract

Import the original assignment CSV using **File → Import → Upload** in Google Sheets. Confirm comma separation, a header at row 1 and the expected **200 data records plus one header**. Do not fill gaps with invented records. The spreadsheet document title, bottom tab name, Spreadsheet ID and tab `gid` are distinct. See [CSV import](https://support.google.com/docs/answer/40608?hl=en) and [Spreadsheet ID/A1 notation](https://developers.google.com/workspace/sheets/api/guides/concepts).

Required columns: `Name, Photo, Age, Country, Interest, " Net Worth "`. Header matching trims whitespace/BOM, normalizes common nonbreaking spaces, collapses header whitespace and ignores case. Columns may be reordered; unrelated extra columns are ignored. Each required column must appear exactly once. Photo cells must contain actual HTTPS image URL text, not IMAGE/HYPERLINK formulas that return another display value.

The unchanged Phase 3 parser returns `{ ok: true, records: Person[] }` or `{ ok: false, error }`. Validation is **all-or-nothing**: no invalid rows are silently dropped and no partial dataset is rendered. Order and duplicates are preserved. Row-specific issues identify the one-based sheet row, column within the returned range, field and corrective message without echoing raw cell values.

- All six fields are required; Name, Country and Interest must be nonempty text. Outer whitespace is trimmed and U+00A0/U+202F spaces are normalized.
- Age must be a finite, nonnegative safe integer. Numeric cells and integer strings (including `30.0`) are accepted; fractions, dates, exponent/hex text and booleans are rejected.
- Net Worth accepts finite numeric cells or USD strings with optional `$`, `US$` or `USD`, valid comma/space grouping and at most two dot-decimal places. `$251,260.80` is valid; `1,2,3` is not. A leading sign before the prefix is allowed. Other currencies, decimal-comma formats and accounting parentheses are not inferred or converted. Amounts use JavaScript numbers.
- Photo must be an absolute HTTPS URL without embedded credentials, control characters or unescaped internal whitespace. URL syntax is validated; availability/embeddability is not. Failed images use the existing initials fallback.
- Empty/all-blank and valid header-only ranges produce an empty state. After headers, every returned row is validated, including blank rows and missing trailing cells. Malformed envelopes and column-major responses are rejected. Google can omit trailing empty rows/cells or `values` on an empty range.
- Text is rendered using React text content/attributes, never unsafe HTML. The legacy `normalizePerson` helper remains for Phase 1 compatibility, but the live reader exclusively uses the stricter Phase 3 parser.

Configuration accepts tab-qualified column ranges starting at row 1 and spanning at least six columns, optionally ending at a row bound. Named ranges/R1C1 and ranges starting below row 1 are outside this contract. The parser itself has no fixed record-count gate: valid dynamic datasets render, while the source badge explicitly reports whether the expected 200 profiles were loaded.

## Phase 4 authentication and data flow

1. Validate all public configuration before mounting the connected application.
2. Load the official `https://accounts.google.com/gsi/client` script through a shared, bounded loader. StrictMode reuses its pending load; failure/timeout offers Retry Google service.
3. Render Google's official sign-in button with `google.accounts.id.initialize`/`renderButton`. No automatic One Tap prompt is requested. Successful identity callbacks supply basic account name/email for display. The button remains retryable if sign-in is cancelled or closed; GIS does not provide this button with the OAuth token client's popup-close callback.
4. A separate **Connect Google Sheets** click synchronously calls `google.accounts.oauth2.initTokenClient` and `requestAccessToken`, requesting only `spreadsheets.readonly` with `include_granted_scopes: false`. The signed-in account's subject is supplied as a login hint. Google enforces access based on the actual OAuth account/grant, not the app's display identity.
5. Check the granted scope and token lifetime, then automatically invoke the existing Phase 3 `createGoogleSheetsReader().readProfiles(accessToken, signal)`. The reader performs only an authenticated GET to the [Values API](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get), with `majorDimension=ROWS` and `valueRenderOption=UNFORMATTED_VALUE`. The ID token is never sent as a Sheets bearer token.
6. On success, pass the normalized array directly to the existing visualization. Refresh uses a valid in-memory OAuth token and keeps the current scene visible while loading. A failed refresh clears the old visualization and displays actionable errors; it never substitutes sample records.
7. Token expiry (with a 15-second safety margin) cancels reads, clears the loaded profiles and offers **Authorize again**. No silent authorization or automatic popup is attempted. A Refresh click with an expired token also initiates a user-triggered authorization flow.
8. Sign out clears identity/token/profile state and expiry timers, aborts pending reads, disables automatic account selection and attempts revocation of the available app access token. Late callbacks cannot restore data. Signing out of DataSphere does **not** sign out of Google globally. A token popup already open may need to be closed manually; its stale result is ignored.

The SDK/button handles Google account sign-in; the OAuth token client handles permission to access Sheets. These are separate operations. See the [GIS authentication reference](https://developers.google.com/identity/gsi/web/reference/js-reference), [authorization reference](https://developers.google.com/identity/oauth2/web/reference/js-reference) and [browser token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model).

### Phase 4 files and responsibilities

- `src/config/appConfig.ts`: validates client ID and reuses Phase 3 Sheet config validation.
- `src/types/googleIdentity.ts`: minimal official GIS API surface, display user, grant and adapter contracts.
- `src/auth/loadGoogleIdentity.ts`: shared script load, timeout, retry and settled-listener cleanup.
- `src/auth/identityClaims.ts`: display-only JWT decoding and audience/issuer/expiry/nonce sanity checks.
- `src/auth/googleIdentity.ts`: GIS sign-in button, explicit OAuth token requests, scope checks, nonce rotation, sanitized failures, revocation and late-callback guards.
- `src/auth/sessionController.ts`: observable, framework-independent lifecycle; memory-only grant, expiry, refresh, cancellation and error-state handling.
- `src/auth/sessionView.ts`: production visualization data selection and live source/expected-count labels; no fixture import or fallback.
- `src/hooks/useDataSphereSession.ts`: React subscription and StrictMode-safe startup/teardown through `useSyncExternalStore`.
- `src/components/auth/GoogleSignInButton.tsx`, `SessionPanel.tsx`: official button host, loading/auth/error/empty UI and corrective details.
- `src/App.tsx`: configuration gate and production live-data integration. `AppLayout.tsx` displays account actions and live source metadata.
- `src/components/visualization/VisualizationScene.tsx`: only source/empty-state copy and a source-label prop changed. Layout geometry, rendering factory, animation, wealth colors and camera controls are unchanged.
- `src/config/googleSheets.ts`, `src/services/googleSheets.ts`, `src/data/parseSheetValues.ts` and Phase 3 data contracts are reused unchanged.
- `.env.example`: adds the public client-ID placeholder. Actual user `.env` files and dependency manifests are unchanged.
- New tests: `tests/googleIdentity.test.mjs`, `sessionController.test.mjs`, `sessionUi.test.mjs`, `loadGoogleIdentity.test.mjs`; synthetic GIS helpers in `tests/fixtures/googleIdentity.mjs`, and a Node/TypeScript-only component test loader in `tests/helpers/tsx.mjs`.

The session state separates configuration errors, SDK loading/unavailability, signed out, signed in without authorization, authorizing, loading, ready, empty, validation/API errors, permission denied and expired authorization. Click guards prevent duplicate token/data requests. AbortController plus lifecycle/request generations reject stale results on sign-out, account changes, unmount or StrictMode restarts. React removes the old CSS3D objects/listeners before rebuilding when the validated records change; the current arrangement remains selected on successful refresh.

## Existing visualization algorithms

- **Table:** `column = index % 20`, `row = floor(index / 20)`. Centered spacing is 248 in X and 304 in Y; 200 records produce exactly 20 columns and 10 rows.
- **Sphere:** equal-area latitude bands and the golden-angle Fibonacci spiral. Radius scales with count/card dimensions; card normals point outward.
- **Double Helix:** `strand = index % 2`, `level = floor(index / 2)`, angle `level * π/6 + strand * π`. Two opposing strands around Y, radius 720, vertical step 104, outward-facing cards.
- **Grid:** X varies fastest (5), then Y (4), then Z (10 at 200 records); centered spacing 248/304/420. An oblique initial camera reveals depth.

The selected layout reuses its scene/objects. Layout changes animate positions and quaternions for 900 ms, honor reduced motion and cancel the previous transition when switching rapidly. Idle scenes render on input/resize; pending animation frames are cancelled on teardown. Net Worth remains red below $100,000, orange from $100,000 through $200,000 inclusive and green above $200,000.

## Manual browser acceptance checklist

Live Google login, consent, private Sheet retrieval and browser rendering have **not been verified by this implementation session**. Complete these with your own configured test account; never paste tokens into chat, screenshots, logs or tests.

1. With a required setting missing, confirm the configuration panel identifies it and no fictional cards appear. Restore the setting/restart Vite. Block the GIS script to check the loading/error/retry path.
2. Open http://localhost:5173/ with a configured Web client. Confirm branding and Google's sign-in button. Cancel/close sign-in, retry, then sign in. Confirm basic account name/email and that Sheets is not requested until **Connect Google Sheets** is clicked.
3. Cancel/deny the Sheets consent popup and confirm a retryable message. Retry from the button, allow the read-only permission, and confirm only validated live profiles appear. Verify the source badge reports 200 profiles (or visibly states a count difference).
4. Verify row order, photos/initials fallback, all displayed profile fields and wealth colors against the private source. Test the Table 20×10, Grid X=5/Y=4/Z=10, Sphere and two Helix strands at 200 records.
5. Exercise rotation, scroll/button zoom, mouse/touch/keyboard pan, Fit all, Reset, rapid layout changes, reduced motion and mobile resizing. Confirm one scene subtree and no growing listeners/frame chains after repeated changes.
6. Change a Sheet value, click Refresh data and confirm the update/current layout. Repeated clicks should cause one read. Temporarily disconnect the network; confirm an actionable error and no sample fallback, then reconnect/retry.
7. Use a copied test Sheet or reversible edits to check empty data, missing headers, malformed age/net worth/photo URLs and omitted cells. Confirm row/column validation details and zero partial profiles; restore the data afterward.
8. Test a valid account without Sheet access (403), then grant Viewer permission and Retry. Test token expiry/401; confirm profiles clear and renewal requires an explicit click, with no automatic popup.
9. Sign out during authorization, initial loading and refresh. Confirm identity/profiles clear, pending data requests abort and late responses do not restore them. Reload/sign in with another account and verify the former account's data is absent. Google itself should remain signed in.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Configuration required | Add the three public settings to the existing local env file, validate client/Sheet ID and tab-qualified range, then restart Vite. |
| Invalid origin / origin_mismatch | Register the exact scheme/hostname/port in the same Web client used by the app. Use localhost:5173 consistently; do not interchange localhost/127.0.0.1 or auto-selected ports. |
| Consent blocked / access_denied | Check audience/test-user enrollment, requested read-only scope, account policies and project consent configuration. Retry explicitly after correcting them. |
| Popup blocked or closed | Allow popups and relevant Google sign-in/browser settings, then use the button again. Requests are initiated synchronously from clicks. A closed sign-in dialog leaves the Google button usable. |
| Google service unavailable | Check network/content blockers/CSP. Retry Google service; the loader times out rather than waiting forever. |
| 401 / token expired | Use Authorize again; tokens are short-lived and are never restored from storage. |
| 403 / permission denied | Confirm Sheets API is enabled, the selected account has access to the private Sheet, the consent audience allows it and read-only permission was granted. Retry data or Authorize again after fixing access. |
| 404 / range error | Check the Spreadsheet ID, actual tab name and A1 range. A numeric gid is not a tab name. |
| 429 / API/network error | Retry later or after connectivity is restored. The app does not automatically loop requests. |
| Invalid data | Expand validation details and fix the reported header/row/column/field; there is no silent row dropping. |
| Photos show initials | Check that URLs return embeddable HTTPS images rather than a Drive/web-page preview or expired signed link. |
| Popup communication/COOP warnings | Review deployment headers against [Google's setup guidance](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid). Where needed, use compatible popup/COOP and CSP policies; do not blindly add isolation headers that break GIS. |

See Google's [OAuth error guide](https://developers.google.com/identity/oauth2/web/guides/error) for consent/popup/configuration troubleshooting. Do not expose tokens or raw private API bodies when collecting diagnostics.

## Validation recorded

- `npm.cmd run lint`: passed.
- `npm.cmd run test`: **85 passed** (all 79 Phase 1–4 tests unchanged, six added in Phase 5). Coverage includes configuration, GIS loading/initialization, sign-in success/failure/cancellation retry, OAuth success/denial/scopes/popups, bearer handling, live data selection, generated 200-row parsing/geometry, malformed/empty data, network/401/403 states, refresh, expiry, revocation, sign-out, stale results/account changes and StrictMode-like teardown. New coverage validates all six fields on 200 server-rendered tiles, rendered wealth boundaries, escaped/long text, changed-data refresh and real Three.js scene lifecycle with a synthetic DOM. These are not browser tests.
- `npm.cmd run build`: passed TypeScript and production compilation.
- `git diff --check`: passed.
- `npm.cmd audit` and `npm.cmd audit --omit=dev`: zero reported vulnerabilities, including development and production dependencies (2026-11-23). No dependency upgrades were needed. This is an advisory snapshot, not a guarantee against unknown vulnerabilities.
- Google SDK and HTTP behavior in automated tests is mocked. No real OAuth tokens or live Google API requests are used. Phase 2 browser acceptance was previously reported passed by the project owner; this is not a claim that the new Phase 4 flow has been browser-tested.

## Security considerations and known limitations

This is a **frontend-only application, not a server-verified application session**. JWT decoding and nonce/audience/issuer/expiry checks support display state only; they do not cryptographically verify the ID token's signature. Do not use this UI state as authorization for any future privileged server endpoint. Such an endpoint would need independent verification, as described in [Google's server verification guide](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token). Google itself enforces private Sheets API access through the OAuth grant and spreadsheet permissions.

Only an in-memory access token is retained, outside React's public snapshot. The ID credential is not retained after display-claim extraction. Nothing is written to localStorage, sessionStorage, application cookies or URL parameters; there are no refresh tokens or client secrets. Application errors do not log tokens, raw API bodies or account details. A reload starts signed out. Sign-out revocation is best effort and does not globally log out the user's Google account. External Google SDK/browser cookies are managed by Google, not used as application token storage.

Browser JavaScript can access its own memory, so XSS or compromised dependencies could expose an in-memory token. Production needs HTTPS, reviewed dependencies/hosting headers, compatible CSP/COOP, consent/verification/privacy requirements and real cross-browser acceptance. Keep the Sheet private and never bypass consent with public CSV or API-key access. Image URLs are validated for syntax, not availability or privacy suitability.

Overview cards can be small or occluded in depth; orbit/zoom to inspect them. Back faces are hidden and cards can cross during transitions. CSS3DRenderer has browser/display-zoom limitations, so validate at 100% zoom. The parser accepts dynamic counts but the actual assignment dataset and external image availability still need live verification.

Phase 5 reduces duplicate camera renders, memoizes unchanged profile tiles, corrects portrait descriptions, contains long country/wealth lines and raises secondary text contrast. Scene tests check 200 objects across repeated arrangements, rapid cancellation, teardown/remount, zero-size/portrait resize and Fit all card-corner framing in landscape and portrait views. Browser frame rate, heap retention, touch behavior and assistive-technology behavior are still manual checks. See the [Phase 5 acceptance audit](docs/phase-5-qa.md) for evidence, changed files, remaining limitations and the acceptance checklist.

## Vercel deployment preparation (not deployed)

Perform these steps only after the project owner authorizes deployment. No deployment, commit, push or Google Cloud change was made during Phase 5.

1. Import the intended Git repository into Vercel; select the project root containing `package.json`. Choose the **Vite** framework preset, Node.js **24.x**, build command **`npm run build`** and output directory **`dist`**. Use the committed lockfile for reproducible installation (`npm ci`). See [Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite).
2. In the appropriate Vercel environment (Production, and Preview only when needed), add `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_SHEET_ID` and `VITE_GOOGLE_SHEET_RANGE`. Use public identifiers and the actual private Sheet/tab range, never tokens or secrets. Include row 1 and all 200 records: `Sheet1!A:F` or the actual tab-qualified `A1:F201` range. These values are bundled at build time; redeploy after changing them.
3. Obtain the final stable HTTPS hostname/custom domain. In **Google Cloud / Google Auth Platform → Clients → the same Web application client → Authorized JavaScript origins**, register its exact origin, e.g. `https://your-project.vercel.app`, without a path. Save and allow propagation. Register preview origins individually only when deliberately used; a changing preview URL is not a stable reviewer URL. Popup callbacks need no new application redirect endpoint. Follow [Google's origin and header guidance](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).
4. Confirm Sheets API is enabled in that project, the consent audience permits the reviewer, `spreadsheets.readonly` is configured, and the reviewer's Google account has private Sheet Viewer access. Cloud configuration and deployment require owner approval.
5. After an authorized deployment, run the entire manual acceptance checklist on the final HTTPS origin. Check root refresh, favicon/CSS/JS loading, response headers, Google popup communication, live count/order, external images, refresh, expiry and sign-out. Check console/network errors without copying private response bodies or tokens.

`vercel.json` adds three response headers: `nosniff`, `strict-origin-when-cross-origin`, and `Cross-Origin-Opener-Policy: same-origin-allow-popups` to preserve GIS popup communication. Syntax follows [Vercel's header configuration](https://vercel.com/docs/project-configuration/vercel-json#headers); headers have not been validated on a hosted deployment. No enforced CSP is added: GIS scripts/frames/connections, Sheets API, arbitrary validated HTTPS photo hosts and CSS3D inline styles need a deliberate compatible policy. Follow Google's setup guidance and test any future policy before enforcing it.

The app currently has only the root route, so it needs no SPA catch-all rewrite. Vite emits hashed JS/CSS and copies the favicon; production source maps are not enabled. No cache override is introduced: retain Vercel's framework/CDN defaults, then verify HTML revalidation and hashed asset behavior on the actual host. `npm run preview` can smoke-test the local build but cannot verify Vercel response headers or replace deployed QA.

## Approved reviewer access and submission checklist

A public Vercel website **does not make OAuth publicly accessible**. External OAuth in Testing permits only the approved test audience; add the actual reviewer's Google account as a test user and separately grant private Sheet Viewer access. Internal Workspace audience/account policies may exclude outside reviewers. Coordinate an allowed reviewer account before submission. Do not publish OAuth merely to bypass tester restrictions; broader public access must meet Google's [production policy and verification requirements](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance).

- [ ] Owner approves publishing and Cloud changes; deploy the reviewed revision to a stable HTTPS URL.
- [ ] Register that exact production origin on the configured Web OAuth client.
- [ ] Reviewer can reach the site without an unintended Vercel access gate and can complete Google sign-in/Sheets consent with their approved account.
- [ ] Original CSV is imported into the private Sheet, and the configured range returns all 200 rows in source order with all six fields correct.
- [ ] Complete the manual browser checklist and the detailed [Phase 5 checklist](docs/phase-5-qa.md#manual-browser-acceptance); record browser/device/date/results without credentials.
- [ ] Recheck lint, all tests, build, dependency audit and diff before the eventual approved commit/push.
- [ ] Submit the working URL and required project/documentation details. Do not submit credentials or make the private Sheet public.

The working hosted URL, real dataset confirmation and authenticated browser acceptance remain outstanding submission requirements.
