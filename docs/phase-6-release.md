# DataSphere Phase 6 release runbook

Prepared 2026-11-23. **Release preparation only; Phase 6 is not complete and the release is not approved.** Live authenticated acceptance, the original private 200-record dataset and a production HTTPS URL have not been verified in this session. No commit, push, GitHub repository/release creation, Vercel deployment, Google Cloud change, Sheet sharing change or submission was performed.

## Requirement audit

“Implemented and verified” below means the specified code/automated behavior was checked, not that the authenticated browser flow passed. All browser acceptance remains a separate gate.

| # | Requirement | Classification | Evidence / remaining gate |
| --- | --- | --- | --- |
| 1 | CSV imported into Google Sheets | Implemented but live/manual verification pending | Import instructions and compatible parser exist. Actual CSV import is unconfirmed; owner must compare the private Sheet with the supplied CSV. |
| 2 | Google Sign-In | Implemented but live/manual verification pending | Official GIS popup/button flow with mocked success, denial/cancellation, retry and stale-callback tests. Real browser/reviewer sign-in remains pending. |
| 3 | Retrieve Google Sheets records | Implemented but live/manual verification pending | Read-only OAuth and authenticated GET/parser covered with mocked HTTP. Actual private Sheet retrieval is unconfirmed. |
| 4 | Name, Photo, Age, Country, Interest, Net Worth | Implemented and verified | All 200 generated parsed profiles server-render all six fields in order. Real photo loading and browser readability remain pending. |
| 5 | Red < $100K; orange $100K–$200K inclusive; green > $200K | Implemented and verified | Numeric and rendered wealth-class tests include both equality boundaries. |
| 6 | Table, Sphere, Double Helix, Grid | Implemented and verified | All target algorithms, transitions, reduced motion and real Three.js object lifecycle covered; synthetic DOM is not browser acceptance. |
| 7 | Table exactly 20 × 10 for 200 | Implemented and verified | Centered index-based geometry has exactly 20 X positions and 10 Y positions. |
| 8 | Two intertwined helix strands | Implemented and verified | Two strands offset by π, 100 paired levels, spacing/outward normals and unique finite targets tested. |
| 9 | Grid X=5, Y=4, Z=10 for 200 | Implemented and verified | Exact dimension counts, centered bounds and target uniqueness tested. |
| 10 | Public HTTPS submission URL | Not implemented | No deployment was performed and no verified production URL is available. |

## Repository and security inspection

- Branch: `feat/phase6`. Initial working tree was clean, with no staged, modified or untracked files.
- No Git remotes configured; no GitHub repository URL is established. Repository visibility and destination remain owner decisions.
- Six existing commits are preserved, newest first: `4937107` Phase 5 QA/readiness; `6f4c303` Google sign-in/live Sheets integration; `3a1157b` Sheets adapter/parser; `8d630fd` advanced layouts; `f4abcad` Phase 1; `ac64373` initial project. No squash, reset, rebase or branch rename is proposed.
- Pending commit after preparation: modified `README.md` and new `docs/phase-6-release.md`. No app source, tests, dependencies, configuration or lockfile changed in Phase 6. The Phase 5 functionality is already committed.
- Excluded from commit: actual `.env` and any `.env.*` other than `.env.example`, `node_modules`, `dist`, local editor/log artifacts per `.gitignore`. Only `.env.example` is tracked among env files. Ignore checks for `.env`, `.env.local`, `.env.production`, `node_modules` and `dist` passed; this does not imply those optional env files all exist.
- The existing `.env` was inspected programmatically without displaying values and was not modified. The production config validator accepts the three required public settings. No unexpected `VITE_*` keys were found in the resolved production configuration. `.env.example` contains blank client/Sheet identifiers and a sample range, with no credential values.
- `package-lock.json` is tracked, lockfile version 3, and its root dependency specifications match `package.json`. Use Node 24.x and `npm ci` on clean installs; no dependency upgrades were needed.
- Pattern scan of all 65 initially tracked files and four built files found no likely Google access tokens, Google client secrets/API keys, GitHub tokens, AWS access IDs, private-key blocks or long literal credential assignments. It reports categories/paths only. No non-public local env literal values of at least eight characters were found in the build. These are bounded heuristic checks, not a guarantee of absence or a historical Git secret scan. Before approving a public push, review the intended full history with an appropriate secret scanner if additional assurance is required.
- Vite configuration retains React/Tailwind and default static output. App reads only `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_SHEET_ID`, `VITE_GOOGLE_SHEET_RANGE`; their values are deliberately public build-time configuration. OAuth tokens, client secrets and keys must never be Vite variables. Sheet ID visibility does not grant private Sheet access.
- Build contains HTML, hashed JS/CSS and favicon only; zero `.map` files. Pattern scan found no likely credential material in those public assets. Runtime OAuth tokens are acquired after build and retained only in memory. Source inspection/tests confirm no local/session storage or fictional-data fallback.
- HTTPS image URL validation rejects embedded credentials and unsafe schemes; controlled initials fallback handles failures. Image availability, third-party tracking/privacy and actual browser fallback remain manual checks.
- Frontend ID-token decoding is display-only and does not verify signatures/create server authorization. Google enforces the actual OAuth grant and Sheet ACL. Read-only scope remains `https://www.googleapis.com/auth/spreadsheets.readonly`; no broader scope was added.
- Existing Vercel COOP/nosniff/referrer headers are retained; no blind CSP or cache/routing changes. Google popup/header compatibility still requires deployed browser testing.

## Actual local validation

| Check | Outcome |
| --- | --- |
| `npm.cmd run lint` | Passed, exit 0 |
| `npm.cmd run test` | 85 passed; zero failed, skipped or cancelled; exit 0 |
| `npm.cmd run build` | TypeScript and Vite 8.3.8 build passed, exit 0 |
| `npm.cmd audit` | Zero reported vulnerabilities across the full dependency tree, including development dependencies; exit 0 |
| `npm.cmd audit --omit=dev` | Zero reported production dependency vulnerabilities; exit 0 |
| `git diff --check` | Passed, exit 0 |
| `git status` | Reviewed; only the two documentation files above are pending after preparation |
| Local HTTP preview smoke check | Root HTML, favicon, JS and CSS returned HTTP 200 with expected content types; server stopped afterward |
| Production output | HTML 0.63 kB, CSS 17.06 kB, JS 382.58 kB (116.22 kB gzip); not a runtime performance benchmark |

The advisory requests initially failed under network sandbox restrictions; approved network-enabled reruns succeeded. Counts above are the successful real audit results, not cached Phase 5 claims. No changes to code/dependencies required repeating the full checks after documentation edits; the final diff/status checks cover those edits.

No browser automation tool is available in this environment. The HTTP smoke check does not execute React or test Google sign-in, consent, images, console errors or Vercel headers. Unit tests use synthetic fixtures/mocked Google services; lifecycle tests use actual Three.js with a synthetic DOM. No actual OAuth credentials/tokens were used in tests or logs.

## Local manual acceptance gate

Record browser/version, OS/device, viewport, date, dataset count and pass/fail. All items are currently **pending in this session**. Keep this evidence separate from production acceptance. Never share credentials, raw API responses or private profile screenshots. Test changes on an owner-approved copy of the Sheet rather than altering the assignment's real records.

- [ ] Google Sign-In succeeds; cancellation/retry remains usable.
- [ ] Separate Connect Google Sheets action requests and receives read-only permission.
- [ ] All 200 actual source profiles load in the original order; verify the CSV import and inclusive range (`A:F` or actual tab `A1:F201`).
- [ ] All six fields agree with first, middle and last source rows and representative edge cases.
- [ ] Portraits load or show controlled initials fallback.
- [ ] Wealth colors include the documented equality handling.
- [ ] Table has exactly 20 columns × 10 rows.
- [ ] Sphere is navigable with outward-facing tiles.
- [ ] Double Helix has two visible intertwined strands.
- [ ] Grid has X=5, Y=4, Z=10.
- [ ] Refresh retrieves an approved source change and retains the selected arrangement; validate using a test copy if editing is necessary.
- [ ] Sign-out clears account/profile state; late requests cannot restore it.
- [ ] Rapid layout switching remains stable; reduced-motion preference is honored.
- [ ] Rotation, zoom, pan, Fit all and Reset work.
- [ ] Desktop/mobile, keyboard focus/navigation and touch behavior are acceptable.
- [ ] Browser console has no unexpected runtime errors; never log bearer headers or tokens.

Incomplete local acceptance blocks declaring the release fully approved. Prior resolution of Google's test-user restriction does not prove this complete flow.

## Proposed GitHub publication plan — do not execute without approval

Only documentation remains to commit; the existing implementation history is preserved. Proposed message: `docs: prepare DataSphere release and submission`. A new aggregate feature commit is unnecessary because the features are already in six commits. Do not amend/squash them to manufacture a release commit.

First, the owner must select the GitHub account/repository and visibility. If none exists, use GitHub's New repository UI and create an **empty** repository without an initial README, license or ignore file. Repository creation is itself a remote action requiring separate approval. Authenticate through Git Credential Manager/browser or an SSH agent; never embed a password/token in a remote URL. See [GitHub repository creation](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository).

After the destination is known and the owner approves the specific actions, proposed commands are:

```powershell
# Proposal only. Review the two-file change before staging/committing.
git diff -- README.md
Get-Content -LiteralPath docs/phase-6-release.md
git add -- README.md docs/phase-6-release.md
git diff --cached --check
git diff --cached --stat
git commit -m "docs: prepare DataSphere release and submission"

# Replace OWNER/REPOSITORY with the approved empty destination, never credentials.
git remote add origin https://github.com/OWNER/REPOSITORY.git
git push -u origin feat/phase6
```

The review/staging/commit/publication sequence above is proposed only; it has not been executed. The destination is intentionally a placeholder, not an approved exact remote.

The push publishes the existing history plus the documentation commit on `feat/phase6`. Do not force-push. If the destination is nonempty, stop and inspect its branches before choosing integration steps. Do not automatically push to/rename `main`. When importing into Vercel, confirm the intended production branch is `feat/phase6`, or obtain approval for a normal integration into the owner's preferred branch first. A push to an already connected Vercel branch may trigger a deployment, so its approval must account for that remote effect.

No tag or GitHub Release is needed for the assignment unless specifically required. Any later tag/release publication requires its own proposed version, notes and explicit approval.

## Vercel deployment plan — approval required

1. After an approved GitHub push, open Vercel → Add New → Project and import the approved repository. Use the root containing `package.json`; choose the intended owner/team and review access/visibility. Importing and clicking Deploy can publish immediately, so stop for approval before confirming deployment.
2. Configure **Vite**, **Node 24.x**, **install `npm ci`**, **build `npm run build`**, **output `dist`**. Confirm the correct production branch; no app route beyond `/` requires SPA rewrites. Retain `vercel.json`.
3. Add these in the Production environment: `VITE_GOOGLE_CLIENT_ID` (existing public Web client ID), `VITE_GOOGLE_SHEET_ID` (private document's public identifier), `VITE_GOOGLE_SHEET_RANGE` (actual tab/range including the header and all 200 rows). Do not paste local `.env` into Git or add secrets/tokens. Configure Preview separately only if deliberately used. Local `.env` stays untouched.
4. After approval, deploy the selected revision. In Project → Deployments, open the deployment and inspect **Build Logs** for install/TypeScript/Vite failures. Do not print env values while troubleshooting. Browser runtime failures belong in browser Console/Network; this static app has no backend runtime logs.
5. Once the production deployment is Ready, use the stable domain shown for that project's Production deployment, or an approved custom domain, as the canonical submission URL. A deployment-specific preview hostname is not automatically the stable production domain. Verify the actual URL; `https://datasphere-example.vercel.app` is an example only.
6. Register the exact canonical origin in Google Cloud as described below, with separate owner approval. Keep the final URL marked pending until authenticated production acceptance passes.
7. Vite env values are compiled into assets. After changing a variable, trigger an approved **new build/redeploy** of the intended revision/environment; refreshing the browser cannot update an old bundle. Verify the resulting deployment and domain mapping again.

References: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Vercel build logs](https://vercel.com/docs/deployments/logs). No CLI deployment or temporary public deployment is proposed/executed here.

## Google Cloud production origin — approval required

The inspected code uses GIS `ux_mode: 'popup'` with an identity callback and `google.accounts.oauth2.initTokenClient` with token callbacks. It does not use an application redirect handler or authorization-code exchange.

After the real canonical hostname is known, the owner should open the **same Google Cloud project → Google Auth Platform → Clients → existing Web application client** used by `VITE_GOOGLE_CLIENT_ID`. With approval, add the exact origin to **Authorized JavaScript origins**, such as `https://datasphere-example.vercel.app` only if that were the actual assigned hostname. Include scheme and hostname (and port if applicable), no path/query/fragment. Keep the existing local origins `http://localhost` and `http://localhost:5173` for development. A custom domain or intentional preview domain is a separate origin; do not assume a wildcard covers it.

**Authorized redirect URIs** identify callback endpoints for redirect/code flows. This app's JavaScript popup/token callbacks do not require adding a new redirect URI. Do not add guessed `/callback`, `/auth` or localhost redirect endpoints. Preserve unrelated existing client settings. The public website URL is an entry point for reviewers; the origin configured in Google is its scheme/host, not a route. Follow [Google's GIS setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) and [token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model).

Keep Google Sheets API enabled in that project and the existing read-only scope. Allow settings to propagate, then retry from a user click on the canonical HTTPS site. Google Cloud changes were not performed in this phase.

## Reviewer access gate — sharing changes require approval

The supplied project context states that earlier assignment documents had **conflicting reviewer-sharing information**. Those conflicting source documents are not available here for independent reconciliation. Confirm the correct recipient and their actual Google account directly with the assignment contact; no reviewer email is invented or pre-filled. Resolve this before consent enrollment, private sharing or submission.

- [ ] Confirm the intended reviewer identity/account and the current authoritative sharing instructions.
- [ ] Verify the canonical website opens from an independent browser without an unintended Vercel authentication/access gate.
- [ ] Confirm OAuth audience permits that account. For External Testing, the owner may need to add it under Google Auth Platform → Audience → Test users. Internal Workspace audience/policies can exclude external reviewers. Owner approval is required before any change.
- [ ] Separately grant the confirmed reviewer Google account **Viewer** access to the intended private Sheet, with owner approval; keep General access Restricted.
- [ ] Keep Sheets API enabled and request only read-only Sheets permission. Confirm the reviewer can sign in, consent, load all 200 records and test each arrangement using their own account.
- [ ] Never share an owner token/password or make the Sheet public as an access workaround.

A reachable website and OAuth permission are separate from Sheet sharing. The previously resolved test-user issue does not confirm an unknown reviewer's access. Publishing OAuth broadly can require consent-branding/privacy/domain/sensitive-scope verification work; do not publish merely to bypass Testing restrictions. See [Google consent/audience setup](https://developers.google.com/workspace/guides/configure-oauth-consent) and [production policy requirements](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance).

## Production acceptance — separate evidence from local checks

All production results are **pending**. After an approved deployment and Cloud/sharing configuration:

- [ ] Record canonical HTTPS URL, deployed revision, date, browser/device and reviewer/account role without recording credentials.
- [ ] Open the canonical URL in a fresh browser; root reload, favicon, JS and CSS work with no unintended host gate or mixed-content failures.
- [ ] Inspect actual COOP/nosniff/referrer headers and caching; confirm popup communication. Local Vite preview does not apply Vercel headers.
- [ ] Google Sign-In works on that exact origin; cancellation/retry and separate read-only Sheets consent behave correctly.
- [ ] All 200 actual records load in source order; all six fields, real images/fallback and wealth colors agree with source.
- [ ] Table 20×10, Sphere, two-strand Helix and Grid X=5/Y=4/Z=10 transition correctly; rapid switching, reduced motion, camera controls, Fit all and Reset work.
- [ ] Refresh, expiry/re-authorization and sign-out work; user data clears and stale responses cannot restore it. Use an approved test copy for any edit-based checks.
- [ ] Test a permitted Google account without Sheet permission for an actionable access error; an OAuth-unapproved account may be blocked by Google's consent screen before reaching the app. No fallback records appear.
- [ ] Check desktop/mobile/touch/keyboard behavior and unexpected Console/Network errors. Keep sensitive bodies/headers out of logs/screenshots.
- [ ] Review public assets, logs and repository for unintended credential exposure. Only deliberately public Vite configuration should be present; OAuth credentials must not be embedded.
- [ ] Repeat with the confirmed reviewer's own authorized account, then record acceptance separately from the local checklist.

Do not mark the production URL, authentication or Sheet flow verified until these checks actually succeed.

## Preliminary submission email — draft only

Send only after production/reviewer acceptance is recorded and final submission is explicitly approved. Replace placeholders with verified details; omit the repository line if not requested. This template is not evidence that a deployment exists.

```text
Subject: DataSphere — Interactive 3D Data Visualization Assignment

Dear [Confirmed reviewer/contact name],

Please find my DataSphere assignment below:

Live website: [Verified canonical HTTPS website URL]
GitHub repository: [Approved repository URL, if appropriate]

The application uses React, TypeScript and Three.js to display Google Sheets
profiles in Table, Sphere, Double Helix and Grid arrangements. It includes
Google Sign-In, separate read-only Sheets authorization, wealth-based colors,
animated transitions, camera controls, refresh and sign-out.

Please use [Confirmed authorized Google account] for access to the private
dataset. [Include this sentence only after its permissions are verified.]

Setup, testing and known limitations are documented in the README.

Kind regards,
[Your name]
```

## Final submission gates

- [ ] Local real-data/browser acceptance is recorded; 200 actual records verified.
- [ ] Destination repository, visibility, commit and push separately approved and performed without history rewrite or secrets.
- [ ] Vercel deployment approved, successful and tied to the intended revision/production branch.
- [ ] Canonical HTTPS origin registered with approval; runtime authentication and Sheet access verified there.
- [ ] Conflicting reviewer details resolved; approved test-user enrollment and private Sheet access confirmed.
- [ ] Full production acceptance passes on desktop/mobile and the reviewer account.
- [ ] Final URLs replace placeholders in the submission draft; owner approves sending.

Until these gates pass, the remaining blockers are a missing Git remote/destination, incomplete manual acceptance, no verified deployment URL/origin and unconfirmed reviewer access. Release preparation and automated validation are done; Phase 6 remains open. Stop before each publication/Cloud/sharing/submission action and obtain approval for its exact destination and effect.
