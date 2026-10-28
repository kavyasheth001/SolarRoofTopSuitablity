"""Create one SLD style per layer from src/solarsight/layers/registry.json and make it the layer's default in GeoServer.

    python tools/export/apply-styles.py            (run from the project root, stack running)

Style entries: polygons use stroke/width/fill/opacity/dash, points use point/size, and an entry with
"field" + "rules" draws only features whose field equals each rule's value.
GeoServer admin credentials are read from infra/.env.
"""
import base64
import json
import pathlib
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
GS = "http://localhost:8600/geoserver/rest"
env = dict(l.split("=", 1) for l in (ROOT / "infra/.env").read_text().splitlines() if "=" in l and not l.startswith("#"))
AUTH = base64.b64encode(f"{env['GEOSERVER_ADMIN_USER']}:{env['GEOSERVER_ADMIN_PASSWORD']}".encode()).decode()


def request(method, url, body=None, ctype="application/xml"):
    req = urllib.request.Request(GS + url, data=body.encode() if body else None, method=method,
                                 headers={"Authorization": "Basic " + AUTH, "Content-Type": ctype})
    try:
        return urllib.request.urlopen(req).status
    except urllib.error.HTTPError as err:
        return err.code


def symbolizer(s):
    if "point" in s:
        return (f'<PointSymbolizer><Graphic><Mark><WellKnownName>circle</WellKnownName>'
                f'<Fill><CssParameter name="fill">{s["point"]}</CssParameter></Fill>'
                f'<Stroke><CssParameter name="stroke">#ffffff</CssParameter><CssParameter name="stroke-width">0.8</CssParameter></Stroke>'
                f'</Mark><Size>{s["size"]}</Size></Graphic></PointSymbolizer>')
    fill = (f'<Fill><CssParameter name="fill">{s["fill"]}</CssParameter>'
            f'<CssParameter name="fill-opacity">{s.get("opacity", 1)}</CssParameter></Fill>') if s.get("fill") else ""
    dash = f'<CssParameter name="stroke-dasharray">{s["dash"]}</CssParameter>' if s.get("dash") else ""
    return (f'<PolygonSymbolizer>{fill}<Stroke><CssParameter name="stroke">{s["stroke"]}</CssParameter>'
            f'<CssParameter name="stroke-width">{s["width"]}</CssParameter>{dash}</Stroke></PolygonSymbolizer>')


def rules(s):
    if "rules" not in s:
        return f"<Rule>{symbolizer(s)}</Rule>"
    return "".join(
        f'<Rule><Title>{r["title"]}</Title><ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>{s["field"]}</ogc:PropertyName>'
        f'<ogc:Literal>{r["value"]}</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>{symbolizer(r)}</Rule>'
        for r in s["rules"])


def sld(name, s):
    return ('<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" '
            'xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xlink="http://www.w3.org/1999/xlink">'
            f'<NamedLayer><Name>{name}</Name><UserStyle><Title>{s["title"]}</Title>'
            f'<FeatureTypeStyle>{rules(s)}</FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>')


results = []
for s in json.loads((ROOT / "src/solarsight/layers/registry.json").read_text(encoding="utf-8"))["layers"]:
    layer = s["id"]
    style = f"sol_{layer}"
    body = sld(style, s)
    saved = request("POST", f"/workspaces/bmc/styles?name={style}", body, "application/vnd.ogc.sld+xml")
    if saved == 403:  # already exists (and may be in use): update its SLD in place
        saved = request("PUT", f"/workspaces/bmc/styles/{style}", body, "application/vnd.ogc.sld+xml")
    assigned = request("PUT", f"/layers/bmc:{layer}", json.dumps({"layer": {"defaultStyle": {"name": f"bmc:{style}"}}}), "application/json")
    results.append((layer, saved, assigned))
bad = [r for r in results if r[1] not in (200, 201) or r[2] != 200]
print(f"{len(results) - len(bad)}/{len(results)} styles applied" + (f"; failed: {bad}" if bad else ""))
