/*
 * Leaderboard ranking. Only humans are ranked: the signed-in/guest players
 * from saved history plus clearly labelled demo players. AI opponents (3D race
 * vs AI, campaign) are never entries — their stats live only inside a
 * result's `opponent` field and are ignored here.
 */
export const DEMO_PLAYERS = [
  { name:'Nova', wpm:112, accuracy:98, tests:64 },
  { name:'Cypher', wpm:108, accuracy:96, tests:51 },
  { name:'Lumen', wpm:105, accuracy:97, tests:47 },
  { name:'Vega', wpm:96, accuracy:95, tests:39 },
  { name:'Orion', wpm:88, accuracy:94, tests:33 },
  { name:'Iris', wpm:79, accuracy:96, tests:28 },
  { name:'Atlas', wpm:71, accuracy:93, tests:22 },
  { name:'Juno', wpm:63, accuracy:95, tests:17 },
  { name:'Pixel', wpm:55, accuracy:91, tests:12 },
  { name:'Echo', wpm:46, accuracy:92, tests:8 },
].map(p=>({ ...p, id:'demo-'+p.name, demo:true }));

export function inPeriod(t, period, now = Date.now()){
  if(period==='all') return true;
  const start = new Date(now); start.setHours(0,0,0,0);
  if(period==='week') start.setDate(start.getDate()-6);
  return t >= start.getTime();
}

export const byScore = (a,b)=> b.wpm-a.wpm || b.accuracy-a.accuracy;

export function buildRanking(history, { period='all', kind='all', myId='guest', myName='Guest', now = Date.now() } = {}){
  const map = new Map();
  for(const h of history){
    if(!h || h.isAI || h.userType==='ai') continue;        // defensive: never rank AI rows
    if(!inPeriod(h.date, period, now)) continue;
    if(kind==='typing' && h.race) continue;
    if(kind==='race' && !h.race) continue;
    const id = h.userId || 'guest';
    const cur = map.get(id);
    const tests = (cur?.tests || 0) + 1;
    if(!cur || byScore(h, cur) < 0) map.set(id, { id, name: id===myId ? myName : (h.userName || 'Guest'), wpm:h.wpm, accuracy:h.accuracy, tests, you: id===myId });
    else cur.tests = tests;
  }
  return [...DEMO_PLAYERS, ...map.values()].sort(byScore).map((p,i)=>({ ...p, rank:i+1 }));
}
