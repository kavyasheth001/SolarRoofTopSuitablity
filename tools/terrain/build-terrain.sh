#!/usr/bin/env bash
# Build local 3D terrain + hillshade for the Mumbai region (no ArcGIS, no Cesium ion).
#   bash tools/terrain/build-terrain.sh
# 1. Reads only the Mumbai window of the open Copernicus GLO-30 DEM (AWS open data) via GDAL /vsicurl/.
#    Heights stay relative to mean sea level (EGM2008) so the sea joins the flat globe without a step.
# 2. Bare earth. GLO-30 is a surface model: in dense blocks it sits 3-9 m above the street (median 4 m in F/S),
#    which buries LoD2 buildings and the Reality Mesh. So:
#      - a morphological opening (7 x 7 cells, 210 m: min then max) removes building-sized bumps everywhere;
#      - where infra/data/terrain_src/lod2_ground.csv exists (true ground at each LoD2 building base, from
#        tools/terrain/lod2-ground.mjs), that ground is interpolated and blended in (tools/terrain/bare_earth.py).
# 3. Builds gzip quantized-mesh tiles (cesium-terrain-builder) into infra/data/static/terrain/$TILESET,
#    served by the nginx container at http://localhost:8601/terrain/$TILESET.
# 4. Makes a hillshade, publishes it in GeoServer as bmc:mumbai_hillshade with a style that keeps flat ground transparent.
# Needs the stack from infra/docker-compose.yml running and python with numpy. GeoServer credentials come from infra/.env.
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a; . infra/.env; set +a

BBOX="72.60 18.70 73.25 19.55"                         # whole Greater Mumbai + Thane creek, Navi Mumbai, Elephanta
GDAL_IMAGE="ghcr.io/osgeo/gdal:alpine-small-latest"    # TODO: pin a release tag before the demo build
CTB_IMAGE="tumgis/ctb-quantized-mesh:latest"
TILESET="mumbai-dtm"
SRC_DIR="infra/data/terrain_src"
OUT_DIR="infra/data/static/terrain/$TILESET"
win() { (cd "$1" && (pwd -W 2>/dev/null || pwd)); }
gdal_run() { MSYS_NO_PATHCONV=1 docker run --rm -e GDAL_DISABLE_READDIR_ON_OPEN=EMPTY_DIR -e CPL_VSIL_CURL_ALLOWED_EXTENSIONS=.tif -v "$(win "$SRC_DIR"):/out" "$GDAL_IMAGE" sh -c "$1"; }
mkdir -p "$SRC_DIR" "$OUT_DIR" infra/data/geoserver/rasters

B="/vsicurl/https://copernicus-dem-30m.s3.amazonaws.com"; T="Copernicus_DSM_COG_10"
tiles=""; for t in N18_00_E072_00 N19_00_E072_00 N18_00_E073_00 N19_00_E073_00; do tiles="$tiles $B/${T}_${t}_DEM/${T}_${t}_DEM.tif"; done

echo "== surface model window"
if [ ! -f "$SRC_DIR/mumbai_region_dem.tif" ]; then
  gdal_run "gdalbuildvrt -q -overwrite /out/cop30.vrt $tiles &&
    gdalwarp -q -overwrite -te $BBOX -r bilinear -ot Float32 -dstnodata -9999 -co COMPRESS=DEFLATE -co PREDICTOR=3 -co TILED=YES /out/cop30.vrt /out/mumbai_region_dem.tif"
fi
gdal_run "gdalinfo -json /out/mumbai_region_dem.tif > /out/dem_grid.json &&
  gdal raster neighbors -q --overwrite --method min --kernel equal --size 7 --ot Float32 /out/mumbai_region_dem.tif /out/dem_eroded.tif &&
  gdal raster neighbors -q --overwrite --method max --kernel equal --size 7 --ot Float32 /out/dem_eroded.tif /out/dem_opened.tif"

echo "== bare earth"
if [ -f "$SRC_DIR/lod2_ground.csv" ]; then
  python tools/terrain/bare_earth.py "$SRC_DIR"
  TE=$(python -c "import json;g=json.load(open('$SRC_DIR/dem_grid.json'));t=g['geoTransform'];w,h=g['size'];print(t[0],t[3]+h*t[5],t[0]+w*t[1],t[3])")
  SZ=$(python -c "import json;g=json.load(open('$SRC_DIR/dem_grid.json'));print(*g['size'])")
  gdal_run "gdalwarp -q -overwrite -s_srs EPSG:4326 -t_srs EPSG:4326 -te $TE -ts $SZ -r near -srcnodata -9999 -dstnodata None -wo INIT_DEST=0 /out/lod2_ground.asc /out/ground_full.tif &&
    gdalwarp -q -overwrite -s_srs EPSG:4326 -t_srs EPSG:4326 -te $TE -ts $SZ -r near -dstnodata None -wo INIT_DEST=0 /out/lod2_weight.asc /out/weight_full.tif &&
    gdal raster calc -q --overwrite -i G=/out/ground_full.tif -i W=/out/weight_full.tif -i O=/out/dem_opened.tif --calc 'W*G+(1-W)*O' --ot Float32 -o /out/dem_blend.tif &&
    gdal raster neighbors -q --overwrite --method mean --kernel equal --size 3 --ot Float32 /out/dem_blend.tif /out/mumbai_region_dtm.tif"
else
  echo "   no $SRC_DIR/lod2_ground.csv: using the opened DEM only (run tools/terrain/lod2-ground.mjs for F/S)"
  gdal_run "gdal raster neighbors -q --overwrite --method mean --kernel equal --size 3 --ot Float32 /out/dem_opened.tif /out/mumbai_region_dtm.tif"
fi
gdal_run "gdal_translate -q -co COMPRESS=DEFLATE -co TILED=YES /out/mumbai_region_dtm.tif /out/mumbai_region_dtm_c.tif && mv /out/mumbai_region_dtm_c.tif /out/mumbai_region_dtm.tif &&
  gdaldem hillshade -q -multidirectional -z 1.5 -compute_edges -co COMPRESS=DEFLATE -co TILED=YES /out/mumbai_region_dtm.tif /out/mumbai_region_hillshade.tif &&
  gdalinfo -stats /out/mumbai_region_dtm.tif | grep -E 'Size is|STATISTICS_(MIN|MAX|MEAN)'"

echo "== quantized-mesh tiles -> $OUT_DIR"
MSYS_NO_PATHCONV=1 docker run --rm -v "$(win "$SRC_DIR"):/src:ro" -v "$(win "$OUT_DIR"):/out" "$CTB_IMAGE" sh -c "
  ctb-tile -f Mesh -N -e 0 -s 14 -o /out /src/mumbai_region_dtm.tif >/dev/null 2>&1 &&
  ctb-tile -f Mesh -N -l -e 0 -s 14 -o /out /src/mumbai_region_dtm.tif >/dev/null 2>&1"
echo "   $(find "$OUT_DIR" -name '*.terrain' | wc -l) tiles, $(du -sh "$OUT_DIR" | cut -f1)"

echo "== publish hillshade in GeoServer"
cp "$SRC_DIR/mumbai_region_hillshade.tif" infra/data/geoserver/rasters/
GS="http://localhost:8600/geoserver/rest"; AUTH="$GEOSERVER_ADMIN_USER:$GEOSERVER_ADMIN_PASSWORD"
curl -s -o /dev/null -u "$AUTH" -H "Content-Type: application/json" -X POST "$GS/workspaces/bmc/coveragestores" \
  -d '{"coverageStore":{"name":"mumbai_hillshade","type":"GeoTIFF","enabled":true,"workspace":"bmc","url":"file:rasters/mumbai_region_hillshade.tif"}}' || true
curl -s -o /dev/null -u "$AUTH" -H "Content-Type: application/json" -X POST "$GS/workspaces/bmc/coveragestores/mumbai_hillshade/coverages" \
  -d '{"coverage":{"name":"mumbai_hillshade","nativeName":"mumbai_region_hillshade","title":"Mumbai hillshade (Copernicus GLO-30, bare earth)","srs":"EPSG:4326"}}' || true
# The GeoTIFF was replaced in place: reset the store so GeoServer rereads it.
curl -s -o /dev/null -u "$AUTH" -X POST "$GS/reset" || true
code=$(curl -s -o /dev/null -w "%{http_code}" -u "$AUTH" -H "Content-Type: application/vnd.ogc.sld+xml" -X POST "$GS/workspaces/bmc/styles?name=sol_hillshade" --data-binary @infra/hillshade.sld)
[ "$code" = 403 ] && curl -s -o /dev/null -u "$AUTH" -H "Content-Type: application/vnd.ogc.sld+xml" -X PUT "$GS/workspaces/bmc/styles/sol_hillshade" --data-binary @infra/hillshade.sld
curl -s -o /dev/null -w "   hillshade style assigned: %{http_code}\n" -u "$AUTH" -H "Content-Type: application/json" -X PUT "$GS/layers/bmc:mumbai_hillshade" -d '{"layer":{"defaultStyle":{"name":"bmc:sol_hillshade"}}}'
