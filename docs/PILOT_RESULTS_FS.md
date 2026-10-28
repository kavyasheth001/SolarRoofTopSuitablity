# Open-Stack Pilot — Results (F/S ward)

Date: 2026-10-28. Goal: before planning the full migration, push one real layer through the whole
open-source chain and check that it shows up in our own app like it does in ArcGIS.

## Result: the vector chain works end to end

```
ArcGIS REST (bmc3dmumbai.com) ──export──► GeoJSON ──ogr2ogr──► PostGIS 17 ──► GeoServer 3.0.2 ──► OpenLayers 10 (2D) + CesiumJS 1.146 (3D)
```

| Check | Result |
|---|---|
| Export Building New clipped to F/S | **9,548 / 9,548** features (count matches server), 19.9 MB GeoJSON, 20 s |
| Load into PostGIS | 9,548 rows, 0 invalid geometries, all with `height`, **9 MB** on disk |
| GeoServer WFS | `numberMatched=9548`; spatial query `DWITHIN(geom, point, 200 m)` works (needed by the solar tool) |
| GeoServer WMS | PNG map of F/S renders correctly |
| Vector tiles (MVT) | Extension installed and answering; per-layer tile caching still to be switched on |
| CORS | `Access-Control-Allow-Origin: *`, so the Vite app can call GeoServer directly |
| 3D in the GeoServer map page (`/mumbai/geoserver-map.html`) | All 9,548 buildings extruded by height, loaded from WFS in **1.6–2.5 s** |
| Sun and shadows | Day (today / solstices / equinox) and IST time slider move the real sun; shadows render |
| Picking | Clicking a building shows its GeoServer attributes (name, class, floors, height, footprint, ID) |
| 2D ↔ 3D | Clicking the OpenLayers map flies the Cesium camera there |

Tallest buildings in F/S (from PostGIS): One Avighna Park 246.9 m (G+61), Island City Centre 2
221.8 m, Lodha Venezia A/B 221.3 m, Celestia Spaces A 216.0 m. These are good shadow-demo subjects.

### Compared with the ArcGIS view
- **Same:** the same buildings, footprints, heights and attributes, all loaded from our own server.
- **Different:**
  - Buildings are LoD1 blocks (footprint × height), while ArcGIS shows the vendor's LoD2 roof shapes.
  - The basemap is OpenStreetMap, not the BMC ortho.
  - There is no terrain; Mumbai is low-relief, so this is acceptable for now.
- **Not tested yet** (pilot part B): LoD2 I3S → 3D Tiles conversion, Reality Model, rasters (see "Next").

## F/S import: all layers the project needs (done 2026-10-28)

Only layers that a planned feature uses were exported: **26 of the 44** candidates. The 18 left out
(Pano, roads, rail, water bodies, gardens, LULC, census ward, sub-locality, power lines, EV charging,
bus stops, parking, DP reservation, slum boundary) are listed with reasons under `excluded` in
`tools/export/fs-layers.json`, so any of them can be added back with one command.

| Check | Result |
|---|---|
| Export (26 layers, clipped to F/S) | **77,571 features**, 116 MB GeoJSON, 85 s; every count equals the server's count |
| PostGIS | 26 tables, typed geometry columns, GiST spatial index on each, **0 invalid geometries**, 63 MB in schema `bmc` |
| GeoServer | 26 layers published, each with its own style; WFS `numberMatched` equals the PostGIS count for all 26 |
| Pilot map | Layer panel (7 groups) shows live counts for all 26; toggles drive the OpenLayers WMS and a WMS overlay draped in Cesium |
| Disk (monitored every 5 s) | `infra/data` grew by 212 MB (now 350 MB); C: free 172.8 → 172.5 GB |

Layer list, groups, titles, draw order and styles live in one place, `src/modules/geoserver-map/layers/registry.json`,
which both the map and `tools/export/apply-styles.py` read.

## 3D terrain and hillshade (replaces ArcGIS World Elevation + World Hillshade)

| Item | Result |
|---|---|
| Source | Copernicus DEM GLO-30 (open data, AWS), only the Mumbai-region window read via GDAL `/vsicurl/` |
| Coverage | 72.60–73.25°E, 18.70–19.55°N: all of Greater Mumbai (wards span 72.776–72.981°E, 18.894–19.270°N) plus Thane creek, Navi Mumbai, Elephanta, Vasai/Yeoor hills |
| Grid | 2340 × 3060 cells at 30 m, 100 % valid, −11.5 to 812 m |
| Heights | Relative to mean sea level (EGM2008), so the sea joins the flat globe with no step. Vendor 3D Tiles in ellipsoidal heights will need a fixed +67 m offset at Mumbai |
| Terrain tiles | 6,286 gzip quantized-mesh tiles (zoom 0–14, vertex normals), 22 MB, served by nginx at `http://localhost:8601/terrain/mumbai-cop30` |
| Hillshade | GeoServer raster `bmc:mumbai_hillshade`, style keeps flat ground transparent so only ridges and valleys shade the basemap |
| In the map | Cesium uses the local terrain; every F/S building is placed on the sampled ground height; hillshade is under the data layers in both 2D and 3D |
| Spot checks | Sea 0 m, Parel 16.8 m, Malabar Hill 57.6 m, SGNP ridge sample 139.8 m |

Rebuild everything with `bash tools/terrain/build-terrain.sh` (about 70 s). Copernicus DEM is a surface model,
so dense high-rise blocks are slightly raised at 30 m resolution; swap in BMC's bare-earth DEM GeoTIFF when it
is supplied (same script, different input).

Two lessons fixed in config:
- cesium-terrain-builder writes gzip tiles, so nginx must send `Content-Encoding: gzip` for `.terrain`.
- Terrain tiles are served with `Cache-Control: no-cache`, so browsers never keep a stale or wrongly-encoded copy.

## How to run it again

```bash
# 1. Start the stack (PostGIS :5433, GeoServer :8600, static files :8601)
docker compose -f infra/docker-compose.yml up -d
# 2. Export all 26 needed F/S layers (add --pilot for just ward + buildings, or --only a,b)
node tools/export/export-arcgis.mjs --config tools/export/fs-layers.json
# 3. Load into PostGIS, publish in GeoServer, apply styles
bash tools/export/load-and-publish.sh
python tools/export/apply-styles.py
# 4. Open the GeoServer map at http://localhost:8080/mumbai/geoserver-map.html
npm run dev
```
Admin UI: http://localhost:8600/geoserver (credentials in `infra/.env`, local-only, git-ignored).

Files added: `infra/docker-compose.yml`, `infra/nginx.conf`, `tools/export/export-arcgis.mjs`,
`tools/export/fs-layers.json`, `tools/export/load-and-publish.sh`, `tools/copy-cesium-assets.mjs`,
`src/modules/geoserver-map/` (standalone page `geoserver-map.html`, its own entry point; the existing ArcGIS app in `index.html` / `src/App.jsx` is untouched). Dependencies added: `cesium@1.146.0`, `ol@10.11.0`.

---

## F/S demo area: layers needed (measured)

F/S ward: Parel, Lalbaug, Sewri and Naigaon (9.87 km², City District). Counts are features that intersect
the F/S boundary; size is measured GeoJSON from a 200-feature sample per layer.

| Layer | Features | GeoJSON MB | Used for |
|---|---:|---:|---|
| Building New | 9,548 | 26.8 (19.9 actual) | Core: footprints, height, class, population |
| Building2 (2018→2024) | 9,519 | 18.4 | Redevelopment shadow audit |
| Building Property Tax (non-personal fields only) | 8,067 | ≈10* | Tariff category (res/com/ind units) |
| Solar panel polygon / point | 664 / 663 | 1.0 | Already-solar, adoption gap |
| Tree / Tree Clad Area | 38,258 / 4,377 | 18.5 / 102.4 | Vegetation shading |
| Power Supply Network Points / Lines | 5,724 / 75 | 4.0 | Transformers, solar street lights |
| Land Use Land Cover | 1,086 | 5.7 | Vacant land, context |
| Road polygon / line, Rail polygon | 457 / 1,778 / 86 | 7.8 | Context |
| Water Bodies, Garden | 18 / 25 | 1.4 | Context |
| BMC Buildings + School/Hospital/Office/Market/Pumping/Toilet/Fire BLDG | 213 + 166 | 0.5 | Public rooftop programme |
| Heritage, Glass Facade, Coastal 2 km | 30 / 23 / 1 | 0.4 | Constraint flags |
| Community Toilet Point, Temporary Shelters, Hospitals, EV Charging | 158 / 45 / 28 / 1 | 0.3 | Social / resilience layers |
| Ward, Prabhaag, Census Ward, Locality, Sub-locality | 5 / 16 / 9 / 7 / 47 | 0.5 | Boundaries and aggregation |
| DP Reservation, Slum Boundary 2024, Flooding Spots, Bus Stop, Parking | 182 / 35 / 39 / 168 / 5 | 0.9 | Context |
| Pano (street-level frames) | 54,886 | 67.1 | Optional: building photos |
| **Total (44 layers)** | **≈ 136,400** | **≈ 296** (≈ 200 without the tax PII fields) | |

\* The full tax layer is 40 MB because of billing and contact fields; the exporter only requests non-personal fields.
Empty in F/S: World Heritage Site, Helipad, Landuse zones.

## Storage estimate for the F/S demo area

| Item | Estimate | Basis |
|---|---:|---|
| Vector layers in PostGIS (+ indexes) | 0.2–0.4 GB | measured 0.45 ratio PostGIS:GeoJSON on Building New |
| Raw GeoJSON exports (kept for re-loads) | 0.3 GB | measured |
| LoD1 3D Tiles (9.5 k buildings) | 0.02–0.05 GB | small: one extruded block per building |
| LoD2 / LoD3 3D Tiles for F/S | 0.5–2 GB | untextured Draco meshes; confirm in pilot B |
| Reality Model (textured mesh) for F/S | 10–40 GB | photogrammetry typically 1–4 GB/km² across all detail levels; largest uncertainty |
| Ortho for F/S (COG, JPEG) | 0.5–3 GB | 9.87 km² at 5–10 cm |
| DSM + DEM for F/S (float32) | 0.3–1.3 GB | 0.25–0.5 m cells |
| Satellite 2000/2011/2020 for F/S | ≈ 1 GB | 0.4–0.8 m, 4-band U16 (measured service specs) |
| Docker images (GeoServer, PostGIS, GDAL, nginx, tile-converter) | 4–6 GB | 2.6 GB measured so far |
| Scratch space during conversions | ×2 of the largest item | |
| **Total without Reality Model** | **≈ 8–15 GB** | |
| **Total with Reality Model** | **≈ 30–80 GB** | |

The 150 GB set aside is enough for the whole F/S demo area, including the Reality Model.

## Next (pilot part B, before the full F/S migration)
1. **LoD2 3D test.** Find the LoD2 segment covering F/S, convert it with `@loaders.gl/tile-converter`
   (Docker image `visgl/tile-converter`), and load the 3D Tiles in the GeoServer map page next to the LoD1 blocks.
   This proves (or rules out) the I3S 1.9 conversion. The 3D lives on `enterprise.genesysmap.com`, so the
   exporter needs the second-portal token added.
2. **Rasters.** Ask BMC/vendor for F/S DSM/DEM GeoTIFF and ortho COG (the published services hold only
   rendered images). Meanwhile, test one satellite `exportImage` clip of F/S into GeoServer.
3. **Pin the GDAL image** to a release tag (pilot used `alpine-small-latest`, a 3.14 dev build).
4. Then run `export-arcgis.mjs` for all 44 F/S layers, `load-and-publish.sh`, and write the full F/S
   migration plan.
