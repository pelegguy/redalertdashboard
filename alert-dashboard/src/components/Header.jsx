import { t } from '../utils/translations';

const STATUS = { loading:'#64748b', connected:'#22c55e', mock:'#f59e0b', error:'#ef4444' };
const STATUS_TXT = { loading:'Connecting…', connected:'Connected', mock:'Mock Mode', error:'Disconnected' };

export default function Header({ lang, onLang, soundOn, onSound, mapView, onMapView, status, count }) {
  return (
    <header className="hdr">
      <div className="hdrl">
        <span className="hdri">⚠</span>
        <h1 className="hdrt">{t('title', lang)}</h1>
        <span className="hdwr">
          <span className="hdid" style={{ background: STATUS[status] || '#64748b' }} />
          {status === 'connected' && <span className="hlive">{t('live', lang)}</span>}
          <span>{STATUS_TXT[status] || status}</span>
        </span>
      </div>
      <div className="hdrr">
        <span className="hcnt">{count}</span>
        <button className={`btn${soundOn?' on':''}`} onClick={onSound}>
          {soundOn ? '🔊' : '🔇'}
        </button>
        <button className="btn" onClick={onLang}>{t('he', lang)}</button>
        <div className="tg">
          <button className={`tgb${mapView==='street'?' act':''}`} onClick={()=>onMapView('street')}>Street</button>
          <button className={`tgb${mapView==='street-labels'?' act':''}`} onClick={()=>onMapView('street-labels')}>Street+</button>
          <button className={`tgb${mapView==='satellite'?' act':''}`} onClick={()=>onMapView('satellite')}>Sat</button>
          <button className={`tgb${mapView==='satellite-labels'?' act':''}`} onClick={()=>onMapView('satellite-labels')}>Sat+</button>
        </div>
      </div>
    </header>
  );
}
