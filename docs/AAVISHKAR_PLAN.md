# SolarSight — Aavishkar Exhibition Plan

Based on a full read of the codebase, the demo video (`Solar Sight Demo Video 2.mp4`, 2 min 13 s),
and a live run of the app with every map layer harvested (see `docs/MAP_LAYER_CATALOGUE.md`).

---

## 1. The goal, stated plainly

**SolarSight turns BMC's 3D digital twin of Mumbai into a rooftop-solar decision tool.**
It answers three questions for three audiences:

| Audience | Question | Today | After this plan |
|---|---|---|---|
| Citizen / housing society | "Is *my* roof worth it, what size, what will I save?" | Partly (one building, fixed tariff, no bill input) | Bill-aware "My Roof" wizard with subsidy and payback |
| BMC planner / policymaker | "Where in Mumbai is the untapped potential, and which wards lag?" | No (heat map tool is a height-only placeholder and is not reachable) | City-wide atlas of 271,624 buildings, ward league table, adoption gap |
| Architect / developer | "If this tower gets built, whose sunlight does it steal?" | Yes (What-If simulator) | What-If + automatic 2018→2024 redevelopment shadow audit |

The innovation pitch in one line: *shadow-accurate solar potential for every roof in Mumbai,
computed on the city's own 3D model, cross-checked against the 36,951 installations BMC has
already mapped.*

---

## 2. What exists today

### Working (seen in the video and the code)
- 3D SceneView on the BMC web scene; Reality Model / LoD toggles; Identify; header location search
- **Solar Suitability tool** (`src/components/Tools/SolarSuitabilityTool.jsx`, 2,319 lines):
  pick building → hourly (6–18 h) shadow polygons from up to 100 neighbours within 200 m →
  score 0–100 → area, panels, kWp, kWh, ₹ savings, cost, payback, CO₂ → hourly chart →
  time slider with live shadows → smart recommendations → PDF → save
- Season selector (solstices, equinox, monsoon); "Design New" building mode
- **What-If simulator**: draw a future tower, recalculate, see score impact (85 → 67 in the video)
- Dashboard of saved analyses (localStorage) with PDF per card
- Methodology page

### Written but not connected
| File | State |
|---|---|
| `src/utils/solarCalculations.js` | Shade-factor (sun-angle-weighted), bill-aware scenario, monthly generation, right-sizing. **Not imported by the tool.** The video's PDF shows "Shade Factor 38.7%", so the demo was recorded from an uncommitted working copy |
| `src/utils/solarEngine.js` | Duplicate of logic inside the tool; unused |
| `src/components/Tools/AreaHeatmapTool.jsx` | Colours buildings by **height only** (>25 m green, >12 m amber); no shadow maths; no button opens it |
| `src/components/Tools/GuidedDemoTour.jsx` | Camera tour; never mounted |
| `src/pages/Landing.jsx`, `ServiceRequest.jsx` | Not routed |
| `Header/ToolsToolbar.jsx`, `Assessment/*`, `store/features/assessment` | Left over from the parent TrueGeoMap platform |

---

## 3. Fix first — things a judge will catch (Phase 0)

These are credibility issues. Each one is small; together they decide whether the numbers survive questioning.

1. **Money ignores shade.** At HEAD, `generation = capacity × 1500` regardless of sunlight
   (`SolarSuitabilityTool.jsx:1122`). Adding a 58-floor tower drops the score but not the savings.
   Wire in `computeShadeFactor` + `computeScenario` from `solarCalculations.js`.
2. **Three different score bands.** Tool: 70/55/40 (`:1199`). Dashboard: 60/35
   (`SolarDashboard.jsx` `getSuitTag`). Gauge colours: >70/>40. README: 60/35. Pick one table, put it in
   `solarCalculations.js`, import it everywhere.
3. **Methodology text contradicts the code.** The overlay says area ≥100 m² = 100, height/30, panel = usable ÷ 2 m²;
   the code uses `log10(area)/log10(500)`, height/50, `usable × 0.85 ÷ 1.7`. README gives a third formula (40/30/30).
   Generate the methodology text from the same constants.
4. **20% of the score is a constant** (irradiance = 92). Every roof, even fully shaded, gets ~18 free points.
   Replace it with a real variable (annual shade factor or monthly GHI) or drop it and reweight.
5. **Season changes the maths but not the picture.** `view.environment.lighting.date` is set to *today* while
   the sun angles use the chosen day (`:994`). The shadows on screen do not match the numbers. Set the
   lighting date to the season's date.
6. **Footprint is treated as roof.** A 4,888 m² footprint becomes a 513 kWp, ₹3.07 crore system (video).
   Use a class-aware usable fraction (residential ~50–60%, industrial ~75%) and show it.
7. **Floor height is 3 m in one place and 3.2 m in another** (`:921`, `:1014` vs `solarEngine.js`). Unify.
8. **Saving can silently fail mid-demo.** Each save stores an 800×500 PNG data-URL in localStorage
   (~5 MB quota). Switch to JPEG thumbnails and IndexedDB.
9. **Search breaks on apostrophes** (raw SQL string at `:495`, e.g. "D'Souza"). Escape quotes.
10. **README overclaims.** It says 12,500 buildings (live: **271,624**), `ShadowAccumulation` (the code uses
    custom shadow polygons + `Daylight`), Node/Express/PostgreSQL backend (none in this repo). Correct it;
    the true numbers are more impressive.
11. **Sidebar is closed by default.** A visitor sees a map with no tools. Open it on desktop.

### Security (before the laptop goes to a public venue)
- `gitlab_deploy_key` (a private key) is **committed to git**. Remove it, rotate it on GitLab, and purge it from history if the repo is shared.
- `VITE_PORTAL_USERNAME/PASSWORD` and `VITE_PORTAL_CLIENT_SECRET` are compiled into the browser bundle.
  Anyone opening DevTools on the kiosk can read the BMC portal password. Use a read-only demo account, or
  a tiny token proxy, and never ship the production account.
- Login "Remember me" stores the plain password in localStorage (`NewLogin.jsx`).
- Property-tax layers expose names, phones and e-mails; hide them from Identify in exhibition mode.

---

## 4. What the map data makes possible

Full catalogue: `docs/MAP_LAYER_CATALOGUE.md`. The ones that change what SolarSight can do:

| Data (live count) | Feature it unlocks |
|---|---|
| **Building New** 271,624 — height, floors, area, class, population, flats, ward | City-wide batch scoring; per-household and per-capita metrics; ward ranking |
| **Solar panel polygon** 36,951 (34,462 PV, 2,489 water heaters), by ward and building class | "Already solar" badge; adoption rate per ward; validation of our score; untapped-potential gap |
| **Building2** 2018→2024: 23,971 developed (avg +4 floors, max +78), 14,749 demolished | Redevelopment shadow audit: "this roof lost X% sun since 2018 because of building Y" |
| Building Property Tax `resunit/comunit/indunit` | Correct tariff category (residential vs commercial) for savings |
| Ward 25 · Prabhaag 227 (population, councillor) · Census Ward 88 · Locality 101 · Pin 83 | Choropleths, league tables, councillor-wise report cards |
| BMC Buildings 6,994 (schools 582, hospitals 290, offices 449, pumping stations 379, public toilets 3,543) | BMC's own rooftop programme: ranked, tender-ready list |
| Community Toilet Point 8,251 — **4,977 with no electricity** | Social-impact layer: solar for toilets without power |
| Temporary Shelters 1,014 · Hospitals 873 · Flooding Spots 937 | Monsoon resilience: solar + battery for shelters |
| Power network: 143 transformers, 72 substations; **2,042 street lights already solar** of 133,617 | Distance to transformer (grid readiness); street-light retrofit potential |
| Heritage 1,386 (Grade I 87) · World Heritage Site · Glass Facade 1,317 · Helipad 8 · Coastal 2 km | Automatic constraint flags (NOC, glare, unusable roof, corrosion design) |
| Charging Station 28 · Parking lots 95 + 39 · Bus stops 6,136 · Hoardings 8,671 | Solar carports, EV canopies, shelters, hoardings |
| Vacant Land 1,865 parcels · Slum Parcel 1.1 M · Water bodies 1,063 | Ground-mount, community solar, floating-solar screening |
| Pano 1.68 M street-level frames | Show the real photo of the selected building |
| Ortho imagery + 36,951 labelled panels | AI training data to detect panels / roof type (`roof_type` is 100% empty today) |

Data gaps to note honestly: `roof_type`, `structure_type` and tree `height` are empty; DSM/DEM are
rendered tiles, so pixel heights cannot be queried.

---

## 5. Feature plan

Effort: **S** ≤ 1 day, **M** 2–3 days, **L** 4–6 days (one developer).

### Phase 1: headline innovations (pick at least A, B, C, D)

**A. Mumbai Solar Atlas: every building scored (L)** *(replaces the placeholder heat map)*
- Batch engine in a Web Worker: per ward, fetch Building New (height, area, class, geometry),
  build a grid spatial index, and run the existing shadow-polygon maths at 4 representative days × 6 hours
  against neighbours within ~150 m.
- Cache results per ward in IndexedDB and ship them as `public/atlas/<ward>.json`, so the exhibition
  does not depend on venue Wi-Fi for heavy queries.
- Show 3D extrusions coloured by score, ward choropleth, and city KPIs: total kWp, GWh/yr, ₹/yr, t CO₂, homes powered.
- Click a ward → top-20 roofs, distribution histogram, and a jump into the detailed tool.

**B. Already-Solar & Adoption Gap (M)**
- Overlay the 36,951 mapped installations. Badge "Solar installed" in the tool.
- Per ward: suitable roofs vs installed, giving an **adoption %** and a **Ward Solar League** leaderboard.
- Validation slide: average SolarSight score of roofs that *did* install vs those that did not.
  If installed roofs score higher, the model has real-world evidence.

**C. "My Roof" citizen wizard (M)** *(uses `solarCalculations.computeScenario`, already written)*
- Search address → confirm building → enter monthly bill (₹) or units → choose DISCOM
  (BEST / Adani / Tata / MSEDCL).
- Output: recommended kW (right-sized, not roof-max), PM Surya Ghar subsidy, net cost, payback, 25-year
  savings curve, monthly generation vs consumption chart (monsoon dip visible).
- QR code on screen so visitors take their report home on their phone.
- Verify subsidy and tariff figures against current MNRE / DISCOM notifications before the event.

**D. Panel layout on the roof, in 3D (M–L)**
- Inset the footprint by a 1 m setback (`geometryEngine.offset`), lay a 1.7 × 1.0 m south-facing grid,
  and drop cells that fall outside or are shaded at most hours.
- Render each panel as a thin tilted 3D graphic at roof height. Panel count and kWp come from the
  real layout, not an area ratio.

**E. Sun-hours heat map on the roof (M)**
- Split the roof into 1–2 m cells; for each hour test cell centres against the union of shadow polygons
  (already computed). Colour cells by annual sun-hours. Panels from D go only on good cells.

**F. Redevelopment Shadow Audit (M)** *(unique to BMC's data)*
- Run the selected roof twice: neighbours at 2018 floors vs 2024 floors (Building2).
- "Since 2018, sunlight on this roof fell 23% — main cause: X (+12 floors)." Also flag
  "Under Construction" neighbours (3,413) as future risk. Turns What-If from hypothetical into evidence.

**G. BMC Public Rooftop Programme (S–M)**
- Filter the atlas to BMC-owned assets; rank by kWp, payback and CO₂.
  Export a CSV/PDF "tender-ready list" per ward.
- Social layer: community toilets without electricity, shelters, hospitals.

**H. Constraint flags (S)**
- On selection, intersect with Heritage / World Heritage / Glass Facade / Helipad / Coastal 2 km /
  nearest transformer, and show chips such as "Heritage Grade IIA: MHCC NOC required" or
  "Transformer 140 m away".

### Phase 2: user-friendliness and exhibition polish

| Item | Effort |
|---|---|
| **Exhibition / kiosk mode**: full-screen, idle 90 s → auto-reset and play the guided tour (mount `GuidedDemoTour` with real stops: atlas → best roof → What-If → audit) | M |
| Landing page with live city stats (route the existing `Landing.jsx`) | S |
| Score waterfall: which factor added or removed points | S |
| Monthly generation chart (`MONTH_FACTORS` already exist) | S |
| Compare two buildings side by side | M |
| Shareable deep link `?bld=<id>` (also powers the QR code) | S |
| Street photo from the Pano layer in the result card | S–M |
| Marathi / Hindi toggle for the citizen wizard | M |
| Dashboard on IndexedDB, aggregate charts, CSV export | S |
| Offline fallback: if the portal is unreachable, load cached atlas JSON and a recorded walkthrough | S |

### Phase 3: say it on the poster, build if time allows
- Real irradiance: NASA POWER / PVGIS monthly GHI for Mumbai instead of the flat 1,500 kWh/kWp.
- Roof slope and obstructions from DSM−DEM (needs the data team to publish an elevation ImageServer).
- **AI roof and panel detection** on BMC ortho imagery, trained on the 36,951 mapped panels; this also fills the empty `roof_type` field.
- Backend persistence and a ward-officer login for programme tracking.

---

## 6. Methodology v2 (one source of truth)

```
shadeFactor  = Σ_hours sunlitFraction·sin(alt) / Σ_hours sin(alt)     (4 days × hourly, alt ≥ 5°)
usableArea   = footprint × usableFraction(class)                       (table, shown in UI)
kWp          = min(layoutPanels × 0.33, usableArea × 0.15)
annual kWh   = kWp × specificYield(1,450–1,550) × shadeFactor
score        = 60·shadeFactor + 25·areaScore(log) + 15·obstructionScore  (no constants)
savings      = min(gen, consumption)·tariff(category) + surplus·exportRate
payback      = (cost − subsidy) / savings
```

Every constant (tariff, cost/kWp, CO₂ 0.82 kg/kWh (CEA), yield, panel size, bands) lives in one
exported object that the tool, PDF, dashboard, methodology page and README all read.

---

## 7. Exhibition demo script (3 minutes)

1. **Hook (20 s)**: Atlas view, the whole city glowing by score. "271,624 buildings. X GWh of untapped
   sunlight. Only 36,951 have panels."
2. **Ward League (20 s)**: tap the lowest-adoption ward; the top roofs light up.
3. **One roof (50 s)**: select a society; shadows sweep across the day; panels appear on the sunny cells;
   kWp, savings and payback.
4. **What-If and Audit (40 s)**: "Since 2018, this roof lost 23% of its sun to that new tower." Draw
   another tower live; the score and the rupees drop.
5. **Citizen (30 s)**: the visitor enters their own bill; a QR code takes the report to their phone.
6. **Policy close (20 s)**: BMC rooftop list and toilets without power: "Here is where the city should start."

Keep a 30-second version (steps 1, 3, 5) for busy moments.

---

## 8. Suggested order of work

| Week | Work |
|---|---|
| 1 | Phase 0 fixes and security; central constants; wire `solarCalculations`; README truth pass |
| 2 | A (Atlas) + B (Adoption gap) |
| 3 | C (My Roof + QR) + H (Constraint flags) + F (Redevelopment audit) |
| 4 | D/E (panel layout + roof heat map) + kiosk mode + offline cache + rehearsal |

If time is short, the minimum convincing set is **Phase 0 + A + B + C + kiosk mode**.

## 9. Venue risks
- **Network**: everything streams from `mybmc3d.mcgm.gov.in`. Test the venue network early; pre-cache atlas
  JSON; keep the recorded video ready.
- **GPU**: 3D with shadows needs a discrete GPU; set `qualityProfile` by device.
- **Credentials and PII**: see section 3.
- **Numbers**: rehearse answers on the score formula, yield, tariff and subsidy sources.
