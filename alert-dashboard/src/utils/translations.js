const D = {
  en: {
    title: 'ISRAEL ALERT DASHBOARD',
    connected: 'Connected', loading: 'Loading…', mock: 'Mock Mode',
    live: 'LIVE', soundOn: 'Sound', soundOff: 'Muted',
    he: 'עברית', street: 'Map', sat: 'Satellite',
    feedTitle: 'LIVE FEED', feedEmpty: 'No alerts yet',
    justNow: 'just now', m: '{n}m ago', h: '{n}h ago',
    sess: 'Session', today: 'Today', h24: 'Last 24h',
    byType: 'By Type', trend: 'Recent Trend', locs: 'Top Locations',
    noData: 'No data',
  },
  he: {
    title: 'לוח בקרת התראות',
    connected: 'מחובר', loading: 'טוען…', mock: 'מצב מדומה',
    live: 'חי', soundOn: 'צלצול', soundOff: 'שקט',
    he: 'English', street: 'מפה', sat: 'לוויין',
    feedTitle: 'הזמן חי', feedEmpty: 'אין התראות',
    justNow: 'עכשיו', m: 'לפני {n} דק׳', h: 'לפני {n} שע׳',
    sess: 'הפעלה', today: 'היום', h24: '24 שעות',
    byType: 'לפי סוג', trend: 'מגמה אחרונה', locs: 'מיקומים מובילים',
    noData: 'אין נתונים',
  }
};

// cat -> [en, he, color]
const AT = {
  '1': ['Rockets','ירי רקטות','#ef4444'],
  '2': ['Aircraft','כלי טיס','#ff8000'],
  '3': ['Earthquake','רעידת אדמה','#22c55e'],
  '4': ['Tsunami','צונאמי','#06b6d4'],
  '5': ['Radiological','רדיולוגי','#ec4899'],
  '6': ['Hazmat','חומרים מסוכנים','#a855f7'],
  '7': ['Terror','חדירת מחבלים','#eab308'],
  '13': ['Concluded','הסתיים','#10b981'],
  '14': ['Pre-Alert','התרעה','#f59e0b'],
};

export function t(k, L='en') { return (D[L]||D.en)[k] || D.en[k] || k; }
export function label(cat, L='en') { const p=AT[String(cat)]; return p ? (L==='he'?p[1]:p[0]) : `Cat ${cat}`; }
export function color(cat) { return AT[String(cat)]?.[2] || '#64748b'; }
