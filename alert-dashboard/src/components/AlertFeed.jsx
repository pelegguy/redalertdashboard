import { t, label, color } from '../utils/translations';

function ago(ms, L) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return t('justNow', L);
  if (m < 60) return t('m', L).replace('{n}', m);
  return t('h', L).replace('{n}', Math.floor(m / 60));
}

export default function AlertFeed({ alerts, lang }) {
  if (!alerts.length) return (
    <div className="feed"><div className="femp">{t('feedEmpty', lang)}</div></div>
  );

  return (
    <div className="feed">
      <div className="fscr">
        {alerts.slice(0, 80).map((a, i) => {
          const c = a.coords?.[0];
          const loc = c?.nameEn || c?.nameHe || a.data?.[0] || 'Unknown';
          const tp = label(a.cat, lang);
          const clr = color(a.cat);
          const nw = Date.now() - a.receivedAt < 20000;
          return (
            <div key={a.id || i} className={`fitm${nw?' nw':''}`} style={{ borderLeftColor: clr }}>
              <div className="ftop">
                <span className="ftyp" style={{ color: clr }}>{tp}</span>
                <span className="ftim">{ago(Date.now() - a.receivedAt, lang)}</span>
              </div>
              <div className="floc">{loc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
