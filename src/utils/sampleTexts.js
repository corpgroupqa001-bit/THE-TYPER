export const MODES = [
  { id:'words', label:'Words' },
  { id:'quote', label:'Quotes' },
  { id:'paragraph', label:'Paragraph' },
  { id:'custom', label:'Custom' },
];
export const DIFFICULTIES = ['easy','medium','hard'];
export const DURATIONS = [15,30,60,120];

const WORDS = {
  easy: [
    'the','and','road','fast','bike','ride','line','time','city','light','blue','glow','turn','gear','race',
    'lane','sky','wind','move','keep','push','find','free','calm','day','run','go','top','lap','fuel',
    'open','next','left','right','high','low','far','near','star','dark','new','fly','zone','path','hand',
  ],
  medium: [
    'velocity','neon','quantum','pixel','matrix','signal','orbit','vector','nebula','kinetic','engine',
    'fusion','plasma','zenith','circuit','horizon','throttle','momentum','chrome','tunnel','highway',
    'skyline','reflex','rhythm','balance','overtake','corner','precision','voltage','current','sensor',
    'contrast','surface','gravity','motion','pulse','vortex','cascade','ember','prism','radiant','distance',
  ],
  hard: [
    'aerodynamic','synchronous','acceleration','luminescence','idiosyncrasy','juxtaposition','quintessential',
    'electromagnetic','counterbalance','labyrinthine','phosphorescent','extraordinary','configuration',
    'telemetry,','throughput;','sub-zero','high-octane','(nitro)','"apex"','V-twin','4-stroke','98.6%',
    'kilometre/hour','re-calibrate','well-tuned','Hyper-Drive','Neo-Tokyo','x-axis','torque:','RPM!',
  ],
};

const QUOTES = {
  easy: [
    'Speed is nothing without control.',
    'Accuracy is the foundation of speed.',
    'Practice like you mean it.',
    'Focus on the present keystroke.',
    'Consistency beats intensity every time.',
    'Mistakes are feedback, not failure.',
  ],
  medium: [
    'The only way to do great work is to love what you do.',
    'It does not matter how slowly you go as long as you do not stop.',
    'Success is the sum of small efforts, repeated day in and day out.',
    'The secret of getting ahead is getting started.',
    'Quality is not an act, it is a habit.',
    'Well done is better than well said.',
  ],
  hard: [
    '"If everything seems under control, you\'re just not going fast enough." — Mario Andretti',
    '"Simplicity is prerequisite for reliability." — Edsger W. Dijkstra',
    '"The best way to predict the future is to invent it." — Alan Kay',
    '"Make it work, make it right, make it fast." — Kent Beck',
    '"Premature optimization is the root of all evil (or at least most of it)." — Donald Knuth',
  ],
};

const PARAGRAPHS = {
  easy: [
    'The road is wide and the night is calm. Blue lights line the lanes as the bike moves on. Keep your hands soft and your eyes on the next word.',
    'A good ride starts slow. Find your pace, then let it grow. Each clean key adds a bit of speed, and each miss asks you to reset and go again.',
  ],
  medium: [
    'The neon city breathed in sync with the rhythm of keystrokes, each character a photon racing down the data stream toward the distant skyline.',
    'In the quiet of focus, speed emerges from precision, accuracy from patience, and mastery from repetition. The fastest riders rarely look rushed.',
    'A good typing test is more than raw speed; it measures consistency, endurance, and the ability to recover from errors without losing momentum.',
  ],
  hard: [
    'At 2:47 a.m., the telemetry spiked: throttle 98%, lean angle 41.5°, rear-tyre temperature climbing past 104 °C. "Hold the line," the engineer said — calmly, almost too calmly.',
    'Electromagnetic interference (EMI) can corrupt sensor readings; therefore, well-designed systems filter noise, validate inputs, and fail gracefully rather than catastrophically.',
  ],
};

const pick = (arr)=> arr[Math.floor(Math.random()*arr.length)];

function wordRun(difficulty, count){
  const pool = difficulty==='hard'
    ? [...WORDS.medium, ...WORDS.hard, ...WORDS.hard]
    : WORDS[difficulty] || WORDS.medium;
  const out = [];
  for(let i=0;i<count;i++){
    let w = pick(pool);
    if(w===out[out.length-1]) w = pick(pool);
    out.push(w);
  }
  return out.join(' ');
}

export function getRandomText(mode, difficulty='medium'){
  const d = DIFFICULTIES.includes(difficulty) ? difficulty : 'medium';
  if(mode==='quote') return pick(QUOTES[d]);
  if(mode==='paragraph') return pick(PARAGRAPHS[d]);
  return wordRun(d, d==='easy'?40:d==='medium'?50:60);
}

// More text for timed runs where a fast typist finishes the passage early.
export function getMoreText(mode, difficulty){
  if(mode==='words') return wordRun(difficulty, 30);
  return getRandomText(mode, difficulty);
}

// Fixed passage for a 1v1 race: long enough that ~75 WPM finishes right at the
// buzzer, so faster racers can finish early and slower ones race the clock.
export function getRacePassage(mode, difficulty, duration){
  const target = Math.ceil((duration/60) * 75 * 5);
  let text = getRandomText(mode, difficulty);
  while(text.length < target) text += ' ' + getMoreText(mode, difficulty);
  if(mode==='words' && text.length > target){
    const cut = text.lastIndexOf(' ', target);
    if(cut > target*0.8) text = text.slice(0, cut);
  }
  return text;
}
