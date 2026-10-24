import { LEVEL_COUNT } from './levels.js';

/*
 * Campaign state and rules.
 *
 * PERSISTENCE: THE TYPER has no backend, so the campaign is a local prototype
 * stored in LocalStorage under its own namespaced key per user
 * ("the-typer:campaign:v1:<userId>"). Progress is specific to this
 * browser/device and is NOT secure against tampering (anyone can edit
 * LocalStorage). It never touches other keys (history, settings, accounts).
 *
 * Two separate parts:
 *   run    — the CURRENT campaign attempt (level, cleared levels). A loss replaces it.
 *   stats  — permanent record (attempts, wins, losses, best level, completed
 *            campaigns, titles). Never reset.
 *
 * Integrity rules:
 *   - Only the run's current level can be raced (no skipping, no replays of cleared levels).
 *   - A race is registered (activeRace) at GO, before any result exists.
 *   - A result is accepted once, and only for the active raceId; duplicates and
 *     stale/forged ids are ignored.
 *   - A race that is still active when the app loads again (refresh, closed tab,
 *     navigation away) is resolved as a loss: "abandoned".
 *   - Ties go to the opponent: you must beat it outright.
 * All functions below are pure: (state, …) → { state, … }.
 */
export const STORAGE_PREFIX = 'the-typer:campaign:v1:';
const PROCESSED_KEEP = 40;

export function newRun(now){
  return { id: `run-${now}-${Math.random().toString(36).slice(2,8)}`, startedAt: now, level: 1, cleared: [], status: 'active', completedAt: null };
}

export function createInitialState(now = Date.now()){
  return {
    version: 1,
    run: newRun(now),
    activeRace: null,
    lastEvent: null,
    processed: [],
    stats: { attempts:0, wins:0, losses:0, runsStarted:1, runsFailed:0, bestLevelCleared:0, completions:[], titles:[] },
  };
}

// Repair anything malformed instead of crashing; keeps whatever stats are valid.
export function normalize(raw, now = Date.now()){
  const base = createInitialState(now);
  if(!raw || typeof raw!=='object' || raw.version!==1) return base;
  const s = raw.stats && typeof raw.stats==='object' ? raw.stats : {};
  const num = (v)=> Number.isFinite(v) && v>=0 ? v : 0;
  const stats = {
    attempts:num(s.attempts), wins:num(s.wins), losses:num(s.losses),
    runsStarted:Math.max(1, num(s.runsStarted)), runsFailed:num(s.runsFailed),
    bestLevelCleared:Math.min(LEVEL_COUNT, num(s.bestLevelCleared)),
    completions:Array.isArray(s.completions) ? s.completions : [],
    titles:Array.isArray(s.titles) ? s.titles : [],
  };
  const r = raw.run;
  const runOk = r && typeof r==='object' && Number.isInteger(r.level) && r.level>=1 && r.level<=LEVEL_COUNT
    && Array.isArray(r.cleared) && (r.status==='active' || r.status==='completed')
    // The current level must follow exactly from the cleared levels.
    && (r.status==='completed' ? r.cleared.length===LEVEL_COUNT : r.cleared.length===r.level-1);
  return {
    version:1,
    run: runOk ? r : base.run,
    activeRace: raw.activeRace && typeof raw.activeRace.raceId==='string' ? raw.activeRace : null,
    lastEvent: raw.lastEvent || null,
    processed: Array.isArray(raw.processed) ? raw.processed.slice(-PROCESSED_KEEP) : [],
    stats,
  };
}

export function levelStatus(state, level){
  const { run } = state;
  if(run.status==='completed') return 'completed';
  if(level < run.level) return 'completed';
  if(level === run.level) return 'current';
  return 'locked';
}

export function canRace(state, level){
  return state.run.status==='active' && state.run.level===Number(level);
}

export function beginRace(state, level, { raceId, now = Date.now() }){
  let s = state;
  // A stale race from an interrupted session is settled first.
  if(s.activeRace) s = abandonActive(s, now).state;
  if(!canRace(s, level)) return { state:s, ok:false, error: s.run.status==='completed' ? 'campaign-complete' : 'locked' };
  return {
    ok:true,
    state: { ...s, activeRace: { raceId, runId:s.run.id, level:Number(level), startedAt:now },
      stats: { ...s.stats, attempts: s.stats.attempts + 1 } },
  };
}

/*
 * Turn the race state into a campaign result.
 * duel: output of decideWinner(); player: { completed, keystrokes }.
 */
export function campaignOutcome(duel, player){
  if(!player || player.keystrokes<=0 || player.completed<=0) return { win:false, reason:'no-input' };
  if(duel.winner==='player') return { win:true, reason:'won' };
  if(duel.winner==='draw') return { win:false, reason:'tie' };
  return { win:false, reason: duel.margin?.seconds ? 'ai-finished-first' : 'behind-at-time' };
}

export function resolveRace(state, { raceId, win, reason, result = {}, now = Date.now() }){
  const active = state.activeRace;
  if(state.processed.includes(raceId)) return { state, applied:false, error:'duplicate' };
  if(!active || active.raceId!==raceId || active.runId!==state.run.id) return { state, applied:false, error:'stale' };

  const level = active.level;
  const processed = [...state.processed, raceId].slice(-PROCESSED_KEEP);
  const stats = { ...state.stats };
  let run = state.run, lastEvent;

  if(win){
    stats.wins += 1;
    stats.bestLevelCleared = Math.max(stats.bestLevelCleared, level);
    const cleared = [...run.cleared, { level, at:now, wpm:result.wpm ?? 0, accuracy:result.accuracy ?? 0, seconds:result.seconds ?? 0 }];
    if(level >= LEVEL_COUNT){
      const completion = {
        runId: run.id, startedAt: run.startedAt, completedAt: now, durationMs: now - run.startedAt,
        levels: cleared,
        avgWpm: Math.round(cleared.reduce((a,c)=> a+c.wpm, 0)/cleared.length),
        avgAccuracy: Math.round(cleared.reduce((a,c)=> a+c.accuracy, 0)/cleared.length),
      };
      stats.completions = [...stats.completions, completion];
      if(!stats.titles.includes('Apex Champion')) stats.titles = [...stats.titles, 'Apex Champion'];
      run = { ...run, cleared, status:'completed', completedAt:now };
      lastEvent = { type:'completed', level, at:now, raceId };
    } else {
      run = { ...run, cleared, level: level + 1 };
      lastEvent = { type:'cleared', level, at:now, raceId };
    }
  } else {
    stats.losses += 1;
    stats.runsFailed += 1;
    stats.runsStarted += 1;
    run = newRun(now);                       // strict rule: back to Level 1
    lastEvent = { type:'failed', level, reason, at:now, raceId };
  }
  return { applied:true, state: { ...state, run, activeRace:null, processed, stats, lastEvent } };
}

export function abandonActive(state, now = Date.now()){
  if(!state.activeRace) return { state, applied:false };
  return resolveRace(state, { raceId:state.activeRace.raceId, win:false, reason:'abandoned', now });
}

// Only after finishing the campaign; earlier runs and stats are kept.
export function startNewCampaign(state, now = Date.now()){
  if(state.run.status!=='completed') return { state, ok:false };
  return { ok:true, state: { ...state, run:newRun(now), activeRace:null, lastEvent:null, stats:{ ...state.stats, runsStarted: state.stats.runsStarted + 1 } } };
}

/* ---------- LocalStorage adapter (browser only) ---------- */

export function storageKey(userId){ return STORAGE_PREFIX + (userId || 'guest'); }

export function loadCampaign(userId, storage = globalThis.localStorage){
  let raw = null;
  try{ raw = storage.getItem(storageKey(userId)); }catch{ /* storage blocked */ }
  let parsed = null;
  try{ parsed = JSON.parse(raw || 'null'); }catch{ /* corrupt: start fresh */ }
  const state = normalize(parsed);
  // Persist a brand-new (or repaired) state at once so the run id stays stable.
  if(!raw || JSON.stringify(state)!==raw){
    try{ storage.setItem(storageKey(userId), JSON.stringify(state)); }catch{ /* ignore */ }
  }
  return state;
}

/*
 * Read-modify-write against the freshest stored copy, so two tabs or repeated
 * clicks never apply a result on top of an outdated state.
 */
export function updateCampaign(userId, fn, storage = globalThis.localStorage){
  const current = loadCampaign(userId, storage);
  const out = fn(current);
  if(out && out.state && out.state!==current){
    try{ storage.setItem(storageKey(userId), JSON.stringify(out.state)); }catch{ /* quota or blocked storage */ }
    if(typeof window!=='undefined') window.dispatchEvent(new CustomEvent('campaign-change', { detail:{ userId } }));
  }
  return out;
}
