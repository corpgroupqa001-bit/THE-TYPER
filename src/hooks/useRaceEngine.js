import { useEffect, useMemo } from 'react';
import { createRaceEngine } from '../race/raceEngine';

// One race engine per mounted race page; subscribers are dropped on unmount.
export function useRaceEngine(){
  const engine = useMemo(()=> createRaceEngine(), []);
  useEffect(()=> ()=> engine.listeners.clear(), [engine]);
  return engine;
}
