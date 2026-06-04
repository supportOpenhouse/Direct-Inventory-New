import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { lookupCoord, societyCoords } from '../utils/societyCoords.js';

const NCR_CENTER = [77.2, 28.55]; // [lng, lat]

// Hardcoded city centres so the map can highlight cities with no API.
const CITY_CENTERS = {
  Gurgaon: [28.4595, 77.0266],
  Noida: [28.5355, 77.3910],
  Ghaziabad: [28.6692, 77.4538],
};
const cityCenter = (city) => CITY_CENTERS[city] || null;

// White background, orange roads — vector style over OpenFreeMap tiles (no key).
const ORANGE = '#ea580c';
const STYLE = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: { omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#ffffff' } },
    { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': '#f4f4f5' } },
    {
      id: 'roads', type: 'line', source: 'omt', 'source-layer': 'transportation',
      paint: { 'line-color': ORANGE, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.4, 10, 1, 14, 2.4, 18, 7] },
    },
    {
      id: 'roads-major', type: 'line', source: 'omt', 'source-layer': 'transportation',
      filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false],
      paint: { 'line-color': ORANGE, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 10, 2.4, 14, 5, 18, 12] },
    },
    {
      id: 'road-labels', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name',
      layout: {
        'symbol-placement': 'line', 'text-field': ['get', 'name'],
        'text-size': 11, 'text-font': ['Noto Sans Regular'],
      },
      paint: { 'text-color': '#111111', 'text-halo-color': '#ffffff', 'text-halo-width': 1.4 },
    },
    {
      id: 'places', type: 'symbol', source: 'omt', 'source-layer': 'place',
      filter: ['match', ['get', 'class'], ['city', 'town', 'suburb', 'neighbourhood', 'village'], true, false],
      layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-font': ['Noto Sans Regular'] },
      paint: { 'text-color': '#111111', 'text-halo-color': '#ffffff', 'text-halo-width': 1.4 },
    },
  ],
};

const emptyFC = () => ({ type: 'FeatureCollection', features: [] });

// Geographic circle (radius in metres) as a polygon Feature. [lat,lng] in.
function circleFeature([lat, lng], radiusM, props, steps = 64) {
  const earth = 6378137;
  const dLat = (radiusM / earth) * (180 / Math.PI);
  const dLng = (radiusM / (earth * Math.cos((Math.PI * lat) / 180))) * (180 / Math.PI);
  const ring = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * 2 * Math.PI;
    ring.push([lng + dLng * Math.cos(t), lat + dLat * Math.sin(t)]);
  }
  return { type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [ring] } };
}

export default function ScopeMap({ cities = [], society = [] }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const loadedRef = useRef(false);
  const renderRef = useRef(() => {});
  const [note, setNote] = useState('');

  // Latest renderer (captures current props) — called on load + on scope change.
  renderRef.current = async () => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    setNote('');
    const areas = [];
    const socFeats = [];
    const bounds = new maplibregl.LngLatBounds();
    let any = false;
    const extend = ([lat, lng]) => { bounds.extend([lng, lat]); any = true; };

    // Cities → translucent circles (hardcoded centres, no API).
    for (const c of cities) {
      const ctr = cityCenter(c);
      if (!ctr) continue;
      areas.push(circleFeature(ctr, 6000, { name: `City: ${c}`, fill: '#fdba74', fillOpacity: 0.18, stroke: '#fb923c' }));
      extend(ctr);
    }

    // Societies → markers from the bundled coordinate map (no geocoding).
    const coords = await societyCoords();
    let plotted = 0;
    for (const s of society) {
      const pt = lookupCoord(coords, s, cities);
      if (!pt) continue;
      socFeats.push({ type: 'Feature', properties: { name: s }, geometry: { type: 'Point', coordinates: [pt[1], pt[0]] } });
      extend(pt);
      plotted += 1;
    }

    if (!mapRef.current) return;
    map.getSource('areas')?.setData({ type: 'FeatureCollection', features: areas });
    map.getSource('societies')?.setData({ type: 'FeatureCollection', features: socFeats });
    if (any) map.fitBounds(bounds, { padding: 40, maxZoom: 14, duration: 600 });

    const missing = society.length - plotted;
    if (society.length && plotted === 0) setNote('None of these societies are in the coordinates file yet.');
    else if (missing > 0) setNote(`${plotted} of ${society.length} societies located (${missing} not in the coordinates file).`);
  };

  // Init map once.
  useEffect(() => {
    if (mapRef.current || !elRef.current) return undefined;
    const map = new maplibregl.Map({ container: elRef.current, style: STYLE, center: NCR_CENTER, zoom: 9, attributionControl: true });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      map.addSource('areas', { type: 'geojson', data: emptyFC() });
      map.addSource('societies', { type: 'geojson', data: emptyFC() });
      map.addLayer({ id: 'area-fill', type: 'fill', source: 'areas', paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': ['get', 'fillOpacity'] } });
      map.addLayer({ id: 'area-line', type: 'line', source: 'areas', paint: { 'line-color': ['get', 'stroke'], 'line-width': 1.4, 'line-dasharray': [2, 1.5] } });
      map.addLayer({ id: 'soc', type: 'circle', source: 'societies', paint: { 'circle-radius': 6, 'circle-color': ORANGE, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } });

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
      const showName = (e) => {
        const f = e.features?.[0];
        if (!f) return;
        map.getCanvas().style.cursor = 'pointer';
        const c = f.geometry.type === 'Point' ? f.geometry.coordinates : e.lngLat;
        popup.setLngLat(c).setText(f.properties.name).addTo(map);
      };
      const hide = () => { map.getCanvas().style.cursor = ''; popup.remove(); };
      map.on('mouseenter', 'soc', showName);
      map.on('mouseleave', 'soc', hide);
      map.on('mouseenter', 'area-fill', showName);
      map.on('mouseleave', 'area-fill', hide);

      loadedRef.current = true;
      renderRef.current();
    });
    return () => { map.remove(); mapRef.current = null; loadedRef.current = false; };
  }, []);

  // Re-render layers when the scope changes.
  useEffect(() => { if (loadedRef.current) renderRef.current(); /* eslint-disable-next-line */ }, [JSON.stringify(cities), JSON.stringify(society)]);

  return (
    <div className="scope-map-wrap">
      <div ref={elRef} className="scope-map" />
      <div className="scope-map-legend">
        <span><i className="lg-dot lg-society" /> Society</span>
        <span><i className="lg-area lg-city" /> City</span>
      </div>
      {note && <div className="scope-map-note">{note}</div>}
    </div>
  );
}
