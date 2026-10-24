import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function usePrefersReducedMotion(){
  const [reduced, setReduced] = useState(()=> window.matchMedia?.(QUERY).matches ?? false);
  useEffect(()=>{
    const mq = window.matchMedia?.(QUERY);
    if(!mq) return;
    const on = (e)=> setReduced(e.matches);
    mq.addEventListener('change', on);
    return ()=> mq.removeEventListener('change', on);
  },[]);
  return reduced;
}
