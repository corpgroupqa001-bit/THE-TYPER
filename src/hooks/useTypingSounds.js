import { useEffect, useRef, useState } from 'react';
import { loadSettings, saveSettings } from '../utils/storage';

export function useTypingSounds(){
  const [enabled, setEnabled] = useState(()=> loadSettings().soundOn ?? false);
  const ctxRef = useRef(null);

  useEffect(()=>{
    saveSettings({ soundOn: enabled });
  },[enabled]);

  const ensureCtx = ()=>{
    if(!enabled) return null;
    if(!ctxRef.current){
      try { ctxRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch { }
    }
    return ctxRef.current;
  };

  const beep = (freq=440, duration=0.05, type='sine', vol=0.03)=>{
    const ctx = ensureCtx();
    if(!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const correctSound = ()=> beep(660, 0.04, 'sine', 0.02);
  const errorSound = ()=> beep(180, 0.12, 'square', 0.04);
  const boostSound = ()=> { beep(880,0.07,'sine',0.03); setTimeout(()=>beep(1100,0.07,'sine',0.03),70); };
  const finishSound = ()=> { beep(523,0.15,'sine',0.04); setTimeout(()=>beep(659,0.15,'sine',0.04),150); setTimeout(()=>beep(784,0.25,'sine',0.05),300); };

  return { enabled, setEnabled, correctSound, errorSound, boostSound, finishSound };
}
