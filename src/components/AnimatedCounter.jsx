import { useEffect, useState } from 'react';

export default function AnimatedCounter({ value, duration=600 }){
  const [display, setDisplay] = useState(0);
  useEffect(()=>{
    let start = 0;
    const startTime = performance.now();
    const tick = (t)=>{
      const p = Math.min(1,(t-startTime)/duration);
      const eased = 1 - Math.pow(1-p,3);
      setDisplay(Math.round(start + (value - start)*eased));
      if(p<1) requestAnimationFrame(tick);
      else setDisplay(value);
    };
    requestAnimationFrame(tick);
  },[value,duration]);
  return <span>{display}</span>;
}
