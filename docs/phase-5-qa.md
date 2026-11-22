# Phase 5 QA and readiness audit

Reviewed 2026-11-23. Scope: existing React/Vite/TypeScript, Three.js CSS3D, GIS and read-only Sheets implementation. No production data, environment files, dependencies, Google Cloud settings or Git history were changed. No commit, push or deployment was performed.

## Assignment acceptance audit

| # | Requirement | Evidence and remaining verification |
| --- | --- | --- |
| 1 | Google Sheet imported from supplied CSV | Parser/reader accept all 200 generated rows in order without truncation or silent omission. Original CSV import and private Sheet contents require owner/reviewer verification. |
| 2 | Google sign-in | Official GIS button, bounded SDK loader and separate authorization are covered with mocks. Real login/popup/cookies remain untested this session. |
| 3 | Retrieve live Sheet data | Authenticated GET, read-only scope, validation, cancellation and sanitized errors tested with mocked HTTP. No actual private Sheet read performed. |
| 4 | Six profile fields | All 200 parsed fixtures server-rendered; name, HTTPS photo URL/alt, age, country, interest and formatted worth verified for each. Actual images/visual rendering remain manual. |
| 5 | Wealth colors | Below $100K red; $100K through $200K inclusive orange; above $200K green. Numeric and rendered-class boundary tests pass. Visual contrast remains part of browser acceptance. |
| 6 | Four arrangements | Table, Sphere, Helix, Grid geometry and real Three.js object transitions tested. Final browser interaction required. |
| 7 | Table 20 × 10 | Index-driven centered coordinates tested at 200 items: exactly 20 X and 10 Y values. |
| 8 | Genuine double helix | 100 paired levels, two strands offset by π radians; spacing, outward normals and final separation tested. |
| 9 | Grid 5 × 4 × 10 | Centered coordinates tested with X=5, Y=4, Z=10 at 200 items. |
| 10 | Working hosted submission URL | **Outstanding.** Deployment is prepared, not authorized/performed. No hosted URL is claimed. |

## Changes and rationale

| File | Change and evidence |
| --- | --- |
| `src/components/visualization/createVisualizationScene.ts` | Reset/zoom previously called render after OrbitControls.update had already dispatched a render-producing change event. Render explicitly only when update reports no change. Regression verifies exactly one render for changed and unchanged reset, zoom and Fit all. |
| `src/components/visualization/DataTile.tsx` | Memoize stable person/index props when React updates selected layout; preserve image error state. Correct live portrait alt text. Truncate long demographics/worth within fixed-size cards while retaining full DOM text and titles. Raise secondary index contrast. |
| `src/components/visualization/VisualizationScene.tsx` | Raise secondary source/help text from slate-500 to slate-400. Geometry, portals and scene lifetime stay intact. |
| `src/components/auth/SessionPanel.tsx` | Raise secondary informational text contrast. |
| `src/components/layout/AppLayout.tsx` | Raise footer contrast and update phase marker. |
| `index.html` | Replace stale sample-preview description with private Google Sheets description. |
| `vercel.json` | Minimal response headers compatible with Google popup flow; no routing, caching or enforced CSP changes. |
| `tests/profileTiles.test.mjs` | Three tests: all 200 records/six fields, wealth boundary classes, escaped and long text. |
| `tests/refreshDataset.test.mjs` | One test: changed 200-row refresh replaces data in source order without mutating the prior snapshot. |
| `tests/sceneLifecycle.test.mjs` | Two tests: 200-object identity, orientation, camera render counts, landscape/portrait Fit all corners, resizing, 40 arrangement changes, rapid cancellation, listener/observer/frame cleanup and repeated mounts. Uses actual Three.js with synthetic DOM. |
| `README.md`, this report | Updated evidence, security/limitations, Vercel instructions, reviewer access and submission gates. |

All 79 pre-existing tests remain unchanged. Synthetic/generated records exist only in tests; the unchanged original sample fixture is not imported into the production flow.

## Performance findings

- One CSS3D scene and object set persist during layout changes; cached targets/bounds avoid recalculation. No idle render loop or damping loop. Active transitions interpolate poses for 900 ms and cancel prior frames when replaced.
- Corrected duplicate camera renders and unnecessary card function renders for unchanged props. These are source-level improvements with render-count regression evidence, not measured FPS gains.
- Synthetic tests retain exactly 200 scene children throughout 40 switches, remove all tracked listeners, disconnect observers, clear pending frames and remove renderer/card nodes on teardown. Three repeated mounts do not duplicate the scene. This does not establish absence of browser heap leaks.
- Fit all contains every rotated card corner for all layouts at 1200×600 and 360×640. Zero-size resize is ignored safely. Controls retain orbit, zoom, arrow-key pan, Fit all and Reset. Reduced motion skips animation.
- Refresh intentionally recreates the scene for the newly validated record array, after old cleanup; selected arrangement remains React state. Record count is dynamic and empty data is safe.
- No virtualization, record removal, new animation library or framework. Actual 200-image load cost, browser frame times and heap behavior require profiling on the real dataset/device.

## Security findings

- No reported npm advisories: full audit and production-only audit both returned zero. No known unresolved dependency advisory of any severity in this snapshot; no dependency changes or forced upgrades.
- Only the Sheets read-only scope is requested and verified before use. The scope can cover spreadsheets the account can access; the configured range is an application choice, not a scope boundary.
- OAuth token stays in a controller closure, outside React snapshots/storage/URLs. Expiry clears profiles and cancels reads; explicit renewal required. Sign-out aborts reads, clears session data/timers and attempts revoke. Request generations reject stale callbacks even if the transport ignores abort. Existing mocked tests cover failure/expiry/account-change/sign-out races.
- GIS identity claims are decoded with nonce/audience/issuer/expiry checks for display only. Signature verification is absent; this frontend is not a server-verified session. Google enforces the actual Sheets bearer grant/ACL. Any future privileged server API must authenticate independently.
- React escapes untrusted Sheet text; no unsafe HTML path or application token logging/storage was found in `src`. Photo URLs require HTTPS and reject embedded credentials. Remote hosts can still track image requests, fail or change content; URL validation does not guarantee privacy or successful loading.
- `.env`, `.env.local` and `.env.production` match ignore rules; only `.env.example` is tracked among env files. Local env contents were not inspected or modified. This is not a historical Git secret scan. `VITE_*` values are public build-time settings; never put secrets there.
- Production maps are not enabled and no `.map` files were emitted. Compiled JS is still public. Avoiding source maps is not a confidentiality boundary.
- Headers are prepared, not observed on Vercel. Enforced CSP is deferred pending compatible Google endpoints/inline CSS3D styles/photo hosts and browser testing; do not claim complete XSS protection. Best-effort revoke cannot guarantee remote revocation if offline.

## Accessibility and responsiveness findings

- Source review confirms native buttons, layout `aria-pressed` state, accessible camera labels, a focusable scene, arrow-key pan, visible cyan focus outlines, status/error announcements and reduced-motion handling. Live Google button accessibility is provided by GIS and needs real-browser checking.
- Corrected misleading portrait alt descriptions. Broken photos retain initials fallback; actual onError/browser behavior must be checked.
- Long country/currency lines can overflow a fixed 224×280 card. They now truncate visually with full text retained in the DOM and title. Titles are useful on pointer hover but do not replace touch/assistive-technology testing.
- Computed contrast of existing Tailwind slate-500 against solid page/panel backgrounds was approximately 4.08:1 (#090d14) and 3.93:1 (#0c121d), below the 4.5:1 normal-text threshold. Raised those secondary labels to slate-400. Calculations use installed OKLCH color values; layered backgrounds, occlusion, all wealth colors and rendered text still require visual review. See [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- Responsive wrapping and a 320px page minimum exist. No browser responsive/screen-reader audit was performed. Tiny overview cards, occluded back-facing/depth cards, long account identifiers, touch targets and mobile text readability remain acceptance checks. CSS3D is not an alternative accessible 2D data table.

## Validation results

- `npm.cmd run lint`: passed.
- `npm.cmd run test`: 85 passed, zero failures/skips; all original 79 plus six focused regression tests.
- `npm.cmd run build`: TypeScript and Vite production build passed. Build asset sizes are reported by the actual command; bundle bytes are not a browser performance benchmark.
- `npm.cmd audit`: zero reported vulnerabilities across the complete dependency tree, including development dependencies.
- `npm.cmd audit --omit=dev`: zero reported production dependency vulnerabilities.
- `git diff --check`: passed. Working tree contains only the documented Phase 5 changes.
- Generated output contains hashed JS/CSS, `index.html` and `favicon.svg`; no production source maps. No routing framework or additional route requires a fallback rewrite.
- Browser automation was unavailable. **No browser interaction tests, live sign-in, real Sheet retrieval, deployed header verification or production deployment were performed.** Prior Phase 2 browser acceptance was reported by the owner, not independently repeated here.

## Manual browser acceptance

Record date, browser/version, OS/device, viewport, dataset count and pass/fail for each item. Use approved accounts and avoid capturing tokens, private API responses or personal data in shared evidence.

1. Verify original CSV import: 200 data rows plus header, all six fields, correct tab and inclusive configured range. Compare first, middle and last rows plus currency boundaries and totals/order against source. No unexplained omissions or invented fallback records.
2. Check missing configuration and blocked GIS script paths; restore settings, reload and retry. Confirm no sample data appears.
3. Test cancel/retry Google sign-in, then successful sign-in. Confirm Sheets consent occurs only after Connect Google Sheets. Deny/cancel and retry read-only authorization. Test popup blockers and account policies on the final origin.
4. After live retrieval, verify 200 count, row order, all six fields, image loading/initials fallback and wealth colors. Verify long fields remain readable via the supported interactions.
5. Inspect Table 20×10, Sphere outward faces, both Helix strands and Grid X=5/Y=4/Z=10. Rotate/zoom/pan, Fit all and Reset; rapidly switch layouts during motion. Honor reduced motion. Cards may cross during transitions or be hidden by depth; zoom/orbit to inspect.
6. Test keyboard tab order, visible focus, layout selected-state announcement, camera names, scene arrow pan, Google button, status/errors and screen-reader profile reading. Check contrast on layered backgrounds. Check at 320/360px mobile, tablet and desktop; test touch pinch/two-finger pan, long account text and orientation changes.
7. Edit a reversible Sheet value, Refresh data and confirm changed data/current layout. Repeated clicks should cause one read. Test network failure, invalid rows/headers, empty data, 403 and expiry/401 using a copied Sheet/approved account; restore source afterward. Errors must clear stale visualization, explain recovery and never show samples.
8. Sign out during popup/read/refresh; confirm profiles and identity clear and late results do not restore them. Reload and switch accounts. Verify app sign-out does not globally sign out of Google.
9. With 200 actual images, use browser Performance/Memory tools during idle, navigation, at least 40 switches, resize and repeated refresh/sign-out. Confirm one renderer subtree, no growing frame/listener chains, no retained detached card sets after GC and acceptable frame times on the target device. Synthetic tests cannot prove these metrics.
10. On the authorized deployed HTTPS URL, check root reload, assets, favicon, no unintended host access gate, actual response headers/cache behavior and Google popup/consent. Confirm reviewer test-user membership and separate private Sheet Viewer access. Repeat the complete flow from the reviewer's account before submitting the URL.

## Remaining submission gates

The implementation is prepared for a static deployment, but requirement 10 is open. Owner approval is needed for publishing and Google Cloud changes. Follow the [README deployment and reviewer steps](../README.md#vercel-deployment-preparation-not-deployed). Register the final HTTPS origin on the configured Web client; redeploy after any build-time env change. A publicly reachable site can still block reviewers through OAuth Testing/audience rules or Sheet permissions. Do not broaden OAuth publishing solely to bypass tester enrollment.

Complete the real 200-row audit, authenticated cross-browser/mobile/accessibility tests and measured performance profiling. Submit a stable working URL only after reviewer access succeeds. No backend or features outside the accepted architecture are needed for this phase.
