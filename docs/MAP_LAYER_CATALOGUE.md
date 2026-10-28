# SolarSight — Live Map Layer Catalogue

Harvested on 2026-10-28 from the running app (`/mumbai/map`) by walking `view.map.allLayers`
and querying every feature layer for its schema, record count and value distributions.

**Totals:** 682 layers — 315 feature, 267 scene (LoD2/LoD3/BIM mesh), 30 integrated-mesh
(Reality Model), 49 groups, 10 tile (DSM, DEM, ortho, density), 6 imagery (2000/2011/2020
satellite and classified), 3 map-image (NDVI Feb/Mar/Apr 2026), 1 elevation (Esri World Terrain).
All 315 feature layers loaded with no errors; together they hold **14.1 million records**.

> Privacy: `Building Property Tax` / `Building_Property_Tax_Point` / `Property Ownership*` /
> `Estate Property` contain billing names, phone numbers, e-mails and owner names. Never show these
> fields on an exhibition screen (Identify tool included).

---

## 1. Layers that directly power solar features

### Building > Building New — 271,624 polygons (the tool's main layer)
| Field | What is in it (live distribution) |
|---|---|
| `height` (double) | 271,575 non-zero; avg **11.3 m**, max **282.9 m** |
| `area_sqmtr` (double) | avg **227.7 m²**, max 132,834 m², total **61.8 km²** of footprint |
| `no_floors` (string) | G=108,940 · G+1=75,697 · G+2=21,218 · G+3=17,102 · G+4=12,525 · G+7=10,624 · … |
| `class` | Residential 149,510 · Mixed 44,699 · Commercial 28,211 · Industrial 12,021 · Central Govt 8,702 · Educational 4,207 · State Govt 3,924 · Religious 3,752 · Under Construction 3,413 · Public/Semi-Public 3,159 · Public Utilities 2,377 · Health 1,883 · … |
| `sub_class` | Residential Area 148,264 · Residential & Commercial 42,337 · General Business 15,253 · Quarter 7,994 · Office 4,610 · School 2,631 · Industrial Estate 2,543 · Temple 2,526 · Podium_Parking 1,777 · … |
| `cons_type` | RCC 201,154 · Load-bearing/Semi Pucca 64,689 · Kutcha 2,787 |
| `population` / `flat_count` | 198,763 populated; population total **20.6 M**, flats total **5.16 M** (avg 26/building) |
| `ward_name` / `zone_name` | 24 wards (R/C largest: 36,236) · Western Suburbs 141,785 · City 80,117 · Eastern Suburbs 49,722 |
| `roof_type`, `structure_type`, `use` | **Empty** (100% null / blank) — cannot be used; a gap the project can fill |
| other | `name`, `address`, `locality`, `rd_name`, `sac_number`, `cts_no`, `bld_id`, `postal_code`, `bmc_assets` |

`Building` (269,339) and `Building Points` (266,795) carry the same schema.

### Environment Department > Solar panel polygon — 36,951 / Solar Panel Point — 36,935
Existing rooftop installations already mapped by BMC.
- `type`: Solar Panel 34,462 · Water Solar Panel (solar water heater) 2,489
- `bldg_class`: Residential 11,078 · Mixed 4,591 · Commercial 4,410 · Educational 2,899 · Industrial 2,584 · Central Govt 2,426 · Transportation 1,383 · State Govt 1,024 · Health 993 · …
- `ward_no`: K/E 3,115 · K/W 2,929 · A 2,883 · S 2,705 · L 2,522 · R/C 2,258 · R/S 2,253 · … · B 219 · C 144
- `zone_name`: Western 16,972 · Eastern 11,755 · City 8,224
- `area` is 0 everywhere — compute area from geometry.

### Additional Layer > Building2 — 267,383 polygons (2018 vs 2024 change)
- `difference_status`: Developed **23,971** · Demolished **14,749**
- `floor_difference` (where developed): avg **+4 floors**, max **+78**, total +94,884 floors
- `usage_2018`: Residential 68,731 · Mixed 30,604 · Commercial 19,927 · Industry 2,960
- Also `no_of_floors_2024`, `no_of_floor_2018`, `area_sq_m_2018/2024`, `usage_difference`

### Building > Building Property Tax — 234,828 polygons (+ point copy)
Usable for tariff category: `resunit`, `comunit`, `indunit`, `landunit`, `totalunit`
(`comunit` > 0 on 51,238 buildings, avg 9.6 units), `financial_year`, `cv` (capital value).
**Contains PII** — use aggregated unit counts only.

### Utility > Power Supply Network Points — 207,515
- `sub_class`: Street Light 133,617 · Electrical Box 46,704 · Lamp Post 11,814 · Traffic Light Post 5,707 · Pole 3,532 · Electrical Switch 2,929 · Transmission Tower 2,006 · High Mast Light 990 · **Transformer 143** · **Electric Sub-Station 72** · Power Plant 1
- `sou_energy`: Electricity 144,374 · **Solar 2,042** (already-solar street lights) · blank 61,094
- Power Supply Network Line: 2,406

---

## 2. Context, constraint and opportunity layers

| Group > Layer | Records | Solar use |
|---|---|---|
| Boundary > Ward Boundary | 25 | Ward atlas / choropleth / league table |
| Boundary > Census Ward | 88 | Population per census ward (`total_population`) |
| Boundary > Prabhaag Boundary | 227 | `POPULATION`, `COUNCILLOR`, `JR_ENGG` — councillor-wise report cards |
| Boundary > Locality 101 · Sub Locality 1,058 · Pin Code 83 | — | Finer aggregation levels |
| BMC Asset > BMC Buildings | 6,994 | BMC's own roof portfolio |
| BMC Asset > School BLDG 582 · Hospitals Main 290 · Offices 449 · Markets 190 · Pumping Station 379 · Public Toilet 3,543 · Fire Station 134 · Funeral 540 · Bus Depot 215 | — | Public rooftop programme ranking |
| Utility > Community Toilet Point | 8,251 | `electric_connection`: **4,977 without power**, 3,274 with — solar for toilets |
| Disaster Mgmt > Temporary Shelters 1,014 · Hospitals 873 · Flooding Spots 937 · Landslide Prone 379 | — | Solar + battery resilience during monsoon outages |
| Development Plan > Heritage | 1,386 | Grade I 87 · IIA 364 · IIB 330 · III 558 — MHCC NOC flag |
| Development Plan > World Heritage Site · Agiary 47 | — | Restriction flags |
| Fire Dept > Glass Facade Building | 1,317 | Glare/reflection flag |
| Utility > Helipad | 8 | Roof unusable flag |
| Disaster Mgmt > Coastal Line 2 Km | 1 | Corrosion/wind-load design flag |
| Fire Dept > Charging Station | 28 | EV + solar canopy |
| Utility > Public Parking Lots 95 · BMC Parking Off Street 39 · On Street 385 | — | Solar carports |
| Transport > Bus Stop | 6,136 | Solar bus shelters |
| License > Hoardings | 8,671 | Solar-lit hoardings |
| Tree and Garden > Tree / Trees | 1,453,109 | Vegetation shading (`height` is 0/empty → use a default canopy height) |
| Tree and Garden > Tree Clad Area | 124,422 | Canopy shading polygons |
| LandUse > Land Use Land Cover | 33,639 | Residential 7,677 · Slum 2,041 · **Vacant Land 1,865** · Commercial 1,500 · Industrial 1,485 · Educational 1,456 |
| Building > Slum Parcel 1,100,966 · DP > Slum Boundary 2024 1,982 | — | Community solar / low-income targeting |
| Hydrography > Water Bodies Polygon 1,063 · Lake Point 107 | — | Floating-solar screening (non-drinking-water bodies only) |
| `Pano` (top level) | 1,682,803 | Street-level panorama frames — show the real building photo |
| DP > Under Construction (Building class) | 3,413 | Future-shadow warning |

## 3. Raster / 3D layers
| Layer | Type | Notes |
|---|---|---|
| Merge DSM, Merge DEM | tile (MapServer) | Rendered tiles only — values not queryable. Publishing as an elevation/ImageServer would unlock nDSM roof height & slope |
| NDVI Feb/Mar/Apr 2026 | map-image | Vegetation index — tree-shade context |
| 2000/2011/2020 Satellite + Classified | imagery | Time-lapse / urban growth |
| BMC Segment 01–04 Ortho | tile | High-res ortho — basis for roof-type / panel detection |
| LoD 2 without Texture, Slum LoD 2, LoD 3 Buildings | scene (mesh) | 267 scene layers; LoD3 includes BIM-style fields (`bldglevel`, `category`, `family`…) |
| Reality Model | integrated-mesh ×30 | Photoreal city mesh |
| Tree / Toilet / Silent Zone Density | tile | Pre-rendered density surfaces |

## 4. Remaining groups (not solar-relevant, catalogued for completeness)
Hydraulic Engineering (31 layers: pipelines 50,011, valves, chambers, reservoirs 31…), Sewerage
(manholes 95,339, sewer lines 96,073, network points 493,648), Storm Water (drains 34,711, network
points 305,083), SWM (garbage points 15,388), Transport (roads 57,061 lines / 14,124 polygons,
footpaths 41,401, rail, metro 75), Traffic, Health Facilities (immunisation 4,466 …), GCP survey
points, Removal & Encroachment (complaints 9,796), Redline (edit-staging copies, mostly empty),
Contour (353,680 lines), Stream Lines (467,902), Utility points 776,602, SWD/Water 155,069.

Service URLs for every layer are in the saved web scene `webscene.json` (note: it is UTF-16
encoded, so decode with `utf16le` before `JSON.parse`; child layers are stored as PowerShell
`@{...}` strings).
