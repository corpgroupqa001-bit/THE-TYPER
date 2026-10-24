/*
 * Campaign levels — pure data. Add a level by appending an entry; the map,
 * unlocking, race screen and results all read from this list.
 *
 * ai.wpm is the opponent's target range (a configuration value, not a
 * guaranteed result): the AI typist drifts around a speed drawn from it, makes
 * mistakes at (1 − accuracy) and loses time correcting them.
 */
export const CAMPAIGN_LEVELS = [
  {
    level: 1,
    name: 'Rookie Rider',
    tier: 'Beginner',
    duration: 30,
    text: { mode:'words', difficulty:'easy' },
    opponent: {
      name: 'Rivet', handle: 'AI-RV1', color:'#34d399', livery:{ paint:'#0f6b4f', accent:'#34d399' },
      intro: 'Rivet just got its license. Steady, a little shaky, very beatable.',
      taunt: 'Ready when you are… I think.',
    },
    ai: { wpm:[17,23], target:20, accuracy:0.92 },
    theme: { name:'Neon Outskirts', sky:{ top:'#03050c', mid:'#0c1a2e', horizon:'#1e4a5c', glow:'#0f766e' }, fog:'#081420', edges:['#34d399','#22d3ee'] },
    victory: 'Clean start. Rivet tips its helmet. The streets are next.',
  },
  {
    level: 2,
    name: 'Street Racer',
    tier: 'Easy / Intermediate',
    duration: 30,
    text: { mode:'words', difficulty:'medium' },
    opponent: {
      name: 'Nyx', handle: 'AI-NX2', color:'#38bdf8', livery:{ paint:'#0b4f8a', accent:'#38bdf8' },
      intro: 'Nyx owns the harbor underpass. Consistent rhythm, few wasted keys.',
      taunt: 'Keep up if you can.',
    },
    ai: { wpm:[26,34], target:30, accuracy:0.93 },
    theme: { name:'Harbor Underpass', sky:{ top:'#02040c', mid:'#0b1640', horizon:'#1d3a8a', glow:'#0369a1' }, fog:'#070d24', edges:['#38bdf8','#818cf8'] },
    victory: 'Nyx never saw you coming. The Chrome District awaits.',
  },
  {
    level: 3,
    name: 'Speed Demon',
    tier: 'Intermediate / Advanced',
    duration: 45,
    text: { mode:'words', difficulty:'medium' },
    opponent: {
      name: 'Vex', handle: 'AI-VX3', color:'#f472b6', livery:{ paint:'#8a1a5a', accent:'#f472b6' },
      intro: 'Vex lives for the redline. Fast bursts, and it rarely chokes.',
      taunt: 'Blink and you lose.',
    },
    ai: { wpm:[36,44], target:40, accuracy:0.95 },
    theme: { name:'Chrome District', sky:{ top:'#05030c', mid:'#1c0b33', horizon:'#6b1d5c', glow:'#be185d' }, fog:'#140a24', edges:['#f472b6','#a855f7'] },
    victory: 'Vex is in your mirrors now. Only the elite remain.',
  },
  {
    level: 4,
    name: 'Elite Rider',
    tier: 'Expert',
    duration: 45,
    text: { mode:'paragraph', difficulty:'medium' },
    opponent: {
      name: 'Kaida-9', handle: 'AI-KD4', color:'#fbbf24', livery:{ paint:'#8a5a06', accent:'#fbbf24' },
      intro: 'Kaida-9 is a factory-tuned racing AI. Precise, relentless, almost flawless.',
      taunt: 'Calculating your defeat.',
    },
    ai: { wpm:[50,60], target:55, accuracy:0.965 },
    theme: { name:'Skyline Expressway', sky:{ top:'#060409', mid:'#2a1608', horizon:'#7c3a0a', glow:'#c2410c' }, fog:'#1a0f06', edges:['#fbbf24','#fb923c'] },
    victory: 'Kaida-9 overheats. One rider stands between you and the crown.',
  },
  {
    level: 5,
    name: 'Apex Champion',
    tier: 'Final boss',
    boss: true,
    duration: 60,
    text: { mode:'paragraph', difficulty:'medium' },
    opponent: {
      name: 'APEX', handle: 'AI-APEX', color:'#ef4444', livery:{ paint:'#7a0f0f', accent:'#ef4444' },
      intro: 'The undefeated champion of the circuit. APEX types above 70 WPM and almost never misses. Beat it to claim the title.',
      taunt: 'Every champion falls. Not today.',
    },
    ai: { wpm:[68,76], target:72, accuracy:0.975 },
    theme: { name:'Apex Circuit', sky:{ top:'#080206', mid:'#2a0612', horizon:'#7f1d1d', glow:'#dc2626' }, fog:'#1a050b', edges:['#ef4444','#f59e0b'] },
    victory: 'APEX is dethroned. You are the Apex Champion.',
  },
];

export const LEVEL_COUNT = CAMPAIGN_LEVELS.length;

export function getLevel(n){
  return CAMPAIGN_LEVELS.find(l=> l.level===Number(n)) || null;
}

// The profile handed to the AI typist.
export function aiProfile(level){
  return { id:`campaign-${level.level}`, label:level.opponent.name, wpm:level.ai.wpm, accuracy:level.ai.accuracy };
}
