# DataSphere — Phase 2

Interactive React + TypeScript profile visualization using Three.js CSS3D and Tailwind CSS v4, now with Table, Sphere, Double Helix and Grid arrangements. This phase retains the original **40 fictional local development records** unchanged. No assignment CSV was present. Names and values are synthetic; the external placeholder portraits do not identify those fictional people. No Google authentication or Sheets connection is implemented. Tests use generated indices to validate 200-item layouts; no profiles were added to reach that count.

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
- `src/data/normalizePerson.ts`: normalization of already parsed CSV rows, including the exact `" Net Worth "` header. It trims text, converts age/net worth to numbers, accepts dollar signs and thousands separators, and rejects missing/invalid required values. It does not fetch or parse a CSV file.
- `src/types/person.ts`: normalized `Person` and original CSV row interfaces.
- `src/utils/netWorth.ts`: classification and USD formatting (cents retained when present).
- `src/layouts/tableLayout.ts`: centered index-based coordinates with 20 columns, wrapping at index 20. Two hundred records would occupy 20 × 10; the temporary sample occupies 20 × 2.
- `src/layouts/sphereLayout.ts`, `helixLayout.ts`, `gridLayout.ts`: data-independent layout algorithms.
- `src/layouts/layoutTargets.ts`, `layoutUtils.ts` and `src/types/layout.ts`: typed layout selection, position/normal targets and record-count validation. Empty counts produce empty target arrays.
- `tests/*.test.mjs`: the original nine tests plus 15 new tests for advanced layouts and transition interpolation, interruption, disposal and reduced motion.

Net worth is **red below $100,000**, **orange from $100,000 through $200,000 inclusive**, and **green above $200,000**. Labels and the legend also communicate the values.

## Layout algorithms

- **Table:** `column = index % 20`, `row = floor(index / 20)`. Occupied bounds are centered with 248 units between columns and 304 between rows. Cards face +Z. At 200 items this is exactly 20 columns and 10 rows.
- **Sphere:** a Fibonacci sphere uses equal-area latitude bands `y = 1 - 2 * (index + 0.5) / count` and the golden angle `π * (3 - √5)`. Radius grows with `sqrt(count)` and the 224 × 280 card diagonal. Normals point radially outward, with local +Z aligned to that normal and local up kept upright relative to world Y. The distribution avoids clustering at the poles. Tests verify that card bounding spheres do not intersect for 40 and 200 records.
- **Double Helix:** `strand = index % 2`, `level = floor(index / 2)`. Each level has two opposing cards, with angles `level * π/6 + strand * π`. Both strands wind around Y at radius 720, with a centered, constant 104-unit vertical step per level. Cards face radially outward in XZ. Adjacent cards have enough combined horizontal/vertical separation for their bounding spheres not to intersect; pairs are exactly 180° apart. Odd counts keep the final unpaired record.
- **Grid:** X = 5 columns, Y = 4 rows, Z = 10 depth layers at 200 records. X varies fastest, then Y, then Z. Spacing is 248 in X, 304 in Y and 420 in Z. Cards face +Z. Occupied bounds are centered, with depth derived from the count; 40 records use two layers. An initial oblique camera angle reveals the depth layers.

The initial Table camera retains the Phase 1 close reading view. Switching arrangements animates the same card objects and reframes the camera for the selected layout. **Fit all** frames a bounding sphere that includes the rotated card corners; **Reset** restores the Table reading view or a full view of the selected 3D layout. Clicking the active layout also resets the camera. Overview cards are intentionally small; zoom in to read them.

Transitions last 900 ms, use smoothstep easing for positions/camera motion and quaternion slerp for orientation. A new transition cancels its predecessor and starts from the current interpolated poses. Mouse, touch, keyboard, or toolbar navigation takes over the camera while the cards finish animating. Reduced-motion preferences skip the animation. Only transitions request animation frames; idle rendering remains driven by controls and resize events. Cleanup cancels pending frames, disconnects the resize observer, disposes all controls/listeners, removes objects and detaches the renderer, including during React StrictMode's setup/cleanup cycle. React retains ownership of the card contents via portals. Layout changes do not recreate the renderer or React cards.

## Manual checks

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

- Phase 2 installs no new dependencies. React, Vite, TypeScript, Tailwind, ESLint and the existing Three.js 0.187.0 setup are retained.
- `npm.cmd run lint`: passed.
- `npm.cmd run test`: all 24 tests passed (nine existing, 15 added). Generated index fixtures verify finite/unique positions, unit normals, 20 × 10 Table dimensions, 5 × 4 × 10 Grid dimensions, Sphere distribution, Helix strand separation and spacing, empty/odd counts, and transition lifecycle.
- `npm.cmd run build`: passed TypeScript checking and the production build.
- Browser rendering, interactions, responsive behavior and StrictMode lifecycle were **not browser-tested** in this environment; use the checklist above. HTTP readiness and automated tests do not establish browser behavior.

## Limitations and next steps

This phase only adds advanced layouts, controls, animation and relevant tests/documentation. The sample data and data normalization are unchanged. No backend, database, OAuth, Sheets integration, credentials, commits or pushes are included.

Cards may occlude each other in projection, especially in the Grid; orbit and zoom to inspect them. Back faces are hidden, so orbit behind Table/Grid planes or zooming inside an outward-facing shape can hide cards; Reset restores the overview/reading view. Cards can cross during interpolation even though their final Sphere/Helix positions are separated. Two hundred cards in an overview will be too small for reading at once, and the 200-item Helix is tall by design to preserve spacing. CSS3DRenderer has browser/display-zoom limitations; validate at 100% zoom. Portraits still depend on an external placeholder service with initials fallback. The automated tests do not establish browser performance or interaction behavior.

Suggested next scope: browser QA of all layouts at 40 and 200 items using temporary index-only fixtures, then Google Sign-In and read-only Sheets access once authorized. Retain validation and explicit loading/error/empty states when replacing the sample fixture with real data.

Architecture reference: [Three.js CSS3D periodic table](https://threejs.org/examples/#css3d_periodictable). API references: [quaternion interpolation](https://threejs.org/docs/pages/Quaternion.html), [CSS3DRenderer and its zoom limitations](https://threejs.org/docs/pages/CSS3DRenderer.html), and [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html). Styling setup: [Tailwind CSS with Vite](https://tailwindcss.com/docs/installation/using-vite).
