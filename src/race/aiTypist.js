import { calculateAccuracy, calculateWPM } from '../utils/typingCalculations.js';
import { mulberry32 } from './random.js';

/*
 * Computer opponent that "types" the shared passage.
 *
 * Each frame it advances by its current instantaneous typing rate
 * (WPM × 5 / 60 characters per second). Every character is an attempt:
 *   - correct (probability = accuracy) → completed + 1
 *   - mistake → counted as an incorrect keystroke, then a short stall while it
 *     "notices and backspaces"; the same character is retried afterwards.
 * The rate drifts smoothly around a base speed drawn from the difficulty range
 * and it occasionally hesitates, so its WPM fluctuates realistically.
 * All randomness comes from a seeded PRNG: same seed + same frame times ⇒ same race.
 * WPM and accuracy use the exact same formulas as the player.
 */
export const AI_LEVELS = {
  easy:   { id:'easy',   label:'Easy',   wpm:[20,30], accuracy:0.92 },
  medium: { id:'medium', label:'Medium', wpm:[35,45], accuracy:0.94 },
  hard:   { id:'hard',   label:'Hard',   wpm:[50,65], accuracy:0.96 },
  expert: { id:'expert', label:'Expert', wpm:[70,90], accuracy:0.975 },
};
export const MAX_AI_WPM = 140;      // hard ceiling: no superhuman bursts
const WARMUP = 1.4;                 // seconds to reach full rhythm after GO
// Stalls and hesitations cost speed; aim the raw rate a little higher so the
// effective WPM lands inside the advertised range.
const PACE_COMPENSATION = 1.2;

export function createAITypist(){
  const ai = {
    level: AI_LEVELS.medium, seed: 1, length: 0, accuracyTarget: AI_LEVELS.medium.accuracy,
    phase: 'idle', raceTime: 0, completed: 0, mistakes: 0, keystrokes: 0, correctKeys: 0,
    instantWpm: 0, baseWpm: 0, finishedAt: null,
    _carry: 0, _stall: 0, _rand: Math.random, _phases: [0,0,0],
  };

  // `profile` ({ label, wpm:[lo,hi], accuracy }) lets callers such as the
  // campaign define opponents beyond the four preset levels.
  ai.configure = ({ level='medium', profile, length, seed=Date.now(), accuracy } = {})=>{
    ai.level = profile || AI_LEVELS[level] || AI_LEVELS.medium;
    ai.length = Math.max(1, length|0);
    ai.seed = seed>>>0;
    ai.accuracyTarget = accuracy ?? ai.level.accuracy;
    ai.reset();
  };

  ai.reset = ()=>{
    const rand = mulberry32(ai.seed);
    const [lo, hi] = ai.level.wpm;
    Object.assign(ai, {
      phase:'idle', raceTime:0, completed:0, mistakes:0, keystrokes:0, correctKeys:0,
      instantWpm:0, finishedAt:null, _carry:0, _stall:0, _rand:rand,
      baseWpm: lo + rand()*(hi-lo),
      _phases: [rand()*Math.PI*2, rand()*Math.PI*2, rand()*Math.PI*2],
    });
  };

  ai.start = ()=>{ ai.reset(); ai.phase = 'racing'; };
  ai.pause = ()=>{ if(ai.phase==='racing') ai.phase = 'paused'; };
  ai.resume = ()=>{ if(ai.phase==='paused') ai.phase = 'racing'; };
  ai.finish = ()=>{ if(ai.phase==='racing' || ai.phase==='paused') ai.phase = 'stopped'; };

  ai.wpm = ()=> calculateWPM(ai.completed, ai.raceTime);
  ai.accuracy = ()=> calculateAccuracy(ai.correctKeys, ai.keystrokes);
  ai.progress = ()=> ai.completed/ai.length;

  ai.update = (rawDt, onKey)=>{
    if(ai.phase!=='racing') return ai;
    const dt = Math.min(Math.max(rawDt,0), 0.1);
    ai.raceTime += dt;
    const t = ai.raceTime, [p1,p2,p3] = ai._phases;
    const drift = 1 + 0.07*Math.sin(t*0.63+p1) + 0.04*Math.sin(t*1.7+p2) + 0.02*Math.sin(t*4.1+p3);
    const warm = Math.min(1, t/WARMUP);
    ai.instantWpm = Math.min(MAX_AI_WPM, ai.baseWpm*PACE_COMPENSATION*drift*warm);

    if(ai._stall>0){
      ai._stall -= dt;
      return ai;
    }
    // Occasional hesitation (re-reading a word), ~once every 12 s.
    if(ai._rand() < dt/12){ ai._stall = 0.15 + ai._rand()*0.35; return ai; }

    ai._carry += ai.instantWpm*5/60*dt;
    while(ai._carry>=1 && ai.completed<ai.length){
      ai._carry -= 1;
      ai.keystrokes++;
      if(ai._rand() < ai.accuracyTarget){
        ai.correctKeys++;
        ai.completed++;
        onKey?.(true);
      } else {
        ai.mistakes++;
        onKey?.(false);
        ai._stall = 0.22 + ai._rand()*0.3;
        ai._carry = 0;
        break;
      }
    }
    if(ai.completed>=ai.length){
      ai.phase = 'finished';
      ai.finishedAt = ai.raceTime;
    }
    return ai;
  };

  return ai;
}
