# DataSphere — Phase 3

Interactive React + TypeScript profile visualization using Three.js CSS3D and Tailwind CSS v4, with Table, Sphere, Double Helix and Grid arrangements. Phase 3 adds an independent, validated Google Sheets data boundary for future integration. The application still displays the original **40 fictional local development records**, unchanged. No assignment CSV was present. Names and values are synthetic; the external placeholder portraits do not identify those fictional people. OAuth, Google login UI and live data activation remain Phase 4 work. Tests use generated indices/rows to validate 200-item layouts and parsing; no production profiles were added to reach that count.

## Run locally

Use Node.js 24 LTS (validated with 24.22.2) and npm. Tests use Node's built-in TypeScript stripping and test runner, without an additional test dependency.

```sh
npm install
npm run dev
```

Open http://localhost:5173/. On Windows PowerShell where execution policy blocks `npm.ps1`, use `npm.cmd` in place of `npm`; changing execution policy is unnecessary. If another server already uses port 5173, reuse it or stop it before starting a new one.

```sh
npm run lint
npm run test
npm run build
npm run preview
```

`build` runs `tsc -b` before the Vite production build. ESLint and TypeScript configuration remain as supplied. Tailwind uses `@tailwindcss/vite` in `vite.config.ts` and `@import "tailwindcss"` in `src/index.css`.

## Implementation

- `src/components/layout/AppLayout.tsx`: branding, responsive page shell and sample-data notice.
- `src/components/visualization/VisualizationScene.tsx`: scene mount, React card portals, camera toolbar, loading/empty states and legend.
- `src/components/visualization/createVisualizationScene.ts`: replaces `createTableScene.ts`; retains one CSS3D scene, renderer and set of card objects while switching cached layout targets. Handles OrbitControls, layout-aware camera framing, resize and cleanup.
- `src/components/visualization/layoutTransition.ts`: cancellable, on-demand position/quaternion animation with an injectable frame scheduler for unit tests.
- `src/components/visualization/DataTile.tsx`: photo, initials fallback, identity details and classified net worth.
- `src/components/visualization/LayoutControls.tsx`: enabled Table, Sphere, Helix and Grid buttons with selected state and `aria-pressed`.
- `src/data/sampleRecords.ts`: temporary data, separate from rendering.
- `src/data/normalizePerson.ts`: unchanged legacy Phase 1 row helper, retained for compatibility with its existing tests. Future Sheets integration must use the stricter `parseSheetValues`/`parseGoogleSheetsResponse` boundary below, which also validates all fields and photo URLs.
- `src/types/person.ts`: normalized `Person` and original CSV row interfaces.
- `src/utils/netWorth.ts`: classification and USD formatting (cents retained when present).
- `src/layouts/tableLayout.ts`: centered index-based coordinates with 20 columns, wrapping at index 20. Two hundred records would occupy 20 × 10; the temporary sample occupies 20 × 2.
- `src/layouts/sphereLayout.ts`, `helixLayout.ts`, `gridLayout.ts`: data-independent layout algorithms.
- `src/layouts/layoutTargets.ts`, `layoutUtils.ts` and `src/types/layout.ts`: typed layout selection, position/normal targets and record-count validation. Empty counts produce empty target arrays.
- `tests/*.test.mjs`: all 24 existing tests are unchanged. Phase 3 adds 26 parser/configuration/service tests and `tests/fixtures/sheets.mjs` for generated, test-only rows.

Net worth is **red below $100,000**, **orange from $100,000 through $200,000 inclusive**, and **green above $200,000**. Labels and the legend also communicate the values.

## Layout algorithms

- **Table:** `column = index % 20`, `row = floor(index / 20)`. Occupied bounds are centered with 248 units between columns and 304 between rows. Cards face +Z. At 200 items this is exactly 20 columns and 10 rows.
- **Sphere:** a Fibonacci sphere uses equal-area latitude bands `y = 1 - 2 * (index + 0.5) / count` and the golden angle `π * (3 - √5)`. Radius grows with `sqrt(count)` and the 224 × 280 card diagonal. Normals point radially outward, with local +Z aligned to that normal and local up kept upright relative to world Y. The distribution avoids clustering at the poles. Tests verify that card bounding spheres do not intersect for 40 and 200 records.
- **Double Helix:** `strand = index % 2`, `level = floor(index / 2)`. Each level has two opposing cards, with angles `level * π/6 + strand * π`. Both strands wind around Y at radius 720, with a centered, constant 104-unit vertical step per level. Cards face radially outward in XZ. Adjacent cards have enough combined horizontal/vertical separation for their bounding spheres not to intersect; pairs are exactly 180° apart. Odd counts keep the final unpaired record.
- **Grid:** X = 5 columns, Y = 4 rows, Z = 10 depth layers at 200 records. X varies fastest, then Y, then Z. Spacing is 248 in X, 304 in Y and 420 in Z. Cards face +Z. Occupied bounds are centered, with depth derived from the count; 40 records use two layers. An initial oblique camera angle reveals the depth layers.

The initial Table camera retains the Phase 1 close reading view. Switching arrangements animates the same card objects and reframes the camera for the selected layout. **Fit all** frames a bounding sphere that includes the rotated card corners; **Reset** restores the Table reading view or a full view of the selected 3D layout. Clicking the active layout also resets the camera. Overview cards are intentionally small; zoom in to read them.

Transitions last 900 ms, use smoothstep easing for positions/camera motion and quaternion slerp for orientation. A new transition cancels its predecessor and starts from the current interpolated poses. Mouse, touch, keyboard, or toolbar navigation takes over the camera while the cards finish animating. Reduced-motion preferences skip the animation. Only transitions request animation frames; idle rendering remains driven by controls and resize events. Cleanup cancels pending frames, disconnects the resize observer, disposes all controls/listeners, removes objects and detaches the renderer, including during React StrictMode's setup/cleanup cycle. React retains ownership of the card contents via portals. Layout changes do not recreate the renderer or React cards.

## Phase 3 data architecture

No new dependencies or OAuth library are required. None of the modules below is called or imported by `App.tsx`; startup still reads `sampleRecords`. Layout algorithms, transitions, React components and the sample fixture are unchanged.

- `src/types/googleSheets.ts`: Values API response structure, cell types, parser result, row issues, configuration and read-only reader interface.
- `src/data/parseSheetValues.ts`: `parseSheetValues(unknown)` accepts a two-dimensional array; `parseGoogleSheetsResponse(unknown)` validates a row-major ValueRange JSON envelope before parsing it. Both return a typed success/error result rather than leaking thrown errors for malformed input.
- `src/config/googleSheets.ts`: validates Spreadsheet ID and a tab-qualified A1 range. `readGoogleSheetsConfig` accepts an environment object explicitly; Phase 4 may pass `import.meta.env`. No environment is read or live request enabled automatically.
- `src/services/googleSheets.ts`: `createGoogleSheetsReader(config, optionalFetch)` returns an inert reader. Its `readProfiles(accessToken, optionalAbortSignal)` must be called explicitly by a future authentication/data layer. It makes only a GET to the [Values API](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get), with row-major, unformatted values and the token only in the Authorization header. All Phase 3 service tests inject a mock fetch; no live Google request was made.
- `.env.example` supplies empty/example configuration only; `.gitignore` now excludes actual `.env` and `.env.*` files while retaining the example.

### CSV contract and validation policy

The expected columns are `Name, Photo, Age, Country, Interest, " Net Worth "`. Header matching trims whitespace/BOM, normalizes common nonbreaking spaces, collapses header whitespace and ignores case. Columns may be reordered; unrelated extra columns are ignored. Each required column must appear exactly once. The first returned row must be the header.

The result is **all-or-nothing**. Success returns `{ ok: true, records: Person[] }` in original row order, without sorting or deduplication. Failure returns `{ ok: false, error }` with a discriminating `code`; no partial record array is returned. Codes distinguish `MISSING_HEADERS`, `DUPLICATE_HEADERS`, `INVALID_ROWS`, `EMPTY_SPREADSHEET` and `UNEXPECTED_RESPONSE_SHAPE`. Invalid rows report every invalid field with a one-based spreadsheet row, column number within the returned range, field name and corrective message. Errors do not echo raw cell values.

- All six values are required. Name, Country and Interest must be nonempty text. Ordinary text is trimmed and U+00A0/U+202F nonbreaking spaces become ordinary spaces.
- Age must be a finite, nonnegative safe integer. Numeric cells, digit strings and an integer followed only by zero decimal places (`30.0`) are accepted; dates, fractions, exponent/hex text and booleans are rejected.
- Net Worth accepts finite numeric cells or USD strings with optional `$`, `US$` or `USD`, standard comma/space grouping, and a dot decimal separator with at most two decimal places. Examples: `$251,260.80`, `USD 251260.80`, and nonbreaking-space grouping. A leading sign before the currency prefix is allowed; negative net worth is valid and remains in the red tier. Invalid grouping such as `1,2,3` is rejected before removing separators. Other currencies, decimal-comma locales and accounting parentheses are rejected rather than guessed or converted. Numeric values use JavaScript numbers, not decimal financial arithmetic.
- Photo must be an absolute HTTPS URL accepted by the URL parser, with no embedded username/password, control characters or unescaped internal whitespace. Paths, query strings and signed HTTPS links are allowed. Relative, HTTP, `javascript:`, `data:` and `file:` URLs are rejected. URL syntax validation does not fetch the image or prove that the URL returns embeddable image bytes; the existing initials fallback remains important.
- Empty/all-blank ranges and valid header-only ranges produce `EMPTY_SPREADSHEET`. Once a header and data rows are present, **every returned row is validated, including blank rows**; blanks are not silently dropped. Missing trailing cells produce field-specific row errors. Google normally [omits trailing empty rows/cells](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values#ValueRange); an absent `values` member in a valid ValueRange is handled as empty.
- Unexpected envelope/array/cell shapes and column-major responses are rejected. Values API booleans/null are recognized as primitive cells, but cannot satisfy any required profile field. Text is retained as strings; existing cards render it through ordinary React text/attributes, with no `dangerouslySetInnerHTML` or HTML interpretation.

There is no hardcoded 200-record gate, so the same parser supports small fixtures and future live data. Confirm the assignment's expected 200 rows during import and Phase 4 integration. The config validator deliberately supports tab-qualified column ranges, optionally bounded by rows, beginning at row 1 and spanning at least six columns; named ranges, R1C1 and ranges beginning below row 1 are outside this contract. This makes reported row numbers match spreadsheet row numbers.

### Manual private Google Sheet preparation

1. Obtain the original assignment CSV. Its expected size is 200 data rows plus one header; do not fill missing records with invented profiles.
2. In Google Sheets, create/open a spreadsheet and use **File → Import → Upload** to import that CSV into a new tab. Choose comma separation or confirm automatic detection. Review the import preview and ensure the header remains on row 1. See Google's [CSV import instructions](https://support.google.com/docs/answer/40608?hl=en).
3. Confirm six required columns and 201 populated rows including the header. Check the quoted/space-padded Net Worth header, ages, currency strings and actual HTTPS image URLs. Keep photo links as URL text, not IMAGE/HYPERLINK formulas that return a display label instead of a URL.
4. Give the tab a clear name, such as `Sheet1` or `Profile Data`. The tab name is the label at the bottom; it is different from the spreadsheet document title and numeric `gid`.
5. From `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=...`, copy only the part between `/d/` and `/edit` as the Spreadsheet ID. In the range use the tab name, not `gid`: `Sheet1!A:F`, or `'Profile Data'!A1:F201` when the tab contains spaces. See [Google's ID and A1 notation guide](https://developers.google.com/workspace/sheets/api/guides/concepts).
6. Keep **Share → General access → Restricted**. Grant the eventual signed-in test account Viewer access if it does not already own the Sheet. Do not publish to the web, enable public-link access, or create a published CSV endpoint. API access will use that account's permission and a read-only OAuth scope in Phase 4.

### Local configuration

Copy `.env.example` to `.env.local`, then set the ID locally:

```dotenv
VITE_GOOGLE_SHEET_ID=
VITE_GOOGLE_SHEET_RANGE=Sheet1!A:F
```

For a tab with spaces, quote the whole dotenv value while retaining the A1 single quotes: `VITE_GOOGLE_SHEET_RANGE="'Profile Data'!A1:F201"`. Restart Vite after editing environment files when Phase 4 begins reading them. No real `.env` was created by this implementation, and these values currently do not change the app's data source.

Vite exposes `VITE_*` configuration to browser code. These two settings are identifiers, **not secrets**; an ID alone does not grant access to a private Sheet. Never add an OAuth token, refresh token, client secret, private key or service-account key to Vite env, the repository, browser storage or logs. The reader has no token persistence, token logging, API key, write method or public-CSV fallback. It uses no-store requests, rejects redirects, sanitizes transport/API errors and accepts AbortSignal cancellation. HTTP errors retain their status (for example 401/403/404/429) without returning raw Google response bodies.

### Google Cloud prerequisites still pending

The application does not configure Google Cloud or change Sheet permissions for you. In your account, [create/select a Google Cloud project](https://developers.google.com/workspace/guides/create-project) and [enable Google Sheets API](https://developers.google.com/workspace/guides/enable-apis). Ensure the intended test account can read the private Sheet. No service account, backend, database or API key is needed for the planned browser OAuth reader.

In Phase 4, configure the OAuth consent/audience/test users and a browser Web application OAuth client with the exact authorized JavaScript origins (local development normally `http://localhost:5173`; deployment origins must be added separately). Review the [consent setup](https://developers.google.com/workspace/guides/configure-oauth-consent) and request `https://www.googleapis.com/auth/spreadsheets.readonly`, not a write scope. This scope is sensitive and applies to spreadsheets, not a single tab/range; public deployment may require verification. See [Google's scope guidance](https://developers.google.com/workspace/sheets/api/scopes).

Phase 4 should supply short-lived access tokens in memory, handle denial/expiry/re-authentication, invoke the prepared reader only after user authorization, and replace fixtures only after successful validation. Add explicit live loading/error/empty states and source labeling, cancellation on unmount/sign-out, and an expected-count check for the real assignment. Authentication, token acquisition/refresh and activating this data path are intentionally not implemented in Phase 3.

## Manual visualization checks

1. Open http://localhost:5173/ and confirm branding, the local-data notice, dark scene and profile cards. Use **Fit all** to see all 40 cards in 20 columns and two rows.
2. Drag to rotate; scroll or use +/− to zoom; right-drag (or Ctrl/Shift + drag) to pan. Focus the scene and use arrow keys to pan. On touch, use one finger to rotate and two fingers to pan/pinch.
3. Switch through **Table → Sphere → Helix → Grid → Table**. Verify selected-button highlighting, updated layout descriptions and smooth position/orientation changes without page reload. Rapidly switch during a transition: cards should continue from their current poses and settle into the most recent selection.
4. Inspect James Wilson ($100,000) and Priya Sharma ($200,000): both are orange. Ethan Brooks ($99,999) is red; Zara Ahmed ($200,001) is green.
5. Resize between desktop and mobile widths. Verify the renderer follows its container, controls wrap, and the page does not gain horizontal overflow. Use Reset after resizing to reframe the reading view.
6. Block portrait requests or disconnect the network after loading: failed images should display initials. The local profile data itself needs no network.
7. Temporarily pass `records={[]}` to `VisualizationScene` in `App.tsx` to inspect the empty state, or add `loading` to inspect loading. Restore the normal props afterward. Local data is synchronous, so normal startup does not simulate a loading delay.
8. Check **Fit all**, **Reset**, and clicking the active layout after navigating in every arrangement. The Table returns to its reading view; the other layouts return to an overview. Try dragging, arrow-key panning and zooming during a transition to verify that navigation takes over the camera.
9. Orbit the Sphere and Helix to see outward-facing cards on their far sides. Confirm the Helix has two intertwined, opposing strands rather than one. Rotate the Grid to reveal its depth layers. Occlusion from a particular view is expected.
10. Enable the OS/browser reduced-motion preference and change layouts: the final arrangement should appear immediately.
11. With StrictMode enabled, edit/save a component a few times and check that there is one renderer subtree in the scene host and no accumulating listeners or runtime errors. Unmount or trigger a loading/empty state during a transition and check for pending animation frames or errors.

## Validation recorded

- Phase 3 installs no new dependencies. React, Vite, TypeScript, Tailwind, ESLint and the existing Three.js 0.187.0 setup are retained.
- `npm.cmd run lint`: passed.
- `npm.cmd run test`: all 50 tests passed (24 existing, unchanged; 26 added). New tests cover all six/reordered/spaced headers, strict currency and age parsing, missing/duplicate headers, blank/incomplete rows, nonbreaking spaces, ordering, a generated 200-row fixture, response shapes, safe photo URLs, literal React text, configuration, inert/GET-only access, sanitized failures and cancellation. All service requests use injected mock fetch functions.
- `npm.cmd run build`: passed TypeScript checking and the production build.
- `git diff --check`: passed.
- Phase 2 browser acceptance was reported passed by the project owner. No new browser or authenticated Google/API tests were executed in Phase 3; the visualization code/data remain unchanged. Automated/mock tests do not establish live permissions, OAuth behavior, image availability or API connectivity.

## Limitations and next steps

Phase 3 adds only the validated data boundary, dormant read-only service contract, env example/ignore rules, tests and documentation. The sample data, legacy normalizer, app source selection, 3D layout algorithms and transitions are unchanged. No backend, database, OAuth, login UI, live requests, credentials, commits or pushes are included.

Cards may occlude each other in projection, especially in the Grid; orbit and zoom to inspect them. Back faces are hidden, so orbit behind Table/Grid planes or zooming inside an outward-facing shape can hide cards; Reset restores the overview/reading view. Cards can cross during interpolation even though their final Sphere/Helix positions are separated. Two hundred cards in an overview will be too small for reading at once, and the 200-item Helix is tall by design to preserve spacing. CSS3DRenderer has browser/display-zoom limitations; validate at 100% zoom. Portraits still depend on an external placeholder service with initials fallback. The automated tests do not establish browser performance or interaction behavior.

Suggested next scope: complete the manual import/Cloud setup above, then implement Phase 4 authentication and authorized read-only Sheets loading through the prepared reader. Validate the real 200-row dataset and its image URLs without altering privacy settings or substituting invented records.

Architecture reference: [Three.js CSS3D periodic table](https://threejs.org/examples/#css3d_periodictable). API references: [quaternion interpolation](https://threejs.org/docs/pages/Quaternion.html), [CSS3DRenderer and its zoom limitations](https://threejs.org/docs/pages/CSS3DRenderer.html), and [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html). Styling setup: [Tailwind CSS with Vite](https://tailwindcss.com/docs/installation/using-vite).
