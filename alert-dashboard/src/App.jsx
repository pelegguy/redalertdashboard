import { useState, useEffect, useRef } from 'react';
import useAlerts from './hooks/useAlerts';
import useAudio from './hooks/useAudio';
import Header from './components/Header';
import AlertMap from './components/AlertMap';
import AlertFeed from './components/AlertFeed';
import AnalyticsPanel from './components/AnalyticsPanel';

export default function App() {
  const { alerts, historical, status } = useAlerts();
  const { on: soundOn, toggle: toggleSound, play: playSound } = useAudio();
  const [lang, setLang] = useState('en');
  const [mapView, setMapView] = useState('street-labels');

  useEffect(() => {
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const prev = useRef(0);
  useEffect(() => {
    if (prev.current > 0 && alerts.length > prev.current && status === 'connected') {
      playSound();
    }
    prev.current = alerts.length;
  }, [alerts.length, status]);

  return (
    <div className="app">
      <Header lang={lang} onLang={() => setLang(l => l === 'en' ? 'he' : 'en')}
        soundOn={soundOn} onSound={toggleSound}
        mapView={mapView} onMapView={setMapView} status={status} count={alerts.length} />

      {status === 'mock' && <div className="bnr mock">Running in mock mode — simulating alerts</div>}
      {status === 'loading' && <div className="bnr load">Connecting to alert feed…</div>}

      <div className="main">
        <div className="sec-map"><AlertMap alerts={alerts} mapView={mapView} /></div>
        <div className="sec-feed">
          <div className="plbl">Live Feed</div>
          <AlertFeed alerts={alerts} lang={lang} />
        </div>
        <div className="sec-ana"><AnalyticsPanel alerts={alerts} historical={historical} lang={lang} /></div>
      </div>
    </div>
  );
}
