import { useState, useRef, useCallback } from 'react';
export default function useAudio() {
  const [on, setOn] = useState(false);
  const ctx = useRef(null);
  const mk = useCallback(() => {
    if (!ctx.current) ctx.current = new (window.AudioContext||window.webkitAudioContext)();
    if (ctx.current.state==='suspended') ctx.current.resume();
    return ctx.current;
  }, []);
  const play = useCallback(() => {
    if (!on) return;
    try {
      const c = mk(), o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination); o.type='sine';
      const n=c.currentTime;
      for(let i=0;i<4;i++){o.frequency.setValueAtTime(600,n+i*.8);o.frequency.linearRampToValueAtTime(900,n+i*.8+.4);o.frequency.linearRampToValueAtTime(600,n+(i+1)*.8);}
      g.gain.setValueAtTime(.25,n);g.gain.linearRampToValueAtTime(0,n+3.2);
      o.start(n);o.stop(n+3.2);
    } catch(_){}
  },[on,mk]);
  const toggle = useCallback(() => { setOn(p=>{if(!p)try{mk()}catch(_){}return !p;}); },[mk]);
  return { on, toggle, play };
}
