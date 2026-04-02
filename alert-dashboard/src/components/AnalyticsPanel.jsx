/**
 * AnalyticsPanel.jsx — Interactive analytics with:
 * 1. User-selectable chart metrics (type, location, hour, day of week, etc.)
 * 2. "Hot spot" algorithm: detects which city+time combination has most alerts
 * 3. Filterable by alert type
 * 4. Simple SVG bar/line charts (no Recharts dependency issues)
 */
import { useState, useMemo } from 'react';
import { t, label, color as alertColor } from '../utils/translations';

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_NAMES_HE = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

const CHART_OPTIONS = [
  { value:'byType',     en:'By Type',              he:'לפי סוג' },
  { value:'byHour',     en:'By Hour',              he:'לפי שעה' },
  { value:'byDay',      en:'By Day of Week',       he:'לפי יום בשבוע' },
  { value:'byLocation', en:'By Location',          he:'לפי מיקום' },
  { value:'timeline',   en:'Timeline (hourly)',    he:'ציר זמן (שעתי)' },
  { value:'heatmap',    en:'Heatmap (hour×day)',   he:'מפת חום (שעה×יום)' },
];

// ── Mini SVG Bar Chart ──
function BarChart({ data, maxVal, xKey, labelKey, colorKey }) {
  const w = 100, h = 120, pad = 6;
  const innerW = w - pad * 2;
  const barW = data.length > 0 ? innerW / data.length - 1 : 0;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height:'130px' }}>
      {/* Grid */}
      {[0, .5, 1].map(f => (
        <line key={f} x1={pad} y1={pad+f*(h-pad*2)} x2={w-pad} y2={pad+f*(h-pad*2)} stroke="#1e293b" strokeWidth="0.3" />
      ))}
      {data.map((d, i) => {
        const bh = (d._val / Math.max(maxVal, 1)) * (h - pad * 2);
        const x = pad + i * (barW + 1);
        return (
          <g key={i}>
            <rect x={x} y={h - pad - bh} width={barW} height={bh} fill={d[colorKey] || '#3b82f6'} rx="2" />
            <text x={x + barW/2} y={h - pad - bh - 2} textAnchor="middle" fill="#94a3b8" fontSize="5">{d._val}</text>
            <text x={x + barW/2} y={h - 1} textAnchor="middle" fill="#64748b" fontSize="4.5">{d[labelKey]}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Mini SVG Line Chart ──
function LineChart({ data, color }) {
  const w = 100, h = 120, pad = 6;
  if (data.length < 2) return null;
  const maxVal = Math.max(...data.map(d => d._val), 1);
  const pts = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: h - pad - (d._val / maxVal) * (h - pad * 2),
    ...d
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height:'130px' }}>
      {[0,.25,.5,.75,1].map(f => (
        <line key={f} x1={pad} y1={pad+f*(h-pad*2)} x2={w-pad} y2={pad+f*(h-pad*2)} stroke="#1e293b" strokeWidth="0.3" />
      ))}
      <path d={path} fill="none" stroke={color || '#3b82f6'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={2} fill={color || '#3b82f6'} />
          {i % 3 === 0 && <text x={p.x} y={h-1} textAnchor="middle" fill="#64748b" fontSize="4.5">{p._xLbl || ''}</text>}
        </g>
      ))}
    </svg>
  );
}

// ── Mini Heatmap (hour × day) ──
function HeatmapChart({ data }) {
  const cols = 7, rows = 24;
  const w = 100, h = 100;
  const cw = w / cols, rh = h / rows;
  const maxVal = Math.max(...data.map(d => d._val), 1);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height:'115px' }}>
      {data.map((cell, i) => {
        const op = cell._val > 0 ? 0.15 + 0.85 * (cell._val / maxVal) : 0;
        return (
          <rect key={i} x={cell._x * cw} y={cell._y * rh} width={cw-0.5} height={rh-0.5}
            fill={cell._clr} fillOpacity={op} rx="1"
            title={`${cell._xLbl}, ${cell._yLbl}: ${cell._val}`}
          />
        );
      })}
      <text x="0" y="-2" fontSize="4" fill="#64748b" textAnchor="start">Hour →</text>
    </svg>
  );
}

// ── Simple bar chart using CSS (fallback) ──
function SimpleBars({ data }) {
  if (!data.length) return <div className="empty">No data</div>;
  const max = Math.max(...data.map(d => d._val), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:130, padding:'0 4px' }}>
      {data.map((d, i) => {
        const bh = Math.max(2, (d._val / max) * 105);
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', cursor:'default' }}>
            <span style={{ color:'#94a3b8', fontSize:'9px', marginBottom:2 }}>{d._val}</span>
            <div style={{ width:'100%', height:bh, background:d._clr || '#3b82f6', borderRadius:'3px 3px 0 0', transition:'height .3s', opacity:0.9 }} />
            <span style={{ color:'#64748b', fontSize:'6px', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>{d._xLbl || ''}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Simple timeline ──
function SimpleLine({ data }) {
  const max = Math.max(...data.map(d => d._val), 1);
  if (data.length < 2) return <div className="empty">Not enough data</div>;
  const w = 100, h = 120, pad = 4;
  const pts = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: h - pad - (d._val / Math.max(max, 1)) * (h - pad * 2),
    ...d
  }));
  const path = pts.map((p, i) => `${i===0?'M':'L'}${p.x} ${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height:'130px' }}>
      {[0,.5,1].map(f => <line key={f} x1={pad} y1={pad+f*(h-pad*2)} x2={w-pad} y2={pad+f*(h-pad*2)} stroke="#1e293b" strokeWidth="0.3" />)}
      <path d={path} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={1.5} fill="#3b82f6" />
          {i % 4 === 0 && <text x={p.x} y={h-1} textAnchor="middle" fill="#64748b" fontSize="4">{p._xLbl || ''}</text>}
        </g>
      ))}
    </svg>
  );
}

// ── Heatmap component ──
function HeatmapSimple({ data }) {
  if (!data.length) return <div className="empty">No data</div>;
  const max = Math.max(...data.map(d => d._val), 1);
  const cols = 7;
  const w = 100, h = 90;
  const cw = w / cols, rh = h / (data.length / cols || 1);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height:'105px' }}>
      {data.map((cell, i) => {
        const op = cell._val > 0 ? 0.15 + 0.85 * (cell._val / max) : 0.05;
        return (
          <rect key={i} x={cell._x * cw} y={cell._y * rh} width={cw-1} height={rh-1}
            fill={cell._clr} fillOpacity={op} rx="1" title={`${cell._xLbl} x ${cell._yLbl}: ${cell._val}`}
          />
        );
      })}
    </svg>
  );
}

// ══════════════════════════════════════
// Main Panel
// ══════════════════════════════════════
export default function AnalyticsPanel({ alerts, lang }) {
  const [selectedChart, setSelectedChart] = useState('byType');
  const [filterType, setFilterType] = useState('all');
  const [showHotSpots, setShowHotSpots] = useState(true);

  const L = lang;

  // Filter alerts by type
  const filtered = useMemo(() => {
    if (filterType === 'all') return alerts;
    return alerts.filter(a => a.cat === filterType);
  }, [alerts, filterType]);

  // Unique alert types in data
  const types = useMemo(() => {
    const s = new Set();
    for (const a of alerts) s.add(a.cat);
    return Array.from(s).sort();
  }, [alerts]);

  // ── Compute metric data ──
  const chartData = useMemo(() => {
    if (selectedChart === 'byType') {
      const m = {};
      for (const a of filtered) m[a.cat] = (m[a.cat]||0)+1;
      return Object.entries(m).map(([cat, v]) => ({ _val:v, _xLbl:cat, _clr:alertColor(cat), _key:cat }));
    }

    if (selectedChart === 'byLocation') {
      const m = {};
      for (const a of filtered) {
        for (const c of (a.coords||[])) {
          const name = c.nameEn || c.nameHe;
          if (name) m[name] = (m[name]||0)+1;
        }
      }
      return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([name,v]) => ({
        _val:v, _xLbl:name, _clr:'#3b82f6', _key:name
      }));
    }

    if (selectedChart === 'byHour') {
      const m = {};
      for (const a of filtered) {
        const h = new Date(a.receivedAt).getHours();
        m[h] = (m[h]||0)+1;
      }
      return Array.from({length:24}, (_,i) => ({
        _val: m[i]||0, _xLbl:`${i}`, _clr:'#3b82f6', _key:String(i)
      }));
    }

    if (selectedChart === 'byDay') {
      const m = {};
      for (const a of filtered) {
        const d = new Date(a.receivedAt).getDay();
        m[d] = (m[d]||0)+1;
      }
      const dn = L === 'he' ? DAY_NAMES_HE : DAY_NAMES;
      return Array.from({length:7}, (_,i) => ({
        _val: m[i]||0, _xLbl:dn[i], _clr:'#3b82f6', _key:String(i)
      }));
    }

    if (selectedChart === 'timeline' || selectedChart === 'heatmap') {
      // Hour × Day matrix
      const matrix = {};
      for (const a of filtered) {
        const d = new Date(a.receivedAt).getDay();
        const h = new Date(a.receivedAt).getHours();
        const key = `${d}-${h}`;
        matrix[key] = (matrix[key]||0)+1;
      }
      // For timeline: flatten to linear
      if (selectedChart === 'timeline') {
        const dn = L === 'he' ? DAY_NAMES_HE : DAY_NAMES;
        const items = [];
        for (let d = 0; d < 7; d++) {
          for (let h = 0; h < 24; h++) {
            const cnt = matrix[`${d}-${h}`] || 0;
            if (cnt > 0) items.push({ _val:cnt, _xLbl: `${dn[d]} ${h}h`, _clr:alertColor('1'), _key:`${d}-${h}` });
          }
        }
        return items;
      }
      // For heatmap grid
      const cells = [];
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          const cnt = matrix[`${d}-${h}`] || 0;
          cells.push({ _val:cnt, _x:h, _y:d, _xLbl:`${h}h`, _yLbl: L === 'he' ? DAY_NAMES_HE[d] : DAY_NAMES[d], _clr:'#ef4444' });
        }
      }
      return cells;
    }

    return [];
  }, [selectedChart, filtered, lang]);

  // ── Hot spot algorithm ──
  const hotSpots = useMemo(() => {
    const cityHour = {};
    for (const a of alerts) {
      const city = a.coords?.[0]?.nameEn || a.coords?.[0]?.nameHe || 'Unknown';
      const hour = new Date(a.receivedAt).getHours();
      const key = `${city} @ ${String(hour).padStart(2,'0')}:00`;
      cityHour[key] = (cityHour[key]||0)+1;
    }
    // Find top 5 hot spots
    return Object.entries(cityHour)
      .sort((a,b) => b[1] - a[1])
      .slice(0,5)
      .map(([key, count]) => {
        const [city, time] = key.split(' @ ');
        return { city, time, count };
      });
  }, [alerts]);

  const title = CHART_OPTIONS.find(o => o.value === selectedChart)?.[lang === 'he' ? 'he' : 'en'] || '';

  return (
    <div className="ap">
      {/* Controls */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, alignItems:'center', marginBottom:10 }}>
        {/* Chart selector */}
        <select
          value={selectedChart}
          onChange={e => setSelectedChart(e.target.value)}
          style={selectStyle}
        >
          {CHART_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o[L==='he'?'he':'en']}</option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Types</option>
          {types.map(cat => (
            <option key={cat} value={cat}>{label(cat, L)}</option>
          ))}
        </select>

        {/* Hot spot toggle */}
        <button
          className={`btn sm ${showHotSpots ? 'on' : ''}`}
          onClick={() => setShowHotSpots(p => !p)}
          style={{ fontSize:'0.75rem', padding:'5px 10px', borderRadius:'6px' }}
        >
          🎯 Hot Spots
        </button>
      </div>

      {/* Chart */}
      <div className="cbox" style={{ flex:1 }}>
        <h3 className="ctitle">{title}</h3>
        {selectedChart === 'heatmap' ? (
          <HeatmapSimple data={chartData} />
        ) : selectedChart === 'timeline' ? (
          <SimpleLine data={chartData} />
        ) : (
          <SimpleBars data={chartData} />
        )}
      </div>

      {/* Hot Spots */}
      {showHotSpots && hotSpots.length > 0 && (
        <div className="cbox">
          <h3 className="ctitle">🎯 Hot Spots (Most Alerts by City + Hour)</h3>
          <div className="lrow">
            {hotSpots.map((spot, i) => (
              <div key={i} className="litem">
                <span className="lnum" style={{ background:'rgba(239,68,68,0.2)', color:'#ef4444' }}>{i+1}</span>
                <span className="lname">{spot.city} — {spot.time}</span>
                <span className="lcnt" style={{ color:'#ef4444' }}>{spot.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
        <Stat label="Total" value={filtered.length} />
        <Stat label="Cities" value={new Set(filtered.flatMap(a => a.coords?.map(c => c.nameEn || c.nameHe).filter(Boolean))).size} />
        <Stat label="Time Span" value={getTimeSpan(filtered)} />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return <div style={{ textAlign:'center', flex:1 }}>
    <div style={{ fontSize:10, color:'#64748b', textTransform:'uppercase' }}>{label}</div>
    <div style={{ fontSize:16, fontWeight:700, color:'#3b82f6', fontFamily:'monospace' }}>{value || '—'}</div>
  </div>;
}

function getTimeSpan(alerts) {
  if (!alerts.length) return '—';
  const oldest = Math.min(...alerts.map(a => a.receivedAt));
  const newest = Math.max(...alerts.map(a => a.receivedAt));
  const diff = newest - oldest;
  if (diff < 60000) return '< 1m';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ${Math.floor((diff%3600000)/60000)}m`;
  return `${Math.floor(diff/86400000)}d ${Math.floor((diff%86400000)/3600000)}h`;
}

const selectStyle = {
  background:'#1a2236', border:'1px solid rgba(148,163,184,0.15)', color:'#e2e8f0',
  padding:'5px 10px', borderRadius:'6px', fontSize:'0.8rem', fontFamily:'Inter,sans-serif',
  cursor:'pointer', outline:'none'
};
