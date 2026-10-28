// 2D overview (OpenLayers): GeoServer WMS over OpenStreetMap, a marker where the 3D camera looks, and
// click-to-fly. Hidden layers are not requested, and the map only renders when it is open.
import { useEffect, useRef, useState } from 'react';
import OlMap from 'ol/Map';
import OlView from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import TileWMS from 'ol/source/TileWMS';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import 'ol/ol.css';
import { ChevronDown, Map as MapIcon } from 'lucide-react';
import registry from '../layers/registry.json';
import { WMS_URL } from '../config';

const FS_CENTER = [72.8506, 18.9975];
const wmsList = (visible) => registry.layers.filter((l) => visible.has(l.id)).map((l) => `${registry.workspace}:${l.id}`).join(',');

export default function MiniMap({ visible, target, onFly }) {
  const [open, setOpen] = useState(true);
  const el = useRef(null);
  const mapRef = useRef(null);
  const wmsRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const wms = new TileLayer({
      source: new TileWMS({ url: WMS_URL, params: { LAYERS: wmsList(visible) || `${registry.workspace}:ward_boundary`, TILED: true, TRANSPARENT: true }, serverType: 'geoserver', crossOrigin: 'anonymous' }),
      opacity: 0.9,
    });
    wmsRef.current = wms;
    const marker = new Feature(new Point(fromLonLat(target || FS_CENTER)));
    markerRef.current = marker;
    const map = new OlMap({
      target: el.current,
      controls: [],
      layers: [
        new TileLayer({ source: new OSM() }),
        wms,
        new VectorLayer({
          source: new VectorSource({ features: [marker] }),
          style: new Style({ image: new Circle({ radius: 7, fill: new Fill({ color: '#f5a400' }), stroke: new Stroke({ color: '#0b1220', width: 2.5 }) }) }),
        }),
      ],
      view: new OlView({ center: fromLonLat(target || FS_CENTER), zoom: 14 }),
    });
    map.on('singleclick', (e) => onFly(toLonLat(e.coordinate)));
    mapRef.current = map;
    return () => { map.setTarget(undefined); mapRef.current = null; };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const list = wmsList(visible);
    wmsRef.current?.setVisible(Boolean(list));
    if (list) wmsRef.current?.getSource().updateParams({ LAYERS: list });
  }, [visible]);

  useEffect(() => {
    if (!target || !mapRef.current) return;
    markerRef.current.getGeometry().setCoordinates(fromLonLat(target));
    mapRef.current.getView().animate({ center: fromLonLat(target), duration: 400 });
  }, [target]);

  return (
    <div className="glass pointer-events-auto overflow-hidden rounded-2xl border border-slate-200/70 shadow-float">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:text-ink">
        <MapIcon className="h-3.5 w-3.5" /> 2D overview
        <ChevronDown className={`ml-auto h-3.5 w-3.5 transition ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div ref={el} className="h-44 w-64 border-t border-slate-200" title="Click to fly the 3D view here" />}
    </div>
  );
}
