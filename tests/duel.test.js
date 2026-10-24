import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAITypist, AI_LEVELS, MAX_AI_WPM } from '../src/race/aiTypist.js';
import { createOpponent, tickRace, decideWinner, resetOpponent } from '../src/race/duel.js';
import { createRaceEngine } from '../src/race/raceEngine.js';

const FRAME = 1/60;
function simulate(level, seconds, seed=42, length=5000){
  const ai = createAITypist();
  ai.configure({ level, length, seed });
  ai.start();
  for(let t=0;t<seconds;t+=FRAME) ai.update(FRAME);
  return ai;
}

test('AI is deterministic for a given seed', ()=>{
  const a = simulate('hard', 30, 7), b = simulate('hard', 30, 7), c = simulate('hard', 30, 8);
  assert.equal(a.completed, b.completed);
  assert.equal(a.mistakes, b.mistakes);
  assert.notEqual(a.completed*1000+a.mistakes, c.completed*1000+c.mistakes);
});

test('each difficulty lands near its target WPM range over a minute', ()=>{
  for(const [id, lvl] of Object.entries(AI_LEVELS)){
    for(const seed of [1,2,3,4,5]){
      const ai = simulate(id, 60, seed);
      const [lo, hi] = lvl.wpm;
      assert.ok(ai.wpm()>=lo-4 && ai.wpm()<=hi+4, `${id} seed ${seed}: ${ai.wpm()} WPM not near ${lo}-${hi}`);
    }
  }
});

test('difficulty orders speed and accuracy', ()=>{
  const avg = (id, f)=> [1,2,3,4,5,6].reduce((s,seed)=> s+f(simulate(id,60,seed)),0)/6;
  const ids = ['easy','medium','hard','expert'];
  for(let i=1;i<ids.length;i++){
    assert.ok(avg(ids[i], a=>a.wpm()) > avg(ids[i-1], a=>a.wpm()));
    assert.ok(avg(ids[i], a=>a.accuracy()) >= avg(ids[i-1], a=>a.accuracy()) - 1);
  }
  const easy = simulate('easy', 60, 3);
  assert.ok(easy.mistakes>0 && easy.accuracy()<100, 'easy AI makes mistakes');
});

test('AI never types impossibly fast or finishes instantly', ()=>{
  const ai = createAITypist(); ai.configure({ level:'expert', length:40, seed:9 }); ai.start();
  for(let i=0;i<60;i++) ai.update(FRAME);           // first second
  assert.ok(ai.completed < 10, `typed ${ai.completed} chars in 1s`);
  ai.update(10);                                     // a huge frame spike is clamped
  assert.ok(ai.completed < 15);
  for(let t=0;t<30;t+=FRAME) ai.update(FRAME);
  assert.equal(ai.phase, 'finished');
  assert.ok(ai.finishedAt > 40/5/(MAX_AI_WPM/60), 'finish time respects the speed ceiling');
  assert.equal(ai.completed, 40);
});

test('AI pauses with the race and stops on finish', ()=>{
  const ai = createAITypist(); ai.configure({ level:'medium', length:999, seed:1 }); ai.start();
  for(let i=0;i<120;i++) ai.update(FRAME);
  ai.pause(); const c = ai.completed, t = ai.raceTime;
  for(let i=0;i<120;i++) ai.update(FRAME);
  assert.equal(ai.completed, c); assert.equal(ai.raceTime, t);
  ai.resume(); for(let i=0;i<120;i++) ai.update(FRAME);
  assert.ok(ai.completed > c);
  ai.finish(); const done = ai.completed;
  for(let i=0;i<120;i++) ai.update(FRAME);
  assert.equal(ai.completed, done);
});

test('AI is independent of the player and both can overtake', ()=>{
  const player = createRaceEngine(), op = createOpponent();
  op.typist.configure({ level:'medium', length:2000, seed:11 });
  player.start(); op.engine.start(); op.typist.start();
  // Player starts slow (AI pulls ahead), then types fast (player overtakes).
  let completed = 0, carry = 0;
  for(let t=0;t<40;t+=FRAME){
    const wpm = t<12 ? 15 : 90;
    carry += wpm*5/60*FRAME;
    while(carry>=1){ carry--; completed++; player.registerKey(true); }
    player.setStats(wpm, 100, completed);
    tickRace(player, op, FRAME);
    if(t>6 && t<6+FRAME) assert.equal(op.leader, 'ai', 'AI leads early');
    if(t>6 && t<6+FRAME) assert.ok(op.visualGap > 1, 'AI bike is physically ahead on the road');
  }
  assert.equal(op.leader, 'player');
  assert.ok(op.overtakes>=1);
  assert.equal(op.lastOvertake.by, 'player');
  assert.ok(op.visualGap < -1, 'player bike is physically ahead');
  assert.ok(op.engine.speed>0 && Math.abs(op.engine.wpm - player.wpm) > 20, 'AI does not mirror the player');
  resetOpponent(op);
  assert.equal(op.typist.completed, 0); assert.equal(op.visualGap, 0); assert.equal(op.overtakes, 0);
});

test('winner is decided from race state', ()=>{
  assert.equal(decideWinner({ completed:120, length:300, finishedAt:null }, { completed:100, length:300, finishedAt:null }).winner, 'player');
  assert.equal(decideWinner({ completed:90, length:300, finishedAt:null }, { completed:300, length:300, finishedAt:40 }).winner, 'ai');
  assert.equal(decideWinner({ completed:150, length:300, finishedAt:null }, { completed:150, length:300, finishedAt:null }).winner, 'draw');
  const both = decideWinner({ completed:300, length:300, finishedAt:41.2 }, { completed:300, length:300, finishedAt:43.0 });
  assert.equal(both.winner, 'player'); assert.ok(Math.abs(both.margin.seconds-1.8)<1e-9);
  // Typed to the end but with uncorrected errors: not a full completion.
  assert.equal(decideWinner({ completed:290, length:300, finishedAt:30 }, { completed:295, length:300, finishedAt:null }).winner, 'ai');
  assert.equal(decideWinner({ completed:120, length:300, finishedAt:null }, { completed:100, length:300, finishedAt:null }).margin.chars, 20);
});
