import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRaceEngine, wpmToSpeed, speedToMps, tierFromWpm } from '../src/race/raceEngine.js';
import { calculateWPM, calculateAccuracy, calculateGrossWPM } from '../src/utils/typingCalculations.js';

const FRAME = 1/60;
function run(engine, seconds, dt=FRAME, each){
  for(let t=0; t<seconds; t+=dt){ each?.(t); engine.update(dt); }
}

test('WPM maps monotonically onto 0–100 speed through the tiers', ()=>{
  assert.equal(wpmToSpeed(0), 0);
  let prev = -1;
  for(let w=0; w<=200; w+=5){ const s = wpmToSpeed(w); assert.ok(s>=prev, `speed drops at ${w}`); prev = s; }
  assert.equal(wpmToSpeed(20), 20);
  assert.equal(wpmToSpeed(200), 100);
  assert.equal(tierFromWpm(15), 'Cruising');
  assert.equal(tierFromWpm(85), 'Turbo');
  assert.equal(tierFromWpm(120), 'Max Velocity');
});

test('higher WPM produces a faster bike and more distance', ()=>{
  const slow = createRaceEngine(), fast = createRaceEngine();
  slow.start(); fast.start();
  slow.setStats(25, 100); fast.setStats(85, 100);
  run(slow, 10); run(fast, 10);
  assert.ok(fast.speed > slow.speed + 20, `${fast.speed} vs ${slow.speed}`);
  assert.ok(fast.distance > slow.distance*2);
});

test('distance is frame-rate independent (delta time)', ()=>{
  const a = createRaceEngine(), b = createRaceEngine();
  a.start(); b.start(); a.setStats(60, 100); b.setStats(60, 100);
  run(a, 8, 1/30); run(b, 8, 1/144);
  const diff = Math.abs(a.distance-b.distance)/b.distance;
  assert.ok(diff < 0.02, `30fps ${a.distance} vs 144fps ${b.distance}`);
});

test('distance integrates speed × time', ()=>{
  let expected = 0;
  const f = createRaceEngine(); f.start(); f.setStats(60, 100);
  for(let i=0;i<300;i++){ f.update(FRAME); expected += speedToMps(f.speed)*FRAME; }
  assert.ok(Math.abs(f.distance-expected) < 1, `${f.distance} vs ${expected}`);
});

test('a mistake decelerates briefly but does not stop the bike', ()=>{
  const e = createRaceEngine(); e.start(); e.setStats(60, 97);
  run(e, 8);
  const before = e.speed;
  e.registerKey(false);
  run(e, 0.5);
  const dip = e.speed;
  assert.ok(dip < before - 3, `no dip: ${before} → ${dip}`);
  assert.ok(dip > before*0.5, 'one error should not stall the bike');
  run(e, 3);
  assert.ok(e.speed > dip + 3, 'recovers after the penalty decays');
});

test('pause freezes distance and race time; resume continues', ()=>{
  const e = createRaceEngine(); e.start(); e.setStats(50, 100);
  run(e, 3);
  e.pause();
  const d = e.distance, t = e.raceTime;
  run(e, 5);
  assert.equal(e.distance, d);
  assert.equal(e.raceTime, t);
  e.resume(); run(e, 1);
  assert.ok(e.distance > d);
});

test('nitro is earned only by sustained fast, accurate typing', ()=>{
  const sloppy = createRaceEngine(); sloppy.start(); sloppy.setStats(70, 88);
  run(sloppy, 20, FRAME, (t)=>{ if(Math.floor(t*60)%6===0) sloppy.registerKey(true); });
  assert.equal(sloppy.nitroTime, 0);

  const clean = createRaceEngine(); clean.start(); clean.setStats(70, 99);
  let fired = false;
  // 70 WPM ≈ 5.8 correct chars per second
  run(clean, 20, FRAME, (t)=>{ if(Math.floor(t*60)%10===0) clean.registerKey(true); if(clean.nitroTime>0) fired = true; });
  assert.ok(fired, 'nitro should activate');
});

test('finish brakes to a stop and stops adding distance; reset clears everything', ()=>{
  const e = createRaceEngine(); e.start(); e.setStats(80, 100);
  run(e, 6);
  e.finish();
  const d = e.distance;
  run(e, 6);
  assert.equal(e.distance, d);
  assert.ok(e.speed < 1);
  e.reset();
  assert.equal(e.distance, 0); assert.equal(e.phase, 'idle'); assert.equal(e.nitro, 0);
});

test('keystrokes outside racing are ignored', ()=>{
  const e = createRaceEngine();
  e.registerKey(false);
  assert.equal(e.errorPenalty, 0);
});

test('typing calculations', ()=>{
  assert.equal(calculateWPM(0, 30), 0);
  assert.equal(calculateWPM(250, 60), 50);           // 250/5 = 50 words in 1 min
  assert.equal(calculateWPM(125, 30), 50);
  assert.equal(calculateGrossWPM(300, 60), 60);
  assert.equal(calculateWPM(10, 0), 0);
  assert.equal(calculateAccuracy(0, 0), 100);
  assert.equal(calculateAccuracy(95, 100), 95);
});
