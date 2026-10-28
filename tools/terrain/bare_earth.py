"""Ground surface for the F/S area from LoD2 building bases (tools/terrain/lod2-ground.mjs).

Reads infra/data/terrain_src/lod2_ground.csv and the DEM grid description (dem_grid.json, written by
build-terrain.sh), drops outlier points, interpolates the ground on the DEM's own 30 m grid (inverse distance,
8 nearest points within 250 m) and writes two ESRI ASCII grids next to the DEM:
  lod2_ground.asc  ground height in metres (nodata away from buildings)
  lod2_weight.asc  blend weight: 1 within 100 m of a building, fading to 0 at 400 m
build-terrain.sh then blends: terrain = weight * ground + (1 - weight) * opened DEM.
Needs only numpy.
"""
import json
import sys
from pathlib import Path

import numpy as np

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "infra/data/terrain_src")
M_PER_DEG_LAT = 110540.0

pts = np.loadtxt(SRC / "lod2_ground.csv", delimiter=",", skiprows=1, ndmin=2)
lon, lat, ground = pts[:, 0], pts[:, 1], pts[:, 2]
k_lon = 111320.0 * np.cos(np.radians(lat.mean()))
x, y = lon * k_lon, lat * M_PER_DEG_LAT

# Outliers (rays that hit a neighbour or a wrong surface): more than 2.5 m from the median of points within 200 m.
keep = np.ones(len(x), bool)
for s in range(0, len(x), 1000):
    d = np.hypot(x[s:s + 1000, None] - x[None, :], y[s:s + 1000, None] - y[None, :])
    for i, row in enumerate(d):
        near = ground[(row < 200) & (row > 0)]
        if len(near) >= 3 and abs(ground[s + i] - np.median(near)) > 2.5:
            keep[s + i] = False
x, y, ground = x[keep], y[keep], ground[keep]
print(f"ground points: {len(pts)} read, {int((~keep).sum())} outliers dropped, median {np.median(ground):.1f} m")

g = json.loads((SRC / "dem_grid.json").read_text())
x0, dx, _, y0, _, dy = g["geoTransform"]
nx, ny = g["size"]
# Only the window around the points is computed; the rest of the DEM stays as it is.
pad = 0.006
c0 = max(0, int(((lon.min() - pad) - x0) / dx)); c1 = min(nx, int(((lon.max() + pad) - x0) / dx) + 1)
r0 = max(0, int(((lat.max() + pad) - y0) / dy)); r1 = min(ny, int(((lat.min() - pad) - y0) / dy) + 1)
cols = x0 + (np.arange(c0, c1) + 0.5) * dx
rows = y0 + (np.arange(r0, r1) + 0.5) * dy
gx, gy = np.meshgrid(cols * k_lon, rows * M_PER_DEG_LAT)
gx, gy = gx.ravel(), gy.ravel()

value = np.full(gx.shape, -9999.0)
weight = np.zeros(gx.shape)
for s in range(0, len(gx), 2000):
    d = np.hypot(gx[s:s + 2000, None] - x[None, :], gy[s:s + 2000, None] - y[None, :])
    idx = np.argsort(d, axis=1)[:, :8]
    dk = np.take_along_axis(d, idx, axis=1)
    nearest = dk[:, 0]
    w = 1.0 / np.maximum(dk, 15.0) ** 2
    w[dk > 250] = 0
    ok = w.sum(axis=1) > 0
    value[s:s + 2000][ok] = (w[ok] * ground[idx[ok]]).sum(axis=1) / w[ok].sum(axis=1)
    weight[s:s + 2000] = np.clip(1 - (nearest - 100) / 300, 0, 1)
weight[value == -9999.0] = 0


def write_asc(path, data):
    h, w = r1 - r0, c1 - c0
    header = (f"ncols {w}\nnrows {h}\nxllcorner {x0 + c0 * dx:.10f}\nyllcorner {y0 + r1 * dy:.10f}\n"
              f"cellsize {dx:.12f}\nNODATA_value -9999\n")
    with open(path, "w") as f:
        f.write(header)
        np.savetxt(f, data.reshape(h, w), fmt="%.2f")


write_asc(SRC / "lod2_ground.asc", value)
write_asc(SRC / "lod2_weight.asc", weight)
print(f"grid window {c1 - c0} x {r1 - r0} cells written")
