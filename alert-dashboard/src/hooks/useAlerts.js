/**
 * useAlerts — Polls Tzofar (tzevaadom.co.il) API exclusively.
 * Tzofar supports CORS from the browser — no proxy needed, no geo-blocking.
 * - Live: polls /alerts-history every 10s for new alert groups
 * - Persistence: localStorage across sessions
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { findCity, CITIES } from '../utils/cities.js';

const TZOFAR_URL = 'https://api.tzevaadom.co.il/alerts-history';

const CAT_MAP = { 0:'1', 5:'2', 3:'3', 4:'4', 7:'5', 1:'6', 2:'7', 8:'1' };

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

// ── Enrichment ──
function tzItem(sub, groupId, ts, _fromHistory) {
  const cities = sub.cities || [];
  return cities.map(cityHe => {
    const city = findCity(cityHe);
    const coords = city
      ? [{ lat:city.lat+(Math.random()-.5)*.008, lng:city.lng+(Math.random()-.5)*.008, nameHe:city.nameHe, nameEn:city.nameEn }]
      : [{ lat:31.5+Math.random()*1.5, lng:34.5+Math.random()*1, nameHe:cityHe, nameEn:'' }];
    return {
      id: `${groupId}-${ts}-${cityHe}`,
      cat: String(CAT_MAP[String(sub.threat)]||'1'),
      title: cityHe,
      data: [cityHe],
      coords,
      receivedAt: ts * 1000,
      _fromHistory
    };
  });
}

// ── Poll state ──
const POLL_MS = 10000;

// ── Hook ──
export default function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [status, setStatus] = useState('loading');
  const seen = useRef(new Set());
  const stopped = useRef(false);
  const pollFailures = useRef(0);
  const lastGroupId = useRef(null);

  // Load persisted alerts on mount
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

  // ── Poll Tzofar /alerts-history every POLL_MS ──
  useEffect(() => {
    stopped.current = false;
    let timer;

    async function poll() {
      if (stopped.current) return;
      try {
        const res = await fetch(TZOFAR_URL, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const groups = await res.json();

        if (!Array.isArray(groups)) throw new Error('Unexpected response format');

        pollFailures.current = 0;

        const all = [];
        let maxId = lastGroupId.current;

        for (const g of groups) {
          const gid = g.id ?? null;
          if (gid !== null) {
            if (maxId === null || gid > maxId) maxId = gid;
          }
          if (!g.alerts) continue;
          for (const sub of g.alerts) {
            if (sub.isDrill) continue;
            all.push(...tzItem(sub, g.id, sub.time, true));
          }
        }

        if (maxId !== null) lastGroupId.current = maxId;
        if (all.length > 0) {
          console.log(`[Tzofar] Loaded ${all.length} alerts`);
          merge(all);
        }

        setStatus('connected');
      } catch (e) {
        pollFailures.current++;
        console.warn('[Tzofar] Failed:', e.message);
      }
      timer = setTimeout(poll, POLL_MS);
    }

    poll();
    return () => { stopped.current = true; clearTimeout(timer); };
  }, [merge]);

  return { alerts, historical: [], status };
}
