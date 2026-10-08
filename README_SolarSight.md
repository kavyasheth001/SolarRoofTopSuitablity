  # SolarSight — AI-Powered Rooftop Solar Suitability Analysis

**Part of the TrueGeoMap / Antigravity MCGM 3D GIS Platform**
Developed for the Brihanmumbai Municipal Corporation (BMC/MCGM)

---

## What is SolarSight?

SolarSight is a geospatial decision-support tool that helps urban planners, municipal officers, and citizens identify which rooftops across Mumbai are suitable for solar panel installation — and by how much.

It combines ArcGIS Enterprise's 3D city model with real-time shadow simulation to compute a per-building solar suitability score, estimate energy generation, and project financial savings and carbon offsets. The analysis runs directly in the browser on the city's existing 3D GIS infrastructure.

---

## Core Problem Statement

Mumbai has over 12,500 mapped buildings in its 3D city model. Manually assessing rooftop solar suitability — factoring in roof area, shadow cast by neighbouring high-rises, orientation, and local sunlight hours — is infeasible at scale.

**SolarSight automates this:** select any building on the map, and the platform computes a shadow-corrected solar score, capacity estimate, and payback period in seconds.

---

## Key Features

### 1. 3D Shadow Analysis
- Simulates sun position across the year using ArcGIS SceneView's `ShadowAccumulation` analysis
- Computes the percentage of rooftop area under shadow for each hour of sunlight
- Used to derive a "sunny hours" metric (e.g. 4 out of 13 usable daylight hours)

### 2. Solar Suitability Score (0–100)
- Composite score derived from: sunlit percentage, roof area, capacity potential, and shadow accumulation
- Categorised as: **Suitable (60–100)**, **Moderately Suitable (35–59)**, **Unsuitable (0–34)**
- Score is building-specific, not ward-average

### 3. Financial & Environmental Projections
- **Capacity (kWp):** based on usable sunlit roof area × panel efficiency
- **Annual Generation (MWh/yr):** capacity × effective sunny hours
- **Savings (₹/yr):** generation × local tariff rate
- **Payback Period:** system cost ÷ annual savings
- **CO₂ Offset (t/yr):** generation × India's CO₂ emission factor for grid electricity

### 4. What-If Simulation
- Shows what the score *would be* without shading from neighbouring buildings
- Quantifies the shadow penalty: e.g. "77/100 without neighbours → 59/100 actual (−18 pts)"
- Helps planners prioritise buildings where tall neighbours are the limiting factor

### 5. Analysis Dashboard
- Aggregates all saved building analyses into a single view
- Summary KPIs: average score, total generation across analysed buildings, total savings, CO₂ offset
- Each building card shows full metrics, suitability tag, and PDF export
- Filterable/searchable by building name, sortable by newest/score

### 6. PDF Export
- Generates a branded single-page report per building
- Includes the 3D SceneView screenshot, all metrics, score, and projection tables
- Uses `view.takeScreenshot()` + `jsPDF` for in-browser generation

---

## Technical Architecture

### Frontend
- **React / Vite** — component-based UI within the TrueGeoMap platform shell
- **ArcGIS JS API 4.x** — `SceneView` for 3D rendering, `ShadowAccumulation` for analysis
- **ArcGIS Enterprise** — 3D city model served as I3S scene layers
- Component structure:
  - `SolarSightTool.jsx` — main tool panel, wired to the platform's ToolLayout
  - `SolarSightDashboard.jsx` — dashboard page, reads from saved-analyses state
  - Shadow analysis and scoring logic in a dedicated `solarUtils.js`

### Backend
- **Node.js / Express** — REST API within the MCGM platform backend
- Saved analysis records persisted to **PostgreSQL**
- ArcGIS token passed through the platform's existing JWT auth system
- PDF metadata optionally stored with analysis record

### Data Sources
- BMC 3D LOD2 building model (ArcGIS Enterprise Scene Layer)
- Ward boundary feature layer (24 wards, labelled A–T)
- Reality Mesh for detailed façade context
- Mumbai local electricity tariff rates (BEST / Adani Electricity)
- India CEA grid emission factor (0.82 kg CO₂/kWh)

---

## How the Score is Computed

```
sunlit_fraction  = sunlit_area / total_roof_area
capacity_kWp     = sunlit_area (m²) × 0.15 (kWp/m², standard 150W/m²)
generation_MWhyr = capacity_kWp × sunny_hours × 365 / 1000
solar_score      = (sunlit_fraction × 40)
                 + (min(sunny_hours, 13) / 13 × 30)
                 + (min(capacity_kWp, 200) / 200 × 30)
score            = clamp(solar_score, 0, 100)
```

The What-If score repeats the same calculation but with the shadow accumulation run without neighbour buildings in the scene.

---

## Platform Context

SolarSight is one of 140+ tools in the MCGM TrueGeoMap platform, which serves:
- Town Planning (TP)
- Storm Water Drain (SWD)
- Solid Waste Management
- Fire Brigade
- Health Department
- Heritage Conservation

SolarSight plugs into the same authentication (JWT), routing, tool registration (`useCallback` + `mapManager`), and export utilities as all other platform tools — it is not a standalone application.

---

## Mumbai Scale Statistics (Platform-wide)

| Metric | Value |
|---|---|
| Buildings in 3D model | 12,500+ |
| Wards covered | 24 (A–T) |
| Estimated solar potential | 3.2 GWh/yr |
| CO₂ saveable per year | ~2,600 t |
| Analysis mode | Real-time, per-building |

---

## Use Cases

1. **Municipal policy:** Identify wards with highest aggregate solar potential for incentive targeting
2. **Citizen portal:** Allow building owners to check their rooftop score before applying for net metering
3. **Developer feasibility:** Quick pre-assessment for solar EPC companies
4. **Urban planning:** Factor rooftop solar into new development approvals

---

## Future Roadmap

- **Ward-level heatmap:** Choropleth layer showing average solar score per ward across Mumbai
- **Batch analysis:** Run scoring across all buildings in a selected ward automatically
- **Panel layout visualisation:** Draw optimised panel grid on the 3D rooftop mesh
- **Net metering integration:** Connect with BEST/Adani API to auto-calculate grid feed-in credits
- **Time-lapse shadow playback:** Animate shadow movement across a rooftop for any selected date

---

## Credits

- Platform: TrueGeoMap / Antigravity — MCGM 3D GIS Platform
- Developer: [Your team name / KJSIT]
- Spatial data: Brihanmumbai Municipal Corporation (BMC/MCGM)
- 3D engine: Esri ArcGIS JS API 4.x + ArcGIS Enterprise
- Shadow analysis: ArcGIS `ShadowAccumulation` widget

---

*This tool is part of an ongoing initiative to integrate renewable energy planning into Mumbai's municipal digital infrastructure.*
