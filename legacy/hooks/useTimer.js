import { useEffect, useRef, useState } from 'react';

export function useTimer(initialSeconds, running, onFinish){
  const [seconds, setSeconds] = useState(initialSeconds);
  const ref = useRef(initialSeconds);

  useEffect(()=>{ ref.current = initialSeconds; setSeconds(initialSeconds); },[initialSeconds]);

  useEffect(()=>{
    if(!running) return;
    if(seconds<=0){ onFinish?.(); return; }
    const id = setInterval(()=> setSeconds(s=> s-1),1000);
    return ()=> clearInterval(id);
  },[running, seconds, onFinish]);

  const reset = (val=initialSeconds)=>{ setSeconds(val); ref.current = val; };
  const pause = ()=> setSeconds(s=> s);
  return { seconds, setSeconds, reset };
}
