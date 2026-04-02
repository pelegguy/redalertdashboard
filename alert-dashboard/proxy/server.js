/**
 * Lightweight proxy for oref.org.il alerts — runs on GCP Cloud Run (me-west1).
 * Proxies real-time alerts and history endpoints, adds CORS headers.
 */
import http from 'node:http';
import https from 'node:https';

const PORT = process.env.PORT || 8080;

// Allow CORS from the GitHub Pages frontend
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN
  || 'https://pelegguy.github.io';

const ENDPOINTS = {
  'realtime': {
    target: 'https://www.oref.org.il',
    path: '/warningMessages/alert/alerts.json',
    headers: {
      'Referer': 'https://www.oref.org.il/',
      'X-Requested-With': 'XMLHttpRequest',
    },
  },
  'history': {
    target: 'https://alerts-history.oref.org.il',
    path: '/Shared/Ajax/GetAlarmsHistory.aspx?lang=he&mode=1',
  },
};

function fetchOref(key) {
  return new Promise((resolve, reject) => {
    const { target, path, headers: extra } = ENDPOINTS[key];
    const url = new URL(path, target);

    const req = https.get(url.toString(), {
      timeout: 12000,
      headers: { ...extra },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`${key}: HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`${key}: timeout`)); });
  });
}

async function corsResp(status, body) {
  let payload = '';
  if (body !== undefined) {
    payload = (typeof body === 'string') ? body : JSON.stringify(body);
  } else {
    payload = '';
  }
  return new Response(payload, {
    status,
    headers: {
      'Access-Control-Allow-Origin': FRONTEND_ORIGIN,
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

async function handleRequest(req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (path === '/api/realtime') {
    const raw = await fetchOref('realtime');
    const cleaned = raw.replace(/^\uFEFF/, '').trim();
    return corsResp(200, cleaned);
  }

  if (path === '/api/history') {
    const raw = await fetchOref('history');
    const cleaned = raw.replace(/^\uFEFF/, '').trim();
    return corsResp(200, cleaned);
  }

  if (path === '/health') {
    return corsResp(200, { ok: true, uptime: process.uptime() });
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return corsResp(204, '');
  }

  return corsResp(404, { error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  try {
    const response = await handleRequest(req);
    const headers = {};
    for (const [k, v] of response.headers.entries()) {
      headers[k] = v;
    }
    res.writeHead(response.status, headers);
    const body = await response.text();
    res.end(body);
  } catch (err) {
    console.error('[ERROR]', err.message);
    res.writeHead(502, {
      'Access-Control-Allow-Origin': FRONTEND_ORIGIN,
      'Content-Type': 'application/json',
    });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Oref proxy listening on :${PORT}`);
});
