import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState, canRace, beginRace, resolveRace, abandonActive, startNewCampaign,
  levelStatus, campaignOutcome, normalize, loadCampaign, updateCampaign, storageKey,
} from '../src/campaign/campaignStore.js';
import { CAMPAIGN_LEVELS, LEVEL_COUNT, aiProfile } from '../src/campaign/levels.js';
import { createAITypist } from '../src/race/aiTypist.js';

let t = 1_000_000;
const now = ()=> (t += 1000);
let n = 0;
const rid = ()=> `race-${++n}`;

function race(state, level, win){
  const id = rid();
  const b = beginRace(state, level, { raceId:id, now:now() });
  assert.ok(b.ok, `begin level ${level}: ${b.error}`);
  const r = resolveRace(b.state, { raceId:id, win, reason: win ? 'won' : 'behind-at-time', result:{ wpm:40+level, accuracy:95, seconds:30 }, now:now() });
  assert.ok(r.applied);
  return r.state;
}
function winUpTo(state, lastLevel){ for(let l=state.run.level; l<=lastLevel; l++) state = race(state, l, true); return state; }

// In-memory Storage double for the adapter tests.
function memoryStorage(seed = {}){
  const m = new Map(Object.entries(seed));
  return { getItem:(k)=> m.has(k) ? m.get(k) : null, setItem:(k,v)=> m.set(k, String(v)), removeItem:(k)=> m.delete(k), _m:m };
}

test('1. a new campaign starts at Level 1 with only Level 1 open', ()=>{
  const s = createInitialState(now());
  assert.equal(s.run.level, 1);
  assert.equal(levelStatus(s, 1), 'current');
  for(let l=2;l<=LEVEL_COUNT;l++) assert.equal(levelStatus(s, l), 'locked');
});

test('2. a victory unlocks the next level', ()=>{
  const s = race(createInitialState(now()), 1, true);
  assert.equal(s.run.level, 2);
  assert.equal(levelStatus(s, 1), 'completed');
  assert.equal(levelStatus(s, 2), 'current');
  assert.equal(s.stats.wins, 1);
  assert.equal(s.stats.bestLevelCleared, 1);
});

test('3. locked levels cannot be started and cleared levels cannot be replayed', ()=>{
  let s = createInitialState(now());
  for(const l of [2,3,5,99,0,'3']) assert.equal(beginRace(s, l, { raceId:rid() }).ok, false, `level ${l}`);
  s = race(s, 1, true);
  assert.equal(canRace(s, 1), false);
  assert.equal(beginRace(s, 1, { raceId:rid() }).error, 'locked');
});

test('4. a loss at Level 1 resets to Level 1 (new run)', ()=>{
  const s0 = createInitialState(now());
  const s = race(s0, 1, false);
  assert.equal(s.run.level, 1);
  assert.notEqual(s.run.id, s0.run.id);
  assert.equal(s.stats.losses, 1);
  assert.equal(s.lastEvent.type, 'failed');
});

test('5. a loss at Level 4 wipes current progress back to Level 1 but keeps history', ()=>{
  let s = winUpTo(createInitialState(now()), 3);
  assert.equal(s.run.level, 4);
  s = race(s, 4, false);
  assert.equal(s.run.level, 1);
  assert.deepEqual(s.run.cleared, []);
  for(let l=2;l<=LEVEL_COUNT;l++) assert.equal(levelStatus(s, l), 'locked');
  assert.equal(s.stats.bestLevelCleared, 3, 'best level is permanent');
  assert.equal(s.stats.wins, 3);
  assert.equal(s.stats.losses, 1);
  assert.equal(s.stats.attempts, 4);
});

test('6. refreshing after a loss does not restore old progress (persisted state)', ()=>{
  const store = memoryStorage();
  const user = 'u1';
  let s = loadCampaign(user, store);
  for(let l=1;l<=3;l++){
    const id = rid();
    updateCampaign(user, (st)=> beginRace(st, l, { raceId:id, now:now() }), store);
    updateCampaign(user, (st)=> resolveRace(st, { raceId:id, win:true, now:now() }), store);
  }
  assert.equal(loadCampaign(user, store).run.level, 4);
  const id = rid();
  updateCampaign(user, (st)=> beginRace(st, 4, { raceId:id, now:now() }), store);
  updateCampaign(user, (st)=> resolveRace(st, { raceId:id, win:false, reason:'behind-at-time', now:now() }), store);
  s = loadCampaign(user, store);                    // "refresh"
  assert.equal(s.run.level, 1);
  assert.equal(s.lastEvent.type, 'failed');
  // replaying the same win result after the loss is rejected
  const replay = updateCampaign(user, (st)=> resolveRace(st, { raceId:id, win:true, now:now() }), store);
  assert.equal(replay.applied, false);
  assert.equal(loadCampaign(user, store).run.level, 1);
});

test('6b. a refresh or exit mid-race counts as a defeat', ()=>{
  const store = memoryStorage();
  let s = loadCampaign('u2', store);
  for(let l=1;l<=2;l++){
    const id = rid();
    updateCampaign('u2', (st)=> beginRace(st, l, { raceId:id, now:now() }), store);
    updateCampaign('u2', (st)=> resolveRace(st, { raceId:id, win:true, now:now() }), store);
  }
  updateCampaign('u2', (st)=> beginRace(st, 3, { raceId:rid(), now:now() }), store);
  // page reloads mid-race → app reconciles on load
  const out = updateCampaign('u2', (st)=> abandonActive(st, now()), store);
  assert.equal(out.applied, true);
  s = loadCampaign('u2', store);
  assert.equal(s.run.level, 1);
  assert.equal(s.lastEvent.reason, 'abandoned');
});

test('duplicate and stale submissions are ignored', ()=>{
  let s = createInitialState(now());
  const id = rid();
  s = beginRace(s, 1, { raceId:id, now:now() }).state;
  const first = resolveRace(s, { raceId:id, win:true, now:now() });
  assert.ok(first.applied);
  const again = resolveRace(first.state, { raceId:id, win:true, now:now() });
  assert.equal(again.applied, false); assert.equal(again.error, 'duplicate');
  assert.equal(again.state.run.level, 2);
  const forged = resolveRace(first.state, { raceId:'made-up', win:true, now:now() });
  assert.equal(forged.applied, false);
  assert.equal(forged.state.stats.wins, 1);
});

test('7. a victory at Level 5 records campaign completion and the title', ()=>{
  const s = winUpTo(createInitialState(now()), LEVEL_COUNT);
  assert.equal(s.run.status, 'completed');
  assert.equal(s.stats.completions.length, 1);
  const c = s.stats.completions[0];
  assert.equal(c.levels.length, LEVEL_COUNT);
  assert.ok(c.durationMs > 0);
  assert.ok(s.stats.titles.includes('Apex Champion'));
  assert.equal(s.lastEvent.type, 'completed');
  assert.equal(canRace(s, 1), false, 'a finished campaign must be restarted explicitly');
});

test('8. starting a new campaign keeps historical records', ()=>{
  let s = winUpTo(createInitialState(now()), LEVEL_COUNT);
  const before = s.stats;
  assert.equal(startNewCampaign(createInitialState(now()), now()).ok, false, 'only after completion');
  s = startNewCampaign(s, now()).state;
  assert.equal(s.run.level, 1);
  assert.equal(s.run.status, 'active');
  assert.deepEqual(s.stats.completions, before.completions);
  assert.equal(s.stats.wins, before.wins);
  assert.ok(s.stats.titles.includes('Apex Champion'));
  s = race(s, 1, false);
  assert.equal(s.stats.completions.length, 1, 'a later failed run does not erase the record');
});

test('outcome rules: no-input never wins, ties go to the opponent', ()=>{
  assert.deepEqual(campaignOutcome({ winner:'player', margin:{ chars:5 } }, { completed:0, keystrokes:0 }), { win:false, reason:'no-input' });
  assert.equal(campaignOutcome({ winner:'player', margin:{ chars:5 } }, { completed:20, keystrokes:22 }).win, true);
  assert.equal(campaignOutcome({ winner:'draw', margin:{ chars:0 } }, { completed:20, keystrokes:22 }).reason, 'tie');
  assert.equal(campaignOutcome({ winner:'ai', margin:{ seconds:2 } }, { completed:20, keystrokes:22 }).reason, 'ai-finished-first');
});

test('tampered or corrupt storage is repaired, not trusted', ()=>{
  assert.equal(normalize({ version:1, run:{ level:5, cleared:[], status:'active' } }).run.level, 1, 'level must match cleared levels');
  assert.equal(normalize('garbage').run.level, 1);
  const store = memoryStorage({ [storageKey('x')]: '{not json' });
  assert.equal(loadCampaign('x', store).run.level, 1);
  const other = memoryStorage({ tt_history:'[1]', tt_settings:'{"a":1}' });
  loadCampaign('y', other);
  assert.equal(other.getItem('tt_history'), '[1]');
  assert.equal(other.getItem('tt_settings'), '{"a":1}');
  assert.deepEqual([...other._m.keys()].sort(), ['the-typer:campaign:v1:y','tt_history','tt_settings']);
});

test('level config: 5 levels, rising difficulty, AI lands near each target', ()=>{
  assert.equal(CAMPAIGN_LEVELS.length, 5);
  assert.ok(CAMPAIGN_LEVELS[4].boss);
  for(let i=1;i<CAMPAIGN_LEVELS.length;i++) assert.ok(CAMPAIGN_LEVELS[i].ai.target > CAMPAIGN_LEVELS[i-1].ai.target);
  for(const lvl of CAMPAIGN_LEVELS){
    const w = [];
    for(let seed=1; seed<=12; seed++){
      const ai = createAITypist();
      ai.configure({ profile:aiProfile(lvl), length:9999, seed });
      ai.start();
      for(let x=0; x<lvl.duration; x+=1/60) ai.update(1/60);
      w.push(ai.wpm());
    }
    const avg = w.reduce((a,b)=>a+b,0)/w.length;
    assert.ok(Math.abs(avg - lvl.ai.target) <= 6, `level ${lvl.level}: avg ${avg.toFixed(1)} vs target ${lvl.ai.target}`);
  }
});

test('9. AI opponents never appear as leaderboard players', async ()=>{
  const { buildRanking } = await import('../src/utils/leaderboard.js');
  const history = [
    { userId:'u1', userName:'Sam', wpm:52, accuracy:96, date:Date.now(), race:true, campaign:{ level:3 },
      opponent:{ type:'ai', name:'Vex', wpm:88, accuracy:99 } },
    { userId:'ai-vex', userName:'Vex', userType:'ai', wpm:150, accuracy:100, date:Date.now() },
  ];
  const r = buildRanking(history, { myId:'u1', myName:'Sam' });
  const names = r.map(p=> p.name);
  assert.ok(names.includes('Sam'));
  for(const lvl of CAMPAIGN_LEVELS) assert.ok(!names.includes(lvl.opponent.name), `${lvl.opponent.name} must not be ranked`);
  assert.equal(r.find(p=> p.name==='Sam').wpm, 52, 'player keeps their own WPM, not the AI’s');
});
