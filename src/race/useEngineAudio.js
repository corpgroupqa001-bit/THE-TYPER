import { useEffect } from 'react';

/*
 * Synthesised engine note (no audio files): two detuned oscillators through a
 * low-pass filter. Pitch and brightness follow engine speed; silent unless racing.
 * The AudioContext only exists while audio is enabled and is closed on cleanup.
 */
export function useEngineAudio(engine, enabled){
  useEffect(()=>{
    if(!enabled) return;
    let ctx;
    try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch{ return; }
    const master = ctx.createGain(); master.gain.value = 0;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 500; filter.Q.value = 3;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 50;
    const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 25;
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    o1.connect(filter); o2.connect(g2).connect(filter);
    filter.connect(master).connect(ctx.destination);
    o1.start(); o2.start();

    let last = 0;
    const unsub = engine.subscribe((e)=>{
      const now = performance.now();
      if(now-last < 50) return;
      last = now;
      const s = e.speed/100;
      const audible = e.phase==='racing' || (e.phase==='finished' && e.speed>1);
      if(audible && ctx.state==='suspended') ctx.resume().catch(()=>{});
      const t = ctx.currentTime;
      const f = 48 + s*170 + (e.nitroTime>0 ? 35 : 0);
      o1.frequency.setTargetAtTime(f, t, 0.09);
      o2.frequency.setTargetAtTime(f*0.502, t, 0.09);
      filter.frequency.setTargetAtTime(380 + s*2300, t, 0.1);
      master.gain.setTargetAtTime(audible ? 0.03 + s*0.035 : 0, t, 0.15);
    });

    return ()=>{
      unsub();
      try{ o1.stop(); o2.stop(); }catch{ /* already stopped */ }
      ctx.close().catch(()=>{});
    };
  },[engine, enabled]);
}
