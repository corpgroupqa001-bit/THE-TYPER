/*
 * Race engine — framework-free simulation of the motorcycle.
 *
 * The typing engine feeds it real numbers (net WPM, accuracy, each keystroke);
 * the render loop calls update(dt) once per frame. Nothing here touches React
 * state, so the scene can animate at 60fps without re-rendering the UI.
 *
 * Speed model (normalized 0–100):
 *   base     = wpmToSpeed(net WPM)                    — the headline metric
 *   rhythm   = wpmToSpeed(rolling 3-second net WPM)   — reacts when you speed up / stall
 *   target   = (0.7·base + 0.3·rhythm) · (0.75 + 0.25·accuracy) · (1 − 0.35·errorPenalty)
 *              + nitro bonus while nitro is active
 *   speed eases toward target (accelerating slower than braking), so tiers blend smoothly.
 *   distance += speedToMps(speed) · dt  (only while racing — pauses add nothing)
 */

export const ROLLING_WINDOW = 3;     // seconds of keystrokes used for "rhythm"
export const MAX_MPS = 90;           // speed 100 ≈ 90 m/s ≈ 324 km/h
export const NITRO_DURATION = 4;     // seconds
export const NITRO_BONUS = 14;       // speed points while nitro burns
const CRUISE_SPEED = 4;              // a racing bike never fully stalls on the grid

// Piecewise-linear curve through the visual tiers (0–19 cruise … 100+ max).
const CURVE = [[0,0],[20,20],[40,40],[60,58],[80,74],[100,88],[140,100]];

export function wpmToSpeed(wpm){
  if(!(wpm>0)) return 0;
  for(let i=1;i<CURVE.length;i++){
    const [w1,s1] = CURVE[i];
    if(wpm<=w1){
      const [w0,s0] = CURVE[i-1];
      return s0 + (s1-s0)*(wpm-w0)/(w1-w0);
    }
  }
  return 100;
}

export function speedToMps(speed){ return (speed/100)*MAX_MPS; }
export function speedToKmh(speed){ return speedToMps(speed)*3.6; }

export const TIERS = [
  { min:100, name:'Max Velocity' },
  { min:80,  name:'Turbo' },
  { min:60,  name:'High Speed' },
  { min:40,  name:'Racing' },
  { min:20,  name:'Moderate' },
  { min:0,   name:'Cruising' },
];
export function tierFromWpm(wpm){ return TIERS.find(t=> wpm>=t.min).name; }

function approach(current, target, rate, dt){
  return current + (target-current)*(1-Math.exp(-rate*dt));
}

export function createRaceEngine(){
  const engine = {
    phase:'idle',          // idle | racing | paused | finished
    speed:0,               // normalized 0–100 (includes nitro)
    targetSpeed:0,
    topSpeed:0,
    distance:0,            // metres travelled while racing
    raceTime:0,            // seconds of racing (excludes pauses)
    nitro:0,               // charge 0–100
    nitroTime:0,           // >0 while a nitro burn is active
    errorPenalty:0,        // 1 right after a mistake, decays to 0
    errorFlash:0,          // visual-only red flash, decays faster
    boostPulse:0,          // visual-only kick on correct keys
    accel:0,               // smoothed d(speed)/dt, used for camera & suspension
    wpm:0, accuracy:100,
    completed:0,           // correctly typed passage characters (race progress)
    wheelAngle:0,
    travel:0,              // visual scroll distance (keeps rolling while coasting)
    keys:[],               // [raceTime, correct] within the rolling window
    listeners:new Set(),
  };

  engine.reset = ()=>{
    Object.assign(engine, {
      phase:'idle', speed:0, targetSpeed:0, topSpeed:0, distance:0, raceTime:0,
      nitro:0, nitroTime:0, errorPenalty:0, errorFlash:0, boostPulse:0, accel:0,
      wpm:0, accuracy:100, completed:0, keys:[],
    });
  };
  engine.start = ()=>{ engine.reset(); engine.phase='racing'; };
  engine.pause = ()=>{ if(engine.phase==='racing') engine.phase='paused'; };
  engine.resume = ()=>{ if(engine.phase==='paused') engine.phase='racing'; };
  engine.finish = ()=>{ if(engine.phase==='racing' || engine.phase==='paused') engine.phase='finished'; };

  engine.setStats = (wpm, accuracy, completed)=>{
    engine.wpm = wpm||0; engine.accuracy = accuracy ?? 100;
    if(completed!==undefined) engine.completed = completed;
  };

  engine.registerKey = (correct)=>{
    if(engine.phase!=='racing') return;
    engine.keys.push([engine.raceTime, correct]);
    if(correct){
      engine.boostPulse = 1;
    } else {
      engine.errorPenalty = 1;
      engine.errorFlash = 1;
      engine.nitro = Math.max(0, engine.nitro-18);
    }
  };

  engine.rollingWpm = ()=>{
    const from = engine.raceTime - ROLLING_WINDOW;
    let correct = 0;
    for(const [t,ok] of engine.keys) if(t>=from && ok) correct++;
    const window = Math.min(ROLLING_WINDOW, Math.max(engine.raceTime, 1));
    return (correct/5)/(window/60);
  };

  engine.update = (rawDt)=>{
    const dt = Math.min(Math.max(rawDt,0), 0.1); // clamp tab-switch spikes
    if(engine.phase==='paused'){ engine.accel = 0; return engine; }

    const prev = engine.speed;
    if(engine.phase==='racing'){
      engine.raceTime += dt;
      const from = engine.raceTime - ROLLING_WINDOW;
      while(engine.keys.length && engine.keys[0][0] < from) engine.keys.shift();

      const base = wpmToSpeed(engine.wpm);
      const rhythm = wpmToSpeed(engine.rollingWpm());
      const accFactor = 0.75 + 0.25*(engine.accuracy/100);
      let target = (0.7*base + 0.3*rhythm) * accFactor * (1 - 0.35*engine.errorPenalty);

      // Nitro is earned: charge only while fast, accurate and mistake-free.
      const clean = engine.errorPenalty < 0.05;
      if(engine.nitroTime>0){
        engine.nitroTime = Math.max(0, engine.nitroTime-dt);
        engine.nitro = 100*(engine.nitroTime/NITRO_DURATION);
        target += NITRO_BONUS;
      } else if(engine.wpm>=45 && engine.accuracy>=94 && clean && engine.rollingWpm()>=40){
        engine.nitro = Math.min(100, engine.nitro + 9*dt);
        if(engine.nitro>=100) engine.nitroTime = NITRO_DURATION;
      } else {
        engine.nitro = Math.max(0, engine.nitro - 3*dt);
      }

      target = Math.min(100, Math.max(engine.raceTime>0.4 ? CRUISE_SPEED : 0, target));
      engine.targetSpeed = target;
      engine.speed = approach(engine.speed, target, target>engine.speed ? 1.6 : 3.2, dt);
      engine.distance += speedToMps(engine.speed)*dt;
      engine.topSpeed = Math.max(engine.topSpeed, engine.speed);
    } else {
      // idle / finished: brake smoothly to a stop
      engine.targetSpeed = 0;
      engine.nitroTime = 0;
      engine.speed = approach(engine.speed, 0, 1.4, dt);
      if(engine.speed<0.05) engine.speed = 0;
    }

    engine.errorPenalty = Math.max(0, engine.errorPenalty - dt/0.9);
    engine.errorFlash = Math.max(0, engine.errorFlash - dt/0.35);
    engine.boostPulse = Math.max(0, engine.boostPulse - dt/0.25);
    engine.accel = approach(engine.accel, dt>0 ? (engine.speed-prev)/dt : 0, 6, dt);
    engine.travel += speedToMps(engine.speed)*dt;
    engine.wheelAngle += (speedToMps(engine.speed)/0.34)*dt; // ω = v / r
    return engine;
  };

  engine.subscribe = (fn)=>{ engine.listeners.add(fn); return ()=> engine.listeners.delete(fn); };
  engine.emit = ()=>{ for(const fn of engine.listeners) fn(engine); };

  return engine;
}
