export const HISTORY_KEY = 'tt_history';
export const SETTINGS_KEY = 'tt_settings';

export function loadHistory(){
  try{ return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }catch{ return []; }
}
export function saveHistory(history){
  try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }catch{ /* storage full or blocked */ }
}
export function addResult(result){
  const history = loadHistory();
  const saved = { ...result, id: crypto.randomUUID(), date: Date.now() };
  history.unshift(saved);
  saveHistory(history.slice(0,500));
  return saved;
}

// Best net WPM so far for this user (optionally only race results).
export function getPersonalBest(userId, { raceOnly=false }={}){
  return loadHistory()
    .filter(r=> (r.userId||'guest')===(userId||'guest') && (!raceOnly || r.race))
    .reduce((best,r)=> (!best || r.wpm>best.wpm) ? r : best, null);
}

export function loadSettings(){
  try{ return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); }catch{ return {}; }
}
// Merges, so callers saving one preference don't wipe the others.
export function saveSettings(settings){
  try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...loadSettings(), ...settings })); }catch{ /* ignore */ }
}
