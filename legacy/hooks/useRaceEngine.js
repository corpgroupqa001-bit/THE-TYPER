import { useEffect, useRef, useState, useMemo } from 'react';

function wpmToSpeed(wpm){
  if(wpm<20) return 10;
  if(wpm<40) return 30;
  if(wpm<60) return 50;
  if(wpm<80) return 65;
  if(wpm<100) return 80;
  return 95 + Math.min(5,(wpm-100)*0.05);
}

function tierFromWpm(wpm){
  if(wpm<20) return 'Rookie';
  if(wpm<40) return 'Racer';
  if(wpm<60) return 'Pro';
  if(wpm<80) return 'Elite';
  return 'Legend';
}

export function useRaceEngine({ wpm, accuracy, correctDelta, errorDelta, running, duration }){
  const [speedNorm, setSpeedNorm] = useState(0);
  const [distance, setDistance] = useState(0);
  const [nitro, setNitro] = useState(0);
  const targetSpeedRef = useRef(0);
  const lastCorrectRef = useRef(0);
  const lastErrorRef = useRef(0);

  // target speed from wpm + accuracy
  useEffect(()=>{
    const base = wpmToSpeed(wpm);
    const accMod = 0.7 + 0.3*(accuracy/100);
    targetSpeedRef.current = base * accMod;
  },[wpm,accuracy]);

  // smooth interpolation
  useEffect(()=>{
    if(!running) return;
    let raf;
    let last = performance.now();
    const loop = (now)=>{
      const dt = Math.min(32, now - last)/16.67;
      last = now;
      setSpeedNorm(s=>{
        const target = targetSpeedRef.current;
        const diff = target - s;
        const smoothed = s + diff*0.08;
        return smoothed;
      });
      setDistance(d=>{
        const metersPerFrame = speedNorm * 0.12;
        return d + metersPerFrame * dt;
      });
      // nitro from sustained accuracy
      setNitro(n=>{
        const inc = accuracy>95 ? 0.15 : accuracy>85 ? 0.06 : -0.1;
        const next = Math.max(0, Math.min(100, n + inc));
        return next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return ()=> cancelAnimationFrame(raf);
  },[running, speedNorm]);

  // correct/incorrect impulses
  useEffect(()=>{
    if(correctDelta>lastCorrectRef.current){
      // small speed bump
      targetSpeedRef.current = Math.min(100, targetSpeedRef.current + 1.5);
    }
    if(errorDelta>lastErrorRef.current){
      targetSpeedRef.current = Math.max(5, targetSpeedRef.current - 8);
      setNitro(n=> Math.max(0, n-10));
    }
    lastCorrectRef.current = correctDelta;
    lastErrorRef.current = errorDelta;
  },[correctDelta, errorDelta]);

  const tier = useMemo(()=> tierFromWpm(wpm), [wpm]);
  const progress = useMemo(()=>{
    if(!duration) return 0;
    // not directly elapsed time; approximate via distance
    return Math.min(100, (distance/ (duration*4)));
  },[distance,duration]);

  return { speedNorm, distance, nitro, tier, progress };
}
