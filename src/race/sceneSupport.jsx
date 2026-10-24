import { useEffect } from 'react';
import { tickRace } from './duel';

// Kept free of three.js imports so the page can decide on a fallback before
// the (lazy-loaded) 3D bundle is fetched.
export function hasWebGL(){
  try{
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  }catch{ return false; }
}

// Ticks the engine when the 3D canvas cannot run, so the race still works.
export function FallbackTicker({ engine, opponent }){
  useEffect(()=>{
    let raf, last = performance.now();
    const loop = (now)=>{ tickRace(engine, opponent, (now-last)/1000); last = now; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return ()=> cancelAnimationFrame(raf);
  },[engine, opponent]);
  return null;
}

export function SceneFallback({ engine, opponent, title='3D view unavailable', message, children }){
  return (
    <div className="scene-fallback">
      {engine && <FallbackTicker engine={engine} opponent={opponent} />}
      <strong>{title}</strong>
      <p>{message || 'Your browser or GPU could not start WebGL. The race still runs: speed, distance and results are calculated as normal.'}</p>
      {children}
    </div>
  );
}
