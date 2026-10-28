# SolarSight product (GeoServer + CesiumJS + OpenLayers)

SolarSight is the product app built on our own data stack, separate from the ArcGIS app.

| | |
|---|---|
| URL (dev) | `http://localhost:8080/mumbai/solarsight/` (home), `/mumbai/solarsight/map`, `/mumbai/solarsight/plans` |
| Entry | `solarsight/index.html` → `src/solarsight/main.jsx` (React Router, basename `/mumbai/solarsight`) |
| Styles | Tailwind with its own config `tailwind.solarsight.cjs` (selected by `@config` in `src/solarsight/styles.css`) |
| ArcGIS app | untouched (`index.html`, `src/main.jsx`, `src/App.jsx`) |

**Production hosting.** `vite build` writes `dist/solarsight/index.html`. The web server must send every
`/mumbai/solarsight/*` page URL (no file extension) to that file, the same way the dev server does
(`solarsightRoutes` in `vite.config.js`). For example, nginx: `location /mumbai/solarsight/ { try_files $uri /mumbai/solarsight/index.html; }`.

## Pages
- **Home** (`pages/Home.jsx`): what it does, using real renders from the app (`src/solarsight/assets`) and a real
  result (Parekh Corporation, Parel). Live coverage counts from GeoServer.
- **Map** (`pages/Workspace.jsx`): full-screen 3D (CesiumJS), building search, layers, sun controls, 2D overview
  (OpenLayers), solar analysis and panel planner.
- **Saved plans** (`pages/Plans.jsx`): analyses saved in this browser (shared with the ArcGIS dashboard's
  `solar_analyses` store), totals, PDF re-export.

## 3D models and terrain
- **LoD2 buildings are the default model**: the vendor's real roof shapes, mirrored to the local server in I3S
  layout (`tools/reality/mirror.mjs --group lod2`). LoD1 blocks from WFS and the Reality Mesh can be switched on.
- **Highlighting**: selected building (cyan) and shadow casters (red) are classification volumes that tint the
  model surfaces inside the footprint, so they follow LoD2 / Reality Mesh geometry exactly.
- **Bare-earth terrain**: Copernicus GLO-30 is a surface model, a median 4.6 m above the street in F/S. The terrain
  is now built from it with a morphological opening plus the true ground at every LoD2 building base
  (`tools/terrain/lod2-ground.mjs`, `tools/terrain/bare_earth.py`, `tools/terrain/build-terrain.sh`). Against
  9,389 building bases: median error 0.00 m, 95 % within 1.5 m.

## Solar analysis on the real roof
1. **Roof** (`solar/roofSampling.js`): a ray from below finds the LoD2 building's base (true ground); the LoD2
   surface is then sampled on a grid (0.75 m or coarser, up to ~3,500 points) over the footprint. Where LoD2 has
   no model, the recorded height is used as a flat roof.
2. **Roof model** (`solar/roofModel.js`): slope and facing per cell; flat cells grow into levels, sloped cells
   into planes (least-squares fit). Small raised patches are tanks / stair rooms (obstacles), small sunken ones
   light wells, north-facing or steep planes are left out. Panels keep 0.5 m clear of other parts.
3. **Shading** (`solar/shading.js`): each roof point at its own height; neighbours shade it if the path to the
   sun crosses their footprint within (height difference / tan altitude); the roof's own tanks, parapets and
   ridges by walking the height grid towards the sun.
4. **Sunlight** (`solar/roofAnalysis.js`): hourly 6-18 on the chosen day; same score and report as before.

## Panel planner (`planner/`)
- **Catalogue** (`catalogue.js`): six generic module classes (330-590 W) plus a custom panel; indicative prices.
- **Climate** (`irradiance.js`): Mumbai monthly GHI (NASA POWER), Erbs diffuse split, Collares-Pereira & Rabl /
  Liu & Jordan hourly profiles, isotropic sky on the tilted plane. Best annual tilt facing south: 21°.
- **Shade map** (`shadeMap.js`): every roof cell × 144 month-hour slots, at rack height (1 m) on flat parts and
  flush height (0.2 m) on slopes.
- **Layout** (`layout.js`, `plan.js`): flat parts get one rack setup for the whole roof (tilt: best or 10°;
  facing: south or along the roof; portrait or landscape), chosen for the most energy, with rows spaced for no
  self-shading 9:00-15:00 on 21 December; sloped parts get panels flush on the plane. Panels losing more than
  20 % to shade are left out. "Match my consumption" keeps the sunniest compact block that covers the bill.
- **Energy**: per panel and slot, beam × (1 − shade) + sky + ground light, NOCT heat loss, 14 % system losses,
  bifacial gain where relevant.
- **Money**: module ₹/Wp + ₹30/Wp balance of system; PM Surya Ghar subsidy (homes; housing societies capped at
  3 kW per flat, from `flat_count`; none for commercial classes); savings at the tariff; payback; 25-year
  savings with panel ageing; cost per unit.
- **3D** (`panels3d.js`): each panel at its own pose; racks on legs, flush panels on slopes; colour-by-yield view.

## Performance
The 3D view renders only when something changes (`requestRenderMode`), with a quality setting (High /
Balanced / Fast: resolution, anti-aliasing, shadow-map size, mesh detail). Balanced is the default.
