/**
 * useAlerts — Polls Tzofar API (primary) + Oref (secondary) for Israel alerts.
 * Tzofar supports CORS from the browser — no proxy needed.
 * Oref is proxied via Vite in dev; uses allorigins CORS proxy in production.
 * All alerts are persisted to localStorage across sessions.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { findCity, CITIES } from '../utils/cities.js';

// ── API endpoints ──
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

// Tzofar supports CORS — works everywhere, no proxy needed
const TZOFAR_URL = 'https://api.tzevaadom.co.il/alerts-history';

// Oref: use Vite proxy in dev, CORS proxy in production
const OREF_REALTIME = isLocalhost
  ? '/api/oref'
  : `${CORS_PROXY}${encodeURIComponent('https://www.oref.org.il/warningMessages/alert/alerts.json')}`;

const OREF_HISTORY = isLocalhost
  ? '/api/oref-history'
  : `${CORS_PROXY}${encodeURIComponent('https://alerts-history.oref.org.il/Shared/Ajax/GetAlarmsHistory.aspx?lang=he&mode=1')}`;

const CAT_MAP = { 0:'1', 5:'2', 3:'3', 4:'4', 7:'5', 1:'6', 2:'7', 8:'1' };
const MOCK_CATS = ['1','2','3','4','5','6','7'];
const MOCK_TITLE = {
  '1':'ירי רקטות וטילים','2':'חדירת כלי טיס עוין','3':'רעידת אדמה',
  '4':'צונאמי','5':'אירוע רדיולוגי','6':'חומרים מסוכנים','7':'חדירת מחבלים'
};

// ── localStorage persistence ──
const KEY = 'israel-alerts';
function loadSaved() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; }
  } catch {}
  return [];
}
function saveAll(all) {
  try { localStorage.setItem(KEY, JSON.stringify(all.slice(0, 5000))); } catch {}
}

// ── Enrichment helpers ──
function tzItem(sub, groupId, time) {
  const cities = sub.cities || [];
  return cities.map(cityHe => {
    const city = findCity(cityHe);
    const coords = city
      ? [{ lat:city.lat+(Math.random()-.5)*.008, lng:city.lng+(Math.random()-.5)*.008, nameHe:city.nameHe, nameEn:city.nameEn }]
      : [{ lat:31.5+Math.random()*1.5, lng:34.5+Math.random()*1, nameHe:cityHe, nameEn:'' }];
    return {
      id: `${groupId}-${time}-${cityHe}`,
      cat: String(CAT_MAP[String(sub.threat)]||'1'),
      title: cityHe,
      data: [cityHe],
      coords,
      receivedAt: time * 1000,
      _fromHistory: false
    };
  });
}

function enrichLive(raw) {
  const coords = (raw.data||[]).map(loc => {
    const c = findCity(loc);
    if (c) return { lat:c.lat+(Math.random()-.5)*.008, lng:c.lng+(Math.random()-.5)*.008, nameHe:c.nameHe, nameEn:c.nameEn };
    return { lat:31.5+Math.random()*1.5, lng:34.5+Math.random()*1, nameHe:loc, nameEn:'' };
  });
  return { id:String(raw.id||Date.now()), cat:String(raw.cat||'1'), title:raw.title||'', data:raw.data||[], coords, receivedAt:Date.now() };
}

function enrichHistory(entry) {
  const loc = entry.data || entry.title || '';
  const city = findCity(loc);
  const coords = city
    ? [{ lat:city.lat+(Math.random()-.5)*.008, lng:city.lng+(Math.random()-.5)*.008, nameHe:city.nameHe, nameEn:city.nameEn }]
    : [{ lat:31.5+Math.random()*1.5, lng:34.5+Math.random()*1, nameHe:loc, nameEn:'' }];
  const ts = entry.alertDate || entry.date;
  const receivedAt = ts ? new Date(ts).getTime() : Date.now();
  return { id:entry.id||entry.matrix_id||`h-${ts||Date.now()}-${loc}`, cat:String(entry.category||entry.cat||'1'), title:entry.title||'', data:[loc], coords, receivedAt, _fromHistory:true };
}

// ── Mock generator ──
let mT = null;
function startMock(cb) {
  if (mT) return;
  const fire = () => {
    const cat = MOCK_CATS[Math.floor(Math.random()*MOCK_CATS.length)];
    const n = Math.floor(Math.random()*3)+1, data=[], used=new Set();
    for (let i=0;i<n;i++){let j; do{j=Math.floor(Math.random()*CITIES.length)}while(used.has(j)); used.add(j); data.push(CITIES[j].nameHe);}
    cb(enrichLive({id:String(Date.now()+Math.random()*1e4),cat,title:MOCK_TITLE[cat],data}));
    mT = setTimeout(fire, 8000+Math.random()*12000);
  };
  fire();
}
function stopMock() { if(mT){clearTimeout(mT);mT=null;} }

// ── Hook ──
export default function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [status, setStatus] = useState('loading');
  const seen = useRef(new Set());
  const stopped = useRef(false);
  const tzLoaded = useRef(false);
  const orefLoaded = useRef(false);

  // Load persisted alerts
  useEffect(() => {
    const saved = loadSaved();
    if (saved.length > 0) {
      setAlerts(saved);
      saved.forEach(a => { if(a.id) seen.current.add(a.id); });
      console.log(`[Storage] Restored ${saved.length} alerts`);
    }
  }, []);

  const merge = useCallback((items) => {
    const added = [];
    for (const a of items) {
      if (a.id && seen.current.has(a.id)) continue;
      if (a.id) seen.current.add(a.id);
      if (parseInt(a.cat,10) >= 101) continue;
      added.push(a);
    }
    if (!added.length) return;
    setAlerts(prev => {
      const merged = [...added, ...prev].slice(0, 5000);
      saveAll(merged);
      return merged;
    });
  }, []);

  // ── 1. Load Tzofar history (primary realtime source) ──
  useEffect(() => {
    let cancelled = false;
    async function fetchTzofar() {
      try {
        const res = await fetch(TZOFAR_URL, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const groups = await res.json();
        if (!cancelled && Array.isArray(groups)) {
          const all = [];
          for (const g of groups) {
            if (!g.alerts) continue;
            for (const sub of g.alerts) {
              if (sub.isDrill) continue;
              all.push(...tzItem(sub, g.id, sub.time));
            }
          }
          if (all.length > 0) {
            console.log(`[Tzofar] Loaded ${all.length} alerts`);
            merge(all);
            tzLoaded.current = true;
          }
        }
      } catch (e) { console.warn('[Tzofar] Failed:', e.message); }
    }
    fetchTzofar();
    return () => { cancelled = true; };
  }, [merge]);

  // ── 2. Load Oref history (secondary, complementary data) ──
  useEffect(() => {
    let cancelled = false;
    async function fetchOrefHist() {
      try {
        const res = await fetch(OREF_HISTORY, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        let text = await res.text();
        text = text.replace(/^\uFEFF/,'').trim();
        if (text) {
          const data = JSON.parse(text);
          if (!cancelled && Array.isArray(data)) {
            const items = data.map(enrichHistory);
            console.log(`[Oref History] Loaded ${items.length} alerts`);
            merge(items);
            orefLoaded.current = true;
          }
        }
      } catch (e) { console.warn('[Oref History] Failed:', e.message); }
    }
    fetchOrefHist();
    return () => { cancelled = true; };
  }, [merge]);

  // ── 3. Poll Oref real-time every 2s ──
  useEffect(() => {
    stopped.current = false;
    let fails = 0;
    let timer;

    async function poll() {
      if (stopped.current) return;
      try {
        const res = await fetch(OREF_REALTIME, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        let text = await res.text();
        text = text.replace(/^\uFEFF/,'').trim();
        fails = 0;
        if (text) merge([enrichLive(JSON.parse(text))]);
      } catch (_e) {
        fails++;
        if (fails >= 10 && alerts.length === 0 && !tzLoaded.current) {
          setStatus('mock');
          startMock(merge);
          return;
        }
      }
      if (alerts.length > 0 && status === 'loading') setStatus('connected');
      timer = setTimeout(poll, 2000);
    }

    poll();
    return () => { stopped.current = true; clearTimeout(timer); stopMock(); };
  }, [merge]);

  return { alerts, status };
}
