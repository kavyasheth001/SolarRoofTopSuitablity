#!/usr/bin/env bash
# Load exported GeoJSON files into PostGIS (schema bmc) and publish them in GeoServer (workspace bmc).
#   bash tools/export/load-and-publish.sh                 # every *.geojson in infra/data/export
#   bash tools/export/load-and-publish.sh building_new    # only the named layers
# Needs the stack from infra/docker-compose.yml running. Credentials come from infra/.env.
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a; . infra/.env; set +a

GDAL_IMAGE="ghcr.io/osgeo/gdal:alpine-small-latest"   # TODO: pin a release tag before the demo build
GS="http://localhost:8600/geoserver"
AUTH="$GEOSERVER_ADMIN_USER:$GEOSERVER_ADMIN_PASSWORD"
EXPORT_DIR="$(pwd -W 2>/dev/null || pwd)/infra/data/export"
psql_bmc() { docker compose -f infra/docker-compose.yml exec -T postgis psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 "$@"; }

if [ $# -gt 0 ]; then layers=("$@"); else layers=($(ls infra/data/export/*.geojson | xargs -n1 basename | sed 's/\.geojson$//')); fi

psql_bmc -qc "CREATE SCHEMA IF NOT EXISTS bmc;"

# Workspace + PostGIS store (ignore "already exists").
curl -s -o /dev/null -u "$AUTH" -H "Content-Type: application/json" -X POST "$GS/rest/workspaces" -d '{"workspace":{"name":"bmc"}}' || true
curl -s -o /dev/null -u "$AUTH" -H "Content-Type: application/json" -X POST "$GS/rest/workspaces/bmc/datastores" -d "{\"dataStore\":{\"name\":\"postgis\",\"connectionParameters\":{\"entry\":[
  {\"@key\":\"dbtype\",\"\$\":\"postgis\"},{\"@key\":\"host\",\"\$\":\"postgis\"},{\"@key\":\"port\",\"\$\":\"5432\"},
  {\"@key\":\"database\",\"\$\":\"$POSTGRES_DB\"},{\"@key\":\"schema\",\"\$\":\"bmc\"},{\"@key\":\"user\",\"\$\":\"$POSTGRES_USER\"},
  {\"@key\":\"passwd\",\"\$\":\"$POSTGRES_PASSWORD\"},{\"@key\":\"Expose primary keys\",\"\$\":\"true\"}]}}}" || true

for n in "${layers[@]}"; do
  echo "== $n"
  MSYS_NO_PATHCONV=1 docker run --rm --network solarsight-gis_default -v "$EXPORT_DIR:/data:ro" "$GDAL_IMAGE" \
    ogr2ogr -f PostgreSQL "PG:host=postgis port=5432 dbname=$POSTGRES_DB user=$POSTGRES_USER password=$POSTGRES_PASSWORD" \
    "/data/$n.geojson" -nln "bmc.$n" -lco GEOMETRY_NAME=geom -lco FID=gid -lco SCHEMA=bmc \
    -nlt PROMOTE_TO_MULTI -t_srs EPSG:4326 -overwrite 2>&1 | grep -v "Layer creation options ignored" || true
  # Repair invalid shapes without changing their kind (polygons stay polygons), then give the column a
  # concrete type (e.g. MultiPolygon) so GeoServer, pg2b3dm and QGIS all read it the same way.
  psql_bmc -qc "UPDATE bmc.\"$n\" SET geom = ST_Multi(ST_CollectionExtract(ST_MakeValid(geom), ST_Dimension(geom) + 1)) WHERE NOT ST_IsValid(geom);"
  gtype=$(psql_bmc -tAc "SELECT GeometryType(geom) FROM bmc.\"$n\" GROUP BY 1 ORDER BY count(*) DESC LIMIT 1;")
  [ -n "$gtype" ] && psql_bmc -qc "ALTER TABLE bmc.\"$n\" ALTER COLUMN geom TYPE geometry($gtype,4326) USING ST_Multi(geom);" 2>/dev/null || true
  psql_bmc -qc "ANALYZE bmc.\"$n\";"
  psql_bmc -tAc "SELECT '   rows=' || count(*) || ' size=' || pg_size_pretty(pg_total_relation_size('bmc.\"$n\"')) FROM bmc.\"$n\";"
  code=$(curl -s -o /dev/null -w "%{http_code}" -u "$AUTH" -H "Content-Type: application/json" -X POST \
    "$GS/rest/workspaces/bmc/datastores/postgis/featuretypes" -d "{\"featureType\":{\"name\":\"$n\",\"nativeName\":\"$n\",\"srs\":\"EPSG:4326\"}}")
  echo "   geoserver publish: $code (201 = new, 500 = already published)"
done
