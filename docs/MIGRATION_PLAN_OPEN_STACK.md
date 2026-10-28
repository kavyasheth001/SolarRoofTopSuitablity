# SolarSight — Migration off ArcGIS to an Open-Source Stack

Goal: stop depending on the ArcGIS Maps SDK and BMC's ArcGIS servers. Export the data into a
locally run GeoServer + PostGIS stack, render the city in 3D with open-source libraries, and
restructure the app around that stack. This must be done **before** the features in
`AAVISHKAR_PLAN.md`, which then get built on the new stack.

Everything below is based on probing the live services from the running app on 2026-10-28,
on the code, on the machine, and on web research (sources at the end).

---

## 0. The answer in short

**It is possible. Most of it is straightforward. Two parts depend on getting source files.**

| Data | Can we pull it out ourselves? | How |
|---|---|---|
| All 315 vector layers (14.1 M features) | **Yes** | Every layer supports paged queries and GeoJSON output; 29 (including **Building New**) also have *Extract* enabled for official GeoPackage export |
| 3D buildings LoD2/LoD3 (I3S 1.9, Draco) | **Probably** | Convert I3S → 3D Tiles with `@loaders.gl/tile-converter`. Its docs list I3S 1.8 as supported, so 1.9 must be tested. Better: ask the vendor for the CityGML source (the slum LoD2 has `citygml_*` fields, so CityGML exists) |
| Reality mesh (I3S 1.7 IntegratedMesh, 30 layers) | Technically yes, practically too big | Converter supports 1.7 input, but the full-city photogrammetry is likely hundreds of GB. Get source from the vendor or convert one demo area only |
| DSM / DEM | **No** | Only published as rendered PNG/JPEG tiles (`TilesOnly`, format Mixed). The elevation values are not in them. **Need the original GeoTIFFs** |
| Ortho 2026 (Segments 01–04) | **No** (not properly) | Tile caches, `exportTilesAllowed: false`. Need source GeoTIFF/COG |
| Satellite 2000/2011/2020 + classified | Yes, slowly | ImageServers allow `exportImage` (raw U16, 0.4–0.8 m); large |
| NDVI Feb–Apr 2026 | Partly | Dynamic MapServer (rendered); source raster preferred |

### One correction to the idea: OpenLayers cannot be the 3D map
OpenLayers is a 2D library. It has no 3D buildings, no camera tilt and no shadows. The
standard open-source way to get 3D with OpenLayers is **OL-Cesium (`olcs`)**, which keeps an
OpenLayers map and adds a synchronised **CesiumJS** 3D globe. CesiumJS also has sun-position
lighting and real-time shadow maps built in, replacing ArcGIS's `Daylight` widget.

**Recommended engine:**
- **CesiumJS** (Apache-2.0) for the 3D scene, solar tool and shadows
- **OpenLayers** (BSD-2) for the 2D atlas, ward maps and dashboard
- `olcs` only if you want one shared layer list with a 2D/3D toggle

Do not use Cesium ion services (World Terrain, Bing imagery, ion token). Everything is served locally.

---

## 1. What the probe found

### Servers involved (four ArcGIS hosts, not one)
| Host | What | Layers |
|---|---|---|
| `bmc3dmumbai.com/server` (ArcGIS 11.3) | Most vector layers, DSM/DEM, NDVI, satellite | 233 feature |
| `prsrvgisapp.mcgm.gov.in/server` (10.91) | MCGM departmental layers (HE, sewerage, SWD, disaster…) | 67 feature |
| `services8.arcgis.com` (ArcGIS Online) | 14 Health Facilities layers | 14 feature |
| `enterprise.genesysmap.com` (vendor) | **All 3D**: LoD2, LoD3, slum LoD2, metro, bridges, flyovers, BMC HO BIM, Reality Model, 2026 ortho | ~270 scene / mesh |
| `testprsrvgisapp.mcgm.gov.in` | Built up Amenities | 1 |

### Vector service capabilities (all 315 feature layers)
- `supportsPagination`: **true for all 315**
- Query formats: `JSON, geoJSON, PBF` (248) and `JSON, geoJSON` (67)
- `maxRecordCount`: 2,000 (247), 1,000 (67), 5,000 (1), so about 7,500 requests for all 14.1 M features
- Capabilities: `Query` 173 · `Map,Query,Data` 67 · editing 46 · **`Query,Extract` 29**
  (Building New, Building Property Tax, IPVS Building, Heritage, Ward Boundary, Reservation,
  Landuse zones, Property, Proposed Road, Designation, Slum Boundary 2024 and the other DP layers)
- Native spatial references: EPSG:4326 (178), EPSG:32643 UTM 43N (134), EPSG:3857 (3)
- 90 layers have Z values

### 3D scene layers
| Group | Count | I3S | Type | Notes |
|---|---|---|---|---|
| LoD 2 without Texture | 28 | 1.9 | 3DObject, Draco, no textures | Fields include `roof_type`, `height`, `building_id`, `sac_number` |
| LoD 3 Buildings | 50 | 1.9 | 3DObject, Draco, JPG/DDS textures | Landmark buildings |
| Slum LoD 2 | 2 | 1.9 | 3DObject | `citygml_*` fields, so built from CityGML |
| Reality Model | 30 | 1.7 | IntegratedMesh, JPG | Vertical datum EGM96 (vcs 5773) |
| Metro / Mono / Flyovers / Bridges / Coastal Road / Sea Link | ~145 | — | 3DObject | Infrastructure models |
| BIM Model / BMC HO 3D | 23 | — | 3DObject (Revit-style fields) | Building interiors |

---

## 2. Before starting: permissions, disk, versions

1. **Written permission from the data owner.** The data belongs to BMC/MCGM, and the 3D models sit on the
   vendor's (Genesys) server. The portal account in `.env` was issued for running this app; a
   bulk harvest of 14 M records and the city's 3D models is a different use. Get a short written OK from
   the BMC GIS cell, and from Genesys for the 3D/ortho, before running the exporters. Ask them for the
   **source files** at the same time (CityGML/multipatch, DSM/DEM GeoTIFF, ortho COG). That one request
   removes the two hard problems.
   Note that Esri's licence covers the software, not BMC's data; leaving ArcGIS is not a licensing problem
   in itself.
2. **Disk.** C: has **8.3 GB free** of 475 GB. Docker on Windows also stores its VM disk on C:.
   Estimates (to be confirmed by the first exports):

   | Item | Estimate |
   |---|---|
   | Tier A vector layers in PostGIS (+indexes) | 2–4 GB |
   | All 315 vector layers | 10–20 GB |
   | LoD1 3D Tiles from 271,624 footprints | 0.5–2 GB |
   | LoD2 3D Tiles (whole city) | 5–30 GB |
   | Reality mesh (whole city) | 100 GB+ |
   | One ortho epoch at 0.5 m, compressed COG | 10–40 GB |

   Get a **≥ 500 GB external SSD** (or free 150 GB+ on C:) and move Docker's data disk there.
3. **Machine:** 15.7 GB RAM, Intel UHD graphics only. Enough for development; 3D shadows on a large
   area will be slow on integrated graphics. Use a laptop with a discrete GPU at the exhibition.
4. **Installed already:** Docker 29 (daemon not running), Java 25, PostgreSQL 17 **with PostGIS**,
   GDAL 3.9 `ogr2ogr`, Node 24, Python 3.11. GeoServer needs **Java 17 or 21**, not 25; use the Docker image.
5. **Versions to pin** (checked October 2026): GeoServer **3.0.2** stable / 2.28.6 maintenance;
   CesiumJS **1.146**; OpenLayers 10.x; `olcs` 2.2x; `@loaders.gl/tile-converter` 4.x (Node ≥ 18).

### Do not export to Shapefile
Shapefiles cut field names to 10 characters (`population_floors_wise` → `population`), cap at 2 GB,
and handle Unicode and nulls badly. Several of these layers would be damaged. Export to
**GeoPackage** or straight into **PostGIS**; GeoServer reads PostGIS natively. Make shapefiles only
if someone asks for one, from PostGIS.

---

## 3. Target architecture

```
                    ┌───────────────────────── Docker (local / exhibition laptop) ─────────────────────────┐
 Export scripts ──► │ PostGIS 17 ── schema bmc.*  (vector, 4326 + 32643 views, solar results tables)       │
 (one-time + delta) │    │                                                                                │
                    │    ├──► GeoServer 3.0 ── WFS (GeoJSON, CQL DWITHIN queries) · WMS/WMTS (GeoWebCache) │
                    │    │                     · Vector tiles (MVT) for big layers · CORS on               │
                    │    └──► pg2b3dm ──► 3D Tiles (LoD1 buildings, with attributes)                      │
                    │                                                                                     │
 I3S / CityGML ───► │ tile-converter / 3DCityDB+pg2b3dm ──► 3D Tiles (LoD2, LoD3, mesh)                   │
 DEM GeoTIFF   ───► │ cesium-terrain-builder ──► quantized-mesh terrain                                   │
                    │ nginx  ── static: /tiles3d/*  /terrain/*  /basemap/*.pmtiles                        │
                    └─────────────────────────────────────────────────────────────────────────────────────┘
                                         ▲
 React app (Vite) ── CesiumJS (3D) ─────┤   ← solar engine (pure JS, Turf.js) runs in the browser / Web Worker
                 └─ OpenLayers (2D) ────┘
```

Why this shape:
- **PostGIS does the heavy lifting.** City-wide scoring of 271,624 buildings (plan feature A) becomes SQL
  with spatial indexes, run once and stored as a table, which GeoServer then serves as a styled layer.
  In ArcGIS that would have been thousands of browser queries.
- **GeoServer** serves standard OGC services (WFS/WMS/WMTS/MVT) as you asked. 3D Tiles and terrain are
  plain static files; GeoServer does not serve 3D Tiles, so nginx does.
- **Offline-capable.** Everything runs on one laptop: no venue Wi-Fi needed.

---

## 4. Phase-by-phase plan

### Phase M0: set-up (1–2 days)
- Get the permissions and the source-file request out (section 2).
- External SSD; move Docker data; start Docker Desktop.
- `docker-compose.yml`: `postgis/postgis` (17-3.5), `docker.osgeo.org/geoserver` (3.0.2, with the
  vector-tiles extension, CORS on), `nginx` (static 3D Tiles, terrain, basemap). Persist volumes on the SSD.
- `.env.local` holds only local service URLs. No portal passwords in the frontend any more.

### Phase M1: vector export to PostGIS (3–4 days)
**Exporter** (`tools/export/`, Node script, run from a terminal and never shipped to the browser):
1. Get a token from `generateToken` (server-side, credentials from a local untracked file).
2. For each layer in a config list: read `/query?returnIdsOnly=true` (or `returnCountOnly`), then page with
   `resultOffset` / `resultRecordCount = maxRecordCount`, `orderByFields=objectid`, `outSR=4326`,
   `f=geojson`. Write newline-delimited GeoJSON with retry/backoff and resume-from-last-page.
3. For the 29 *Extract* layers, prefer the official route: `createReplica` → GeoPackage.
4. Load with `ogr2ogr -f PostgreSQL ... -lco SCHEMA=bmc -lco GEOMETRY_NAME=geom -nlt PROMOTE_TO_MULTI`.
5. Post-load SQL: `ST_MakeValid`, GiST index, `ANALYZE`, a `_32643` view for metre-based maths.
6. **Validate**: row counts must equal the counts in `MAP_LAYER_CATALOGUE.md`; log any mismatch.

**Export in tiers.** Do not pull all 14 M first.
| Tier | Layers | ≈ features |
|---|---|---|
| A: solar core | Building New, Building2, Solar panel polygon/point, Ward Boundary, Prabhaag, Census Ward, Locality, BMC Buildings + BMC asset BLDG layers, Heritage, World Heritage, Glass Facade, Helipad, Coastal 2 km, Power Supply Network Points/Lines, Community Toilet Point, Temporary Shelters, Hospitals, Charging Station, Land Use Land Cover, Tree Clad Area | ≈ 1.3 M |
| B: context | Roads, Footpath, Rail, Metro, Water bodies, Gardens, Reservation, Landuse zones, Slum Boundary, Bus stops, Parking | ≈ 0.4 M |
| C: everything else | Pano 1.68 M, Trees 1.45 M, Slum Parcel 1.1 M, Utility 0.78 M, sewer/SWD networks, IPVS… | ≈ 12 M |

**PII rule:** for Building Property Tax / Property Ownership / Estate Property, export only geometry,
IDs and aggregate unit counts (`resunit`, `comunit`, `indunit`). Do not store names, phones or e-mails locally.

### Phase M2: publish in GeoServer (2 days)
- Workspace `bmc`, one PostGIS store, publish Tier A/B.
- SLD styles matching today's look; GeoWebCache gridsets EPSG:3857 + 4326.
- Vector tiles (MVT) for Building New and other large polygon layers.
- WFS for queries: the solar tool's "neighbours within 200 m" becomes
  `CQL_FILTER=DWITHIN(geom, POINT(lon lat), 200, meters)`.
- Optional: SQL views for the solar results table (`bmc.solar_score`).
- Lock down: read-only, admin password changed, no anonymous WFS-T.

### Phase M3: 3D content (3–6 days, parallel tracks)
- **Track 1: LoD1 from footprints (do this first; guaranteed).**
  Building New has footprints and `height` for 271,575 buildings. pg2b3dm does not extrude by itself, so
  extrude first in PostGIS (SFCGAL `ST_Extrude`, or Geodan's companion `tesselate_building` tool),
  then run **pg2b3dm** to make 3D Tiles with `bld_id`, `height`,
  `class` and `ward_name` per feature, so every building is clickable.
  For scale: pg2b3dm converted 9.7 M Dutch buildings in about 2 hours; 271 K should take minutes.
  This alone is enough for shadow analysis, since the current tool already uses footprints + heights.
- **Track 2: LoD2/LoD3 detail.**
  - Best: vendor CityGML → **3DCityDB v5** (PostgreSQL) → pg2b3dm → 3D Tiles. This keeps `RoofSurface`
    semantics, which enables real per-roof-plane solar analysis later.
  - Fallback: `npx @loaders.gl/tile-converter --input-type I3S --tileset <SceneServer/layers/0> --output ...`
    per layer. Test on one LoD2 segment first because the source is I3S 1.9 and the docs list 1.8.
- **Track 3: Reality mesh.** Convert one demo area only (I3S 1.7 is a supported input), or get the
  vendor's original mesh (often OSGB or 3D Tiles already). Not needed for the solar maths.
- **Terrain.** Mumbai is low-relief, so the ellipsoid plus building heights is acceptable at first.
  When the BMC DEM GeoTIFF arrives: `cesium-terrain-builder` (Docker, quantized-mesh) → nginx.
  Interim open alternative: Copernicus GLO-30 DEM.
- **Basemap.** OSM-based **PMTiles** extract of Mumbai (single static file, works offline), plus BMC ortho
  as a GeoServer WMTS once the source COGs are supplied.

### Phase M4: restructure the frontend (6–8 days)
New layout (UI components stay; only the map plumbing changes):
```
src/modules/geoserver-map/      (standalone page, separate from the ArcGIS app)
  engine/CesiumEngine.js     viewer, camera, picking, screenshots, sun/shadows
  engine/OlEngine.js         2D atlas / dashboard maps
  layers/registry.json       every layer: id, title, group, kind (wfs|wms|mvt|3dtiles), url, style, visibleByDefault
  layers/LayerManager.js     builds layers from the registry, visibility, layer list UI
  data/wfs.js                getFeatures(layer, {bbox|cql|ids}), count(), dwithin()
  geo/turfOps.js             union, intersect, area, buffer, offset (replaces geometryEngine)
src/solar/                   pure functions only: sunPosition, shadowPolygons, score, finance (+ Web Worker)
```

**Replacement map for the ArcGIS SDK:**
| ArcGIS SDK (today) | Open replacement |
|---|---|
| `WebScene` + `SceneView` (`mapManager.js`) | `Cesium.Viewer` singleton (same attach/detach pattern) |
| Portal login, `IdentityManager`, `esriConfig` | Removed; local services need no tokens |
| `FeatureLayer.queryFeatures` / `createQuery` | `data/wfs.js` (GeoServer WFS GeoJSON + CQL) |
| `geometryEngine` (union, intersect, geodesicArea, geodesicBuffer) | **Turf.js** (`union`, `intersect`, `area`, `buffer`) |
| `webMercatorUtils` | Work in EPSG:4326 / 32643 via `proj4`; Cesium `Cartographic` |
| `Graphic` + `PolygonSymbol3D/ExtrudeSymbol3DLayer` | `Cesium.Entity` polygon with `extrudedHeight` |
| `SketchViewModel` (draw polygon) | Small click-to-draw tool on `ScreenSpaceEventHandler` |
| `Daylight` widget, `environment.lighting.date` | `viewer.clock.currentTime` + `viewer.shadows = true` (`ShadowMap`) |
| `view.hitTest` | `scene.pick` → `Cesium3DTileFeature.getProperty()` |
| `view.goTo` | `camera.flyTo` |
| `takeScreenshot` | `scene.requestRender` + canvas `toDataURL` |
| `Search` widget + `rest/locator` | PostGIS search over building names/addresses (`pg_trgm`), via a GeoServer SQL view |
| `ScaleBar`, `Compass`, `Locate`, `Home` | Cesium built-ins + small custom controls |

**Files on the live path to port** (9): `utils/mapManager.js`, `context/MapContext.jsx`,
`Maps/TwoDMap.jsx`, `Tools/SolarSuitabilityTool.jsx`, `Tools/SceneIdentifyTool.jsx`,
`Tools/ShadowAnalysisWidget.jsx`, `Tools/SearchLocationTool.jsx`, `Tools/AreaHeatmapTool.jsx`,
`Tools/GuidedDemoTour.jsx`.
**Delete, don't port** (inherited from the parent platform, not reachable from any route):
`Maps/ProjectMap.jsx`, `InitialMap.jsx`, `QueryTools.jsx`, `Proposed.jsx`, `Gis.jsx`,
`LayerListModal.jsx`, `Tools/CustomPopup*.jsx`, `Cards/DeviationResultContainer.jsx`,
`Assessment/*`, `utils/checkLayerHealth.js`, `utils/logAllAttributes.js`. Then remove `@arcgis/core`
and `@esri/calcite-components` from `package.json`.

The solar maths ports almost unchanged. It already works on plain polygon rings and sun angles; only the
geometry calls change from `geometryEngine` to Turf. Do the Phase 0 fixes from `AAVISHKAR_PLAN.md`
while moving it into `src/solar/`.

### Phase M5: parity check and cut-over (2–3 days)
- Pick 10 reference buildings (including "Cnergy" from the video). Run the old ArcGIS build and the new
  build; score, sunny hours and kWh must match within a few percent.
- Check the What-If tower, PDF, dashboard and search.
- Performance target: city view under 3 s; building analysis under 5 s on the exhibition laptop.
- Keep the ArcGIS version on a `legacy-arcgis` branch as a fallback until the new one passes.

---

## 5. Timeline (one developer)

| Week | Work |
|---|---|
| 1 | M0 set-up, permissions/source request, M1 Tier A export + validation |
| 2 | M2 GeoServer, M3 Track 1 LoD1 3D Tiles, PMTiles basemap |
| 3–4 | M4 frontend restructure (engine, registry, WFS client, solar engine on Turf) |
| 5 | M3 Tracks 2/3 as source data allows, M5 parity, cut-over |
| 6+ | `AAVISHKAR_PLAN.md` features on the new stack (Atlas first, now easier with PostGIS) |

If the exhibition is sooner than about 6 weeks, run both: demo the ArcGIS build (with the Phase 0
fixes) and show the open-stack build as "v2 in progress", or run the migration on a branch.

## 6. Risks
| Risk | Mitigation |
|---|---|
| No permission for bulk export / 3D | Ask first; LoD1 from footprints needs only Building New (Extract-enabled by its owner) |
| I3S 1.9 conversion fails | Test one segment on day 1 of M3; fall back to CityGML source or LoD1 |
| DSM/DEM/ortho not supplied | Ellipsoid + building heights; Copernicus DEM; OSM basemap |
| Disk space | External SSD before anything else |
| Integrated GPU too slow for shadows | Limit shadow distance, LoD1 outside focus area, discrete GPU at venue |
| Data goes stale vs BMC servers | Re-runnable exporter with per-layer `last_exported` and counts |

## 7. Licences of the replacement stack
CesiumJS: Apache-2.0 · OpenLayers: BSD-2-Clause · olcs: BSD-2-Clause · GeoServer: GPL-2.0 (server
only; does not affect your app's licence) · PostgreSQL: PostgreSQL License · PostGIS: GPL-2.0 ·
Turf.js: MIT · loaders.gl: MIT · pg2b3dm: MIT · 3DCityDB: Apache-2.0 · cesium-terrain-builder: Apache-2.0.
Basemap data: OpenStreetMap is ODbL and needs attribution on screen.

## Sources
- GeoServer download (3.0.2 stable, 2.28.6 maintenance; Java 17/21): https://geoserver.org/download/
- GeoServer 2.28.0 release notes (Java 17 minimum): https://discourse.osgeo.org/t/geoserver-2-28-0-released/150129
- OL-Cesium: https://github.com/openlayers/ol-cesium · https://openlayers.org/ol-cesium
- CesiumJS October 2026 release (1.146): https://cesium.com/blog/2026/10/02/cesium-releases-in-october-2026/
- CesiumJS I3S support: https://cesium.com/blog/2023/02/06/cesiumjs-adds-support-for-indexed-3d-scene-layers-i3s/
- loaders.gl tile-converter CLI: https://loaders.gl/docs/modules/tile-converter/cli-reference/tile-converter
- loaders.gl supported features (I3S 1.8; 1.6/1.7 input; 3DObject + IntegratedMesh): https://loaders.gl/docs/modules/tile-converter/cli-reference/supported-features
- pg2b3dm: https://github.com/Geodan/pg2b3dm · CityGML/3DCityDB workflow: https://geodan.github.io/pg2b3dm/dataprocessing/dataprocessing_citygml.html
- Footprint extrusion for pg2b3dm: https://github.com/bertt/tesselate_building
- 3DCityDB v5: https://github.com/3dcitydb/3dcitydb
- Cesium terrain builder (quantized-mesh, Docker): https://github.com/tum-gis/cesium-terrain-builder-docker
- GDAL ESRIJSON / FeatureService driver: https://gdal.org/drv_esrijson.html
- ArcGIS Enterprise: exporting hosted layers ("Allow others to export"): https://enterprise.arcgis.com/en/portal/11.1/use/use-hosted-layers.htm
