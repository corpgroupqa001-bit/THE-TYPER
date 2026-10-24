import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { abandonActive, beginRace, loadCampaign, resolveRace, startNewCampaign, storageKey, updateCampaign } from './campaignStore';

// Settle a race left running by a refresh/closed tab before showing anything.
function loadReconciled(userId){
  updateCampaign(userId, (s)=> abandonActive(s));
  return loadCampaign(userId);
}

/*
 * Campaign state for the signed-in user (or "guest"), kept in sync across
 * pages and tabs. Every action re-reads storage before writing.
 */
export function useCampaign({ reconcile = true } = {}){
  const { user } = useAuth();
  const userId = user?.id || 'guest';
  const [state, setState] = useState(()=> reconcile ? loadReconciled(userId) : loadCampaign(userId));

  useEffect(()=>{
    setState(reconcile ? loadReconciled(userId) : loadCampaign(userId));
    const refresh = ()=> setState(loadCampaign(userId));
    const onStorage = (e)=>{ if(e.key===storageKey(userId)) refresh(); };
    const onChange = (e)=>{ if(e.detail?.userId===userId) refresh(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('campaign-change', onChange);
    return ()=>{ window.removeEventListener('storage', onStorage); window.removeEventListener('campaign-change', onChange); };
  },[userId, reconcile]);

  const begin = useCallback((level, raceId)=> updateCampaign(userId, (s)=> beginRace(s, level, { raceId })), [userId]);
  const resolve = useCallback((args)=> updateCampaign(userId, (s)=> resolveRace(s, args)), [userId]);
  const abandon = useCallback((raceId)=> updateCampaign(userId, (s)=>
    s.activeRace?.raceId===raceId ? abandonActive(s) : { state:s, applied:false }), [userId]);
  const newCampaign = useCallback(()=> updateCampaign(userId, (s)=> startNewCampaign(s)), [userId]);

  return { state, userId, begin, resolve, abandon, newCampaign };
}
