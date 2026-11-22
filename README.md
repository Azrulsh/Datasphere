# DataSphere — Phase 1

Interactive React + TypeScript profile visualization using Three.js CSS3D and Tailwind CSS v4. This phase uses **40 fictional local development records**. No assignment CSV was present. Names and values are synthetic; the external placeholder portraits do not identify those fictional people. No Google authentication or Sheets connection is implemented.

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
- `src/components/visualization/createTableScene.ts`: CSS3D scene, renderer, objects, OrbitControls, resize observer and cleanup.
- `src/components/visualization/DataTile.tsx`: photo, initials fallback, identity details and classified net worth.
- `src/components/visualization/LayoutControls.tsx`: Table reset and disabled future layouts.
- `src/data/sampleRecords.ts`: temporary data, separate from rendering.
- `src/data/normalizePerson.ts`: normalization of already parsed CSV rows, including the exact `" Net Worth "` header. It trims text, converts age/net worth to numbers, accepts dollar signs and thousands separators, and rejects missing/invalid required values. It does not fetch or parse a CSV file.
- `src/types/person.ts`: normalized `Person` and original CSV row interfaces.
- `src/utils/netWorth.ts`: classification and USD formatting (cents retained when present).
- `src/layouts/tableLayout.ts`: centered index-based coordinates with 20 columns, wrapping at index 20. Two hundred records would occupy 20 × 10; the temporary sample occupies 20 × 2.
- `tests/*.test.mjs`: nine tests for wealth thresholds, invalid values, currency formatting, normalization and table coordinates.

Net worth is **red below $100,000**, **orange from $100,000 through $200,000 inclusive**, and **green above $200,000**. Labels and the legend also communicate the values.

The initial camera centers a close view for reading profiles. Pan to explore the remaining columns or use **Fit all** for an overview. Overview cards are intentionally small; zoom back in to read them. Rendering is driven by controls and resize events, with no continuous animation loop. Cleanup disconnects the resize observer, disposes controls/listeners, removes objects and detaches the renderer, including during React StrictMode's setup/cleanup cycle. React retains ownership of the card contents via portals.

## Manual checks

1. Open http://localhost:5173/ and confirm branding, the local-data notice, dark scene and profile cards. Use **Fit all** to see all 40 cards in 20 columns and two rows.
2. Drag to rotate; scroll or use +/− to zoom; right-drag (or Ctrl/Shift + drag) to pan. Focus the scene and use arrow keys to pan. On touch, use one finger to rotate and two fingers to pan/pinch.
3. Check **Table** and **Reset** restore the centered reading view after navigating. Confirm Sphere, Double Helix and Grid are disabled.
4. Inspect James Wilson ($100,000) and Priya Sharma ($200,000): both are orange. Ethan Brooks ($99,999) is red; Zara Ahmed ($200,001) is green.
5. Resize between desktop and mobile widths. Verify the renderer follows its container, controls wrap, and the page does not gain horizontal overflow. Use Reset after resizing to reframe the reading view.
6. Block portrait requests or disconnect the network after loading: failed images should display initials. The local profile data itself needs no network.
7. Temporarily pass `records={[]}` to `VisualizationScene` in `App.tsx` to inspect the empty state, or add `loading` to inspect loading. Restore the normal props afterward. Local data is synchronous, so normal startup does not simulate a loading delay.
8. With StrictMode enabled, edit/save a component a few times and check that there is one renderer subtree in the scene host and no accumulating listeners or runtime errors.

## Validation recorded

- Dependency installation succeeded after npm registry access was permitted; npm reported zero vulnerabilities.
- `npm.cmd run lint`: passed.
- `npm.cmd run test`: all nine tests passed.
- `npm.cmd run build`: passed TypeScript checking and the production build.
- `npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort`: Vite started successfully. HTTP requests to `/` and the scene module both returned 200.
- Browser rendering, interactions, responsive behavior and StrictMode lifecycle were **not browser-tested** in this environment; use the checklist above. HTTP readiness and automated tests do not establish browser behavior.

## Scope and next phase

Phase 1 adds `three`, matching `@types/three`, `tailwindcss` and `@tailwindcss/vite`. It replaces the starter UI/styles/assets, updates the title/favicon, and adds the modules and tests listed above. No backend, database, OAuth, Sheets integration, advanced layouts, credentials, commits or pushes are included.

Suggested Phase 2: configure Google Sign-In and read-only Sheets access using environment-based public client configuration, normalize and validate actual rows, then replace the local fixture while retaining explicit loading/error/empty states. Implement the remaining layouts in a subsequent agreed scope.

Architecture reference: [Three.js CSS3D periodic table](https://threejs.org/examples/#css3d_periodictable). Setup references: [Tailwind CSS with Vite](https://tailwindcss.com/docs/installation/using-vite) and [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html).
