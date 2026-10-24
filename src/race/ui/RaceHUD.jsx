import { useEffect, useRef } from 'react';
import { Volume2, VolumeX, Sparkles, Feather, Zap } from 'lucide-react';
import { speedToKmh, tierFromWpm } from '../raceEngine';
import { formatTime } from '../../utils/typingCalculations';

const MAX_KMH = 324;
const SWEEP = 260;                 // degrees of the gauge arc
const R = 54, C = 2*Math.PI*R;
const ARC = C*(SWEEP/360);

/*
 * Transparent HUD over the 3D stage. React props carry the slow-changing typing
 * stats (10 Hz from the typing clock); the fast values — speedometer needle,
 * nitro, distance, red error flash — are written straight to the DOM from the
 * engine's per-frame emit, so the HUD never re-renders at 60 fps.
 */
export default function RaceHUD({ engine, wpm, accuracy, timeLeft, progress, phase, audioOn, onToggleAudio, quality, onToggleQuality }){
  const refs = {
    needle: useRef(), arc: useRef(), kmh: useRef(), dist: useRef(), tier: useRef(),
    nitroFill: useRef(), nitroLabel: useRef(), flash: useRef(), root: useRef(),
  };

  useEffect(()=>{
    let lastText = 0;
    const r = refs;
    return engine.subscribe((e)=>{
      const kmh = speedToKmh(e.speed);
      const frac = Math.min(1, kmh/MAX_KMH);
      if(r.needle.current) r.needle.current.style.transform = `rotate(${-SWEEP/2 + frac*SWEEP}deg)`;
      if(r.arc.current) r.arc.current.style.strokeDashoffset = String(ARC*(1-frac));
      if(r.flash.current) r.flash.current.style.opacity = String(e.errorFlash*0.9);
      if(r.nitroFill.current) r.nitroFill.current.style.transform = `scaleX(${e.nitro/100})`;
      const now = performance.now();
      if(now-lastText > 90){
        lastText = now;
        if(r.kmh.current) r.kmh.current.textContent = String(Math.round(kmh));
        if(r.dist.current) r.dist.current.textContent = e.distance>=1000 ? `${(e.distance/1000).toFixed(2)} km` : `${Math.round(e.distance)} m`;
        if(r.tier.current) r.tier.current.textContent = tierFromWpm(e.wpm);
        const active = e.nitroTime>0;
        if(r.nitroLabel.current) r.nitroLabel.current.textContent = active ? 'NITRO ACTIVE' : e.nitro>=70 ? 'NITRO CHARGING' : 'NITRO';
        r.root.current?.classList.toggle('nitro-on', active);
      }
    });
    // refs object is stable in practice; subscribe once per engine
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[engine]);

  const live = phase==='racing' || phase==='paused' || phase==='finished';

  return (
    <div ref={refs.root} className={`hud ${live?'is-live':''}`}>
      <div ref={refs.flash} className="hud-flash" />

      <div className="hud-tl">
        <div className="hud-label">Time</div>
        <div className={`hud-time ${timeLeft<=5 && phase==='racing' ? 'is-low':''}`}>{formatTime(timeLeft)}</div>
        <div className="hud-progress"><span style={{ transform:`scaleX(${progress})` }} /></div>
        <div className="hud-chip"><Zap size={12}/> <span ref={refs.tier}>Cruising</span></div>
      </div>

      <div className="hud-tr">
        <button type="button" className="hud-icon" onClick={onToggleAudio} aria-pressed={audioOn} title={audioOn?'Mute engine audio':'Enable engine audio'}>
          {audioOn ? <Volume2 size={16}/> : <VolumeX size={16}/>}
        </button>
        <button type="button" className="hud-icon" onClick={onToggleQuality} title={quality==='high'?'Switch to low graphics':'Switch to high graphics'}>
          {quality==='high' ? <Sparkles size={16}/> : <Feather size={16}/>}
          <span className="hud-icon-text">{quality==='high'?'High':'Low'}</span>
        </button>
      </div>

      <div className="hud-bl">
        <div className="hud-wpm">{wpm}<small>WPM</small></div>
        <div className="hud-sub">
          <span><em>Accuracy</em>{accuracy}%</span>
          <span><em>Distance</em><b ref={refs.dist}>0 m</b></span>
        </div>
      </div>

      <div className="hud-br">
        <div className="gauge" role="img" aria-label="Speedometer">
          <svg viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={R} className="gauge-track" strokeDasharray={`${ARC} ${C}`} transform={`rotate(${90 + (360-SWEEP)/2} 70 70)`} />
            <circle ref={refs.arc} cx="70" cy="70" r={R} className="gauge-fill" strokeDasharray={`${ARC} ${C}`} strokeDashoffset={ARC} transform={`rotate(${90 + (360-SWEEP)/2} 70 70)`} />
            {Array.from({ length:9 }, (_,i)=>{
              const a = (-SWEEP/2 + i*(SWEEP/8) - 90)*Math.PI/180;
              return <line key={i} x1={70+Math.cos(a)*44} y1={70+Math.sin(a)*44} x2={70+Math.cos(a)*48} y2={70+Math.sin(a)*48} className="gauge-tick" />;
            })}
          </svg>
          <div ref={refs.needle} className="gauge-needle" />
          <div className="gauge-read"><b ref={refs.kmh}>0</b><small>km/h</small></div>
        </div>
        <div className="nitro">
          <div className="nitro-head"><span ref={refs.nitroLabel}>NITRO</span></div>
          <div className="nitro-bar"><span ref={refs.nitroFill} /></div>
        </div>
      </div>
    </div>
  );
}
