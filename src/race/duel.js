import { createRaceEngine } from './raceEngine.js';
import { createAITypist } from './aiTypist.js';

/*
 * 1v1 race against the computer.
 *
 * Race progress (both racers, one rule): completed characters = passage
 * characters typed correctly. Progress % = completed / passage length.
 *
 * Each racer owns an independent race engine (speed, nitro, wheels, distance);
 * the AI engine is fed only by the AI typist, never by the player.
 *
 * On screen the world scrolls with the player's bike; the AI bike sits at
 *   z = −visualGap, visualGap = clamp((aiCompleted − playerCompleted) × METERS_PER_CHAR)
 * smoothed over time, so a lead in characters is a lead on the road, and an
 * overtake is the AI bike physically sliding past (or falling behind) the player.
 */
export const METERS_PER_CHAR = 1.2;
export const MAX_VISUAL_GAP = 24;   // keep both bikes framed by the camera
export const PLAYER_LANE_X = -3.3;
export const AI_LANE_X = 3.3;

export function createOpponent(){
  return {
    engine: createRaceEngine(),
    typist: createAITypist(),
    visualGap: 0,
    leader: 'even',          // 'player' | 'ai' | 'even'
    lastLeader: null,
    overtakes: 0,
    lastOvertake: null,      // { by, at } for HUD toasts
    swerve: { player:0, ai:0 },
  };
}

export function resetOpponent(op){
  op.engine.reset();
  op.typist.reset();
  Object.assign(op, { visualGap:0, leader:'even', lastLeader:null, overtakes:0, lastOvertake:null, swerve:{ player:0, ai:0 } });
}

function damp(current, target, lambda, dt){
  return current + (target-current)*(1-Math.exp(-lambda*dt));
}

// The single per-frame simulation step, shared by the WebGL loop and the fallback ticker.
export function tickRace(engine, opponent, rawDt){
  engine.update(rawDt);
  if(opponent){
    const dt = Math.min(Math.max(rawDt,0), 0.1);
    const { typist, engine:ai } = opponent;
    typist.update(rawDt, (correct)=> ai.registerKey(correct));
    ai.setStats(typist.wpm(), typist.accuracy(), typist.completed);
    if(typist.phase==='finished' && ai.phase==='racing') ai.finish();
    ai.update(rawDt);

    const diff = typist.completed - engine.completed;
    const leader = diff>0 ? 'ai' : diff<0 ? 'player' : 'even';
    if(leader!=='even'){
      if(opponent.lastLeader && leader!==opponent.lastLeader){
        opponent.overtakes++;
        opponent.lastOvertake = { by:leader, at:engine.raceTime };
        opponent.swerve[leader] = 1;
      }
      opponent.lastLeader = leader;
    }
    opponent.leader = leader;
    const target = Math.max(-MAX_VISUAL_GAP, Math.min(MAX_VISUAL_GAP, diff*METERS_PER_CHAR));
    opponent.visualGap = damp(opponent.visualGap, target, 2.5, dt);
    opponent.swerve.player = Math.max(0, opponent.swerve.player - dt/1.6);
    opponent.swerve.ai = Math.max(0, opponent.swerve.ai - dt/1.6);
  }
  engine.emit();
}

/*
 * Winner from the actual race state:
 *  1. Both completed the whole passage → earlier finish time wins.
 *  2. Otherwise more completed characters wins (a finisher always has the most).
 *  3. Equal → draw.
 * racer: { completed, length, finishedAt (seconds or null) }
 */
export function decideWinner(player, ai){
  const pDone = player.completed>=player.length && player.finishedAt!=null;
  const aDone = ai.completed>=ai.length && ai.finishedAt!=null;
  if(pDone && aDone){
    const d = player.finishedAt - ai.finishedAt;
    if(Math.abs(d) < 0.05) return { winner:'draw', margin:{ chars:0, seconds:0 } };
    return { winner: d<0 ? 'player' : 'ai', margin:{ chars:0, seconds:Math.abs(d) } };
  }
  const diff = player.completed - ai.completed;
  if(diff===0) return { winner:'draw', margin:{ chars:0 } };
  return { winner: diff>0 ? 'player' : 'ai', margin:{ chars:Math.abs(diff), meters:Math.abs(diff)*METERS_PER_CHAR } };
}
