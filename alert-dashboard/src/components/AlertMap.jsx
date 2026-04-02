/**
 * AlertMap.jsx — Leaflet map with:
 * 1. Street / Satellite+Labels / Satellite modes
 * 2. Pulsing live alert markers
 * 3. Semi-transparent circle heatmap overlay for alert density
 */
import { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { label, color } from '../utils/translations';

delete L.Icon.Default.prototype._getIconUrl;

const ISRAEL_CENTER = [31.5, 34.75];

/** Pulsing CSS div-icon */
function pinIcon(cat, isNew) {
  const c = color(cat);
  return L.divIcon({
    className: 'alert-pin',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
    html: `<div style="position:relative;width:20px;height:20px">
      <span style="position:absolute;width:12px;height:12px;border-radius:50%;left:4px;top:4px;background:${c};box-shadow:0 0 8px ${c};z-index:2"></span>
      ${isNew ? '<span style="position:absolute;width:20px;height:20px;border-radius:50%;left:0;top:0;border:2px solid ' + c + ';animation:pp 1.4s ease-out infinite;opacity:.7"></span>' : ''}
    </div>`,
  });
}

function FitBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (!coords.length) return;
    map.fitBounds(L.latLngBounds(coords), { padding: [30, 30], maxZoom: 11 });
  }, [coords, map]);
  return null;
}

/** Inject once */
function PinStyles() {
  useEffect(() => {
    if (document.getElementById('pin-css')) return;
    const s = document.createElement('style');
    s.id = 'pin-css';
    s.textContent = '@keyframes pp{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.2);opacity:0}}' +
      '.alert-pin{background:none!important;border:none!important}' +
      '.leaflet-popup-content-wrapper,.leaflet-popup-tip{background:#111827!important;color:#e2e8f0!important;border:1px solid rgba(148,163,184,.15)!important;box-shadow:0 4px 12px rgba(0,0,0,.5)!important}' +
      '.leaflet-popup-content{font-family:Inter,sans-serif!important;direction:ltr!important;margin:8px!important}' +
      '.lp{min-width:160px}.lp .loc{font-weight:700;font-size:14px;margin-bottom:3px}' +
      '.lp .tp{color:#3b82f6;font-size:12px;margin-bottom:2px}' +
      '.lp .ds{color:#94a3b8;font-size:11px;margin-bottom:3px}' +
      '.lp .tm{color:#64748b;font-size:10px;font-family:monospace}' +
      '.lp .ct{margin-top:5px;padding-top:5px;border-top:1px solid rgba(148,163,184,.1);color:#f59e0b;font-size:10px}';
    document.head.appendChild(s);
  }, []);
  return null;
}

/** Heatmap overlay — circles sized by alert count at each location */
function HeatmapOverlay({ alerts }) {
  const map = useMap();
  const circles = useMemo(() => {
    const density = {};
    // Only show alerts older than 5 seconds (live ones have pins already)
    const historic = alerts.filter(a => Date.now() - a.receivedAt > 5000);
    for (const a of historic) {
      for (const c of (a.coords || [])) {
        const key = `${c.nameHe}`;
        if (!density[key]) {
          density[key] = { ...c, count: 0, latest: a };
        }
        density[key].count++;
        if (a.receivedAt > (density[key].latest?.receivedAt || 0)) density[key].latest = a;
      }
    }
    return Object.values(density);
  }, [alerts]);

  return circles.map((d, i) => {
    const radius = Math.min(40, d.count * 8);
    const clr = color(d.latest?.cat);
    return (
      <CircleMarker
        key={`heat-${i}`}
        center={[d.lat, d.lng]}
        radius={radius}
        fillColor={clr}
        fillOpacity={0.12}
        stroke={false}
        interactive={false}
      />
    );
  });
}

export default function AlertMap({ alerts, mapView }) {
  const markers = useMemo(() => {
    const m = new Map();
    for (const a of alerts) {
      for (const c of (a.coords || [])) {
        const key = c.nameHe || `${c.lat}-${c.lng}`;
        if (!m.has(key)) m.set(key, { ...c, a, n: 1 });
        else { const e = m.get(key); e.n++; if (a.receivedAt > (e.a?.receivedAt || 0)) e.a = a; }
      }
    }
    return Array.from(m.values());
  }, [alerts]);

  const pts = markers.map(m => [m.lat, m.lng]);

  // ── Tile layers ──
  // Street: standard OSM
  // Satellite+labels: Esri World Imagery + Stamen Toner Labels overlay
  // Satellite: Esri World Imagery only
  const showStreet = mapView === 'street' || mapView === 'street-labels';
  const showSat = mapView === 'satellite' || mapView === 'satellite-labels';
  const showLabels = mapView === 'street-labels' || mapView === 'satellite-labels';

  return (
    <MapContainer center={ISRAEL_CENTER} zoom={8} className="map" zoomControl>
      {/* Street */}
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" opacity={showStreet ? 1 : 0} />

      {/* Satellite base */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="&copy; Esri"
        opacity={showSat ? 1 : 0}
      />

      {/* Labels overlay on satellite */}
      {showLabels && showSat && (
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          attribution="&copy; CARTO"
          pane="overlayPane"
          opacity={0.85}
        />
      )}

      {pts.length > 0 && <FitBounds coords={pts} />}
      <PinStyles />

      {/* Heatmap for historical density */}
      {alerts.length > 2 && <HeatmapOverlay alerts={alerts} />}

      {/* Live pins */}
      {markers.map((m, i) => {
        const a = m.a;
        const isNew = a && Date.now() - a.receivedAt < 60000;
        const loc = m.nameHe || `${m.lat.toFixed(2)}, ${m.lng.toFixed(2)}`;
        return (
          <Marker key={`mk-${m.nameEn || i}-${m.lat.toFixed(3)}`} position={[m.lat, m.lng]} icon={pinIcon(a?.cat, isNew)}>
            <Popup>
              <div className="lp">
                <div className="loc">{loc}</div>
                {a && <div className="tp">{label(a.cat, 'en')}</div>}
                {a?.title && <div className="ds">{a.title}</div>}
                {a && <div className="tm">{new Date(a.receivedAt).toLocaleString()}</div>}
                {m.n > 1 && <div className="ct">{m.n} alerts here</div>}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
