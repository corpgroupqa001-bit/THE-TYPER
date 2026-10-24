import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, Pause, Gauge, Swords } from 'lucide-react';
import { useTypingTest } from '../hooks/useTypingTest';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import TypingWorkspace from '../components/TypingWorkspace';
import { speedToKmh } from '../race/raceEngine';
import { useRaceEngine } from '../hooks/useRaceEngine';
import { raceBadge } from '../race/badges';
import { useEngineAudio } from '../race/useEngineAudio';
import { hasWebGL, SceneFallback } from '../race/sceneSupport';
import RaceHUD from '../race/ui/RaceHUD';
import RaceCountdown from '../race/ui/RaceCountdown';
import RaceControls from '../race/ui/RaceControls';
import RaceResults from '../race/ui/RaceResults';
import DuelHUD from '../race/ui/DuelHUD';
import DuelResults from '../race/ui/DuelResults';
import { AI_LEVELS } from '../race/aiTypist';
import { createOpponent, decideWinner, resetOpponent } from '../race/duel';
import { MODES, getMoreText, getRandomText, getRacePassage } from '../utils/sampleTexts';
import { addResult, getPersonalBest, loadSettings, saveSettings } from '../utils/storage';

const RaceScene = lazy(()=> import('../race/RaceScene'));
const COUNT_STEP_MS = 900;

function defaultQuality(){
  const weak = (navigator.hardwareConcurrency||8)<=4 || (navigator.deviceMemory||8)<=4;
  const touch = window.matchMedia?.('(pointer: coarse)').matches;
  return weak || touch ? 'low' : 'high';
}

// ?seed=123 makes the AI deterministic (automated tests, reproducible races).
function seedFromUrl(){
  const v = Number(new URLSearchParams(window.location.search).get('seed'));
  return Number.isFinite(v) && v>0 ? v : null;
}

/*
 * phase: ready → countdown → racing ⇄ paused → finished
 * The typing engine and race engine are started together on GO, paused
 * together, and the race engine is finished from the typing engine's
 * 'finished' status so both agree on when the run ended.
 *
 * raceMode 'duel' adds a computer opponent: a fixed shared passage, an AI
 * typist + its own race engine, started/paused/finished on the same calls.
 */
export default function RacingTypingTest(){
  const settings = useMemo(()=> loadSettings(), []);
  const [duration, setDuration] = useState(settings.defaultDuration ?? 60);
  const [mode, setMode] = useState('words');
  const [difficulty, setDifficulty] = useState('medium');
  const [customText, setCustomText] = useState(settings.customText ?? '');
  const [phase, setPhase] = useState('ready');
  const [count, setCount] = useState(3);
  const [showGo, setShowGo] = useState(false);
  const [result, setResult] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [quality, setQuality] = useState(()=> settings.raceQuality ?? defaultQuality());
  const [audioOn, setAudioOn] = useState(settings.raceAudio ?? false);
  const [raceMode, setRaceMode] = useState(settings.raceMode ?? 'duel');
  const [aiLevel, setAiLevel] = useState(settings.aiLevel ?? 'medium');
  const duel = raceMode==='duel';
  const level = AI_LEVELS[aiLevel] || AI_LEVELS.medium;

  const navigate = useNavigate();
  const { user } = useAuth();
  const { reducedMotion: reducedSetting } = useTheme();
  const prefersReduced = usePrefersReducedMotion();
  const reducedMotion = reducedSetting || prefersReduced;
  const webgl = useMemo(()=> hasWebGL(), []);
  const engine = useRaceEngine();
  const opponent = useMemo(()=> createOpponent(), []);
  const fixedSeed = useMemo(()=> seedFromUrl(), []);
  const controlsRef = useRef(null);
  const inputRef = useRef(null);
  const passageSize = settings.passageSize ?? 22;

  const textOpts = useRef({ mode, difficulty, duel });
  textOpts.current = { mode, difficulty, duel };

  const typing = useTypingTest({
    duration, timed:true, autoStart:false,
    onKeystroke: (correct)=> engine.registerKey(correct),
    // A duel uses one fixed passage for both racers, so it is never extended.
    getMoreText: ()=> textOpts.current.mode==='custom' || textOpts.current.duel ? null : getMoreText(textOpts.current.mode, textOpts.current.difficulty),
  });

  const canStart = mode!=='custom' || customText.trim().length>=10;
  const makeText = useCallback(()=>(
    mode==='custom' ? customText.trim().replace(/\s+/g,' ')
      : duel ? getRacePassage(mode, difficulty, duration)
      : getRandomText(mode, difficulty)
  ),[mode, difficulty, customText, duel, duration]);

  // Point the AI at the same passage the player will type.
  const prepareOpponent = useCallback((passage)=>{
    opponent.typist.configure({ level:aiLevel, length:passage.length, seed: fixedSeed ?? Date.now() });
    resetOpponent(opponent);
  },[opponent, aiLevel, fixedSeed]);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Fresh passage whenever the text settings change outside a run.
  useEffect(()=>{
    if(phaseRef.current==='ready' || phaseRef.current==='finished'){
      const passage = makeText();
      typing.reset(passage);
      prepareOpponent(passage);
      engine.reset();
      setPhase('ready');
      setShowResults(false);
    }
  },[makeText, typing.reset, engine, prepareOpponent]);

  // Live typing stats → race engine (WPM is the single source of speed).
  useEffect(()=>{ engine.setStats(typing.netWpm, typing.accuracy, typing.correctChars); },[engine, typing.netWpm, typing.accuracy, typing.correctChars]);

  useEngineAudio(engine, audioOn);

  // Focus after the 'racing' render has enabled the textarea.
  useEffect(()=>{
    if(phase==='racing') inputRef.current?.focus({ preventScroll:true });
  },[phase]);

  const startRace = useCallback(()=>{
    if(!canStart) return;
    const p = phaseRef.current;
    if(p!=='ready' && p!=='finished') return;
    const passage = p==='finished' ? makeText() : typing.text;
    typing.reset(passage);
    prepareOpponent(passage);
    engine.reset();
    setResult(null);
    setShowResults(false);
    setCount(3);
    setPhase('countdown');
  },[canStart, makeText, typing.reset, typing.text, engine, prepareOpponent]);

  // 3 · 2 · 1 · GO — the clock and the bike start on the same tick.
  useEffect(()=>{
    if(phase!=='countdown') return;
    if(count>0){
      const id = setTimeout(()=> setCount(c=> c-1), COUNT_STEP_MS);
      return ()=> clearTimeout(id);
    }
    typing.start();
    engine.start();
    if(duel){ opponent.typist.start(); opponent.engine.start(); }
    setPhase('racing');
    setShowGo(true);
  },[phase, count, typing.start, engine, opponent, duel]);

  useEffect(()=>{
    if(!showGo) return;
    const id = setTimeout(()=> setShowGo(false), 750);
    return ()=> clearTimeout(id);
  },[showGo]);

  const pause = useCallback(()=>{
    if(phaseRef.current!=='racing') return;
    typing.pause(); engine.pause(); opponent.typist.pause(); opponent.engine.pause(); setPhase('paused');
  },[typing.pause, engine, opponent]);

  const resume = useCallback(()=>{
    if(phaseRef.current!=='paused') return;
    typing.resume(); engine.resume(); opponent.typist.resume(); opponent.engine.resume(); setPhase('racing');
  },[typing.resume, engine, opponent]);

  const restart = useCallback(()=>{
    const passage = makeText();
    typing.reset(passage);
    prepareOpponent(passage);
    engine.reset();
    setResult(null); setShowResults(false); setShowGo(false);
    setPhase('ready');
  },[makeText, typing.reset, engine, prepareOpponent]);

  const finish = useCallback(()=> typing.finish(), [typing.finish]);

  // Typing engine says the run is over (timer, passage complete or Finish).
  useEffect(()=>{
    if(typing.status!=='finished') return;
    if(phaseRef.current!=='racing' && phaseRef.current!=='paused') return;
    engine.finish();
    const r = typing.getResults();
    const userId = user?.id || 'guest';
    const previousBest = getPersonalBest(userId, { raceOnly:true })?.wpm ?? null;
    const data = {
      ...r, duration, mode, difficulty, race:true,
      distance: Math.round(engine.distance),
      topSpeedKmh: Math.round(speedToKmh(engine.topSpeed)),
      userId, userName: user?.name || 'Guest',
    };
    let duelResult = null;
    if(duel){
      // Freeze the AI at the same instant and judge both from the race state.
      opponent.typist.finish();
      opponent.engine.finish();
      const t = opponent.typist, len = typing.text.length;
      const player = { ...r, completed:r.correctChars, length:len, distance:data.distance, topSpeedKmh:data.topSpeedKmh,
        finishedAt: r.correctChars>=len ? r.elapsedSeconds : null };
      const ai = { wpm:t.wpm(), accuracy:t.accuracy(), completed:t.completed, length:len,
        distance:Math.round(opponent.engine.distance), topSpeedKmh:Math.round(speedToKmh(opponent.engine.topSpeed)),
        finishedAt:t.finishedAt };
      const outcome = decideWinner(player, ai);
      Object.assign(data, {
        duel:true, outcome:outcome.winner, completedChars:player.completed, passageLength:len,
        opponent:{ type:'ai', level:aiLevel, wpm:ai.wpm, accuracy:ai.accuracy, completed:ai.completed, distance:ai.distance },
      });
      duelResult = { outcome, player, ai };
    }
    const saved = r.keystrokes>0;
    if(saved) addResult(data);
    setResult({ data, previousBest, saved, badge: raceBadge(data.wpm, data.accuracy), duel:duelResult });
    setPhase('finished');
    inputRef.current?.blur();
    const id = setTimeout(()=> setShowResults(true), reducedMotion ? 250 : 1700);
    return ()=> clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[typing.status]);

  // Pause when the tab is hidden so time and distance can't drift apart.
  useEffect(()=>{
    const onVis = ()=>{ if(document.hidden) pause(); };
    document.addEventListener('visibilitychange', onVis);
    return ()=> document.removeEventListener('visibilitychange', onVis);
  },[pause]);

  // Keyboard: Enter starts, Esc pauses/resumes, any key while racing refocuses the passage.
  const handlers = useRef({});
  handlers.current = { startRace, pause, resume, typing };
  useEffect(()=>{
    const onKey = (e)=>{
      const h = handlers.current;
      const tag = e.target?.tagName;
      const inField = tag==='INPUT' || tag==='TEXTAREA' || tag==='SELECT' || tag==='BUTTON';
      const p = phaseRef.current;
      if(e.key==='Escape'){
        if(p==='racing'){ e.preventDefault(); h.pause(); }
        else if(p==='paused'){ e.preventDefault(); h.resume(); }
        return;
      }
      if(e.key==='Enter' && !inField && (p==='ready' || p==='finished')){ e.preventDefault(); h.startRace(); return; }
      if(p==='racing' && e.target!==inputRef.current && !inField && e.key.length===1 && !e.metaKey && !e.ctrlKey && !e.altKey){
        e.preventDefault();
        inputRef.current?.focus({ preventScroll:true });
        h.typing.handleInput(h.typing.typed + e.key);
      }
    };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  },[]);

  const setQ = (q)=>{ setQuality(q); saveSettings({ raceQuality:q }); };
  const setA = (a)=>{ setAudioOn(a); saveSettings({ raceAudio:a }); };
  const setMode2 = (m)=>{ setRaceMode(m); saveSettings({ raceMode:m }); };
  const setLevel = (l)=>{ setAiLevel(l); saveSettings({ aiLevel:l }); };
  const changeDifficulty = ()=>{
    restart();
    requestAnimationFrame(()=>{
      const el = controlsRef.current;
      el?.scrollIntoView({ behavior:'smooth', block:'center' });
      el?.querySelector('.seg-ai input:checked')?.focus();
    });
  };
  const locked = phase==='countdown' || phase==='racing' || phase==='paused';
  const modeLabel = MODES.find(m=> m.id===mode)?.label;
  const timeLeft = phase==='ready' || phase==='countdown' ? duration : typing.timeLeft;

  return (
    <div className="race-page">
      <section className={`race-stage phase-${phase}`} aria-label="3D race view">
        {webgl ? (
          <Suspense fallback={<div className="scene-loading"><span className="spinner" /> Loading 3D track…</div>}>
            <RaceScene engine={engine} opponent={duel ? opponent : undefined} aiLabel={level.label} phase={phase} quality={quality} reducedMotion={reducedMotion} />
          </Suspense>
        ) : <SceneFallback engine={engine} opponent={duel ? opponent : undefined} />}

        {duel ? (
          <DuelHUD
            engine={engine} opponent={opponent} aiLevel={level} phase={phase} timeLeft={timeLeft}
            player={{ wpm:typing.netWpm, accuracy:typing.accuracy, completed:typing.correctChars, length:typing.text.length }}
            audioOn={audioOn} onToggleAudio={()=> setA(!audioOn)}
            quality={quality} onToggleQuality={()=> setQ(quality==='high'?'low':'high')}
          />
        ) : (
        <RaceHUD
          engine={engine} wpm={typing.netWpm} accuracy={typing.accuracy}
          timeLeft={timeLeft} progress={phase==='ready'||phase==='countdown' ? 0 : typing.progress} phase={phase}
          audioOn={audioOn} onToggleAudio={()=> setA(!audioOn)}
          quality={quality} onToggleQuality={()=> setQ(quality==='high'?'low':'high')}
        />
        )}

        {(phase==='countdown' || showGo) && <RaceCountdown count={phase==='countdown' ? count : 0} />}

        <AnimatePresence>
          {phase==='ready' && duel && (
            <motion.div className="stage-intro" key="intro-duel"
              initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }} transition={{ duration:0.35 }}>
              <span className="stage-kicker"><Swords size={14}/> 1v1 vs AI · {duration}s · {modeLabel}</span>
              <h1>Beat the machine.</h1>
              <div className="matchup">
                <div className="mu p"><b>You</b><span>Your real typing</span></div>
                <span className="mu-vs">VS</span>
                <div className="mu ai"><b>AI · {level.label}</b><span>{level.wpm[0]}–{level.wpm[1]} WPM · ~{Math.round(level.accuracy*100)}% acc</span></div>
              </div>
              <p>Same passage, same clock. Whoever has completed the most characters when time runs out wins. Finish the passage first to win outright.</p>
              <div className="stage-intro-cta">
                <button type="button" className="rc-btn primary lg" onClick={startRace} disabled={!canStart}><Play size={18}/> Start Race</button>
                <span className="kbd-hint"><kbd>Enter</kbd> to start</span>
              </div>
              {!canStart && <p className="stage-warn">Add at least 10 characters of custom text below.</p>}
            </motion.div>
          )}
          {phase==='ready' && !duel && (
            <motion.div className="stage-intro" key="intro"
              initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }} transition={{ duration:0.35 }}>
              <span className="stage-kicker"><Gauge size={14}/> 3D Race · {duration}s · {modeLabel} · {difficulty}</span>
              <h1>Type to throttle.</h1>
              <p>Your net WPM drives the bike. Clean, fast streaks charge nitro. Mistakes tap the brakes.</p>
              <div className="stage-intro-cta">
                <button type="button" className="rc-btn primary lg" onClick={startRace} disabled={!canStart}><Play size={18}/> Start Race</button>
                <span className="kbd-hint"><kbd>Enter</kbd> to start</span>
              </div>
              {!canStart && <p className="stage-warn">Add at least 10 characters of custom text below.</p>}
            </motion.div>
          )}
        </AnimatePresence>

        {phase==='paused' && (
          <div className="stage-paused">
            <Pause size={22}/>
            <strong>Paused</strong>
            <button type="button" className="rc-btn primary" onClick={resume}><Play size={16}/> Resume</button>
            <span className="kbd-hint"><kbd>Esc</kbd> to resume</span>
          </div>
        )}

        <AnimatePresence>
          {showResults && result?.duel && (
            <DuelResults
              key="duel-results"
              outcome={result.duel.outcome} player={result.duel.player} ai={result.duel.ai} aiLevel={AI_LEVELS[result.data.opponent.level]}
              saved={result.saved}
              onRaceAgain={startRace} onChangeDifficulty={changeDifficulty}
              onViewResults={()=> navigate('/results', { state:{ result: result.data } })}
            />
          )}
          {showResults && result && !result.duel && (
            <RaceResults
              key="results"
              result={result.data} previousBest={result.previousBest} badge={result.badge} saved={result.saved}
              onRaceAgain={startRace}
              onViewResults={()=> navigate('/results', { state:{ result: result.data } })}
            />
          )}
        </AnimatePresence>
      </section>

      <section className="race-console">
        <div ref={controlsRef}>
        <RaceControls
          raceMode={raceMode} onRaceMode={setMode2} aiLevel={aiLevel} onAiLevel={setLevel}
          phase={phase} duration={duration} mode={mode} difficulty={difficulty}
          onDuration={setDuration} onMode={setMode} onDifficulty={setDifficulty}
          onStart={startRace} onPause={pause} onResume={resume} onRestart={restart} onFinish={finish}
          onNewText={mode!=='custom' ? ()=>{ const t = makeText(); typing.reset(t); prepareOpponent(t); } : undefined}
        />
        </div>

        {mode==='custom' && !locked && (
          <textarea
            className="custom-text" rows={2} value={customText}
            placeholder="Paste or write your own passage (at least 10 characters)…"
            onChange={(e)=>{ setCustomText(e.target.value); saveSettings({ customText:e.target.value }); }}
          />
        )}

        <div className="console-meta">
          <span className="meta-title">{modeLabel} · {difficulty[0].toUpperCase()+difficulty.slice(1)}</span>
          <span className="meta-stats">
            <span><em>Correct</em>{typing.correctChars}</span>
            <span className="bad"><em>Errors</em>{typing.incorrectChars}</span>
            <span><em>Accuracy</em>{typing.accuracy}%</span>
            <span><em>Gross</em>{typing.grossWpm} WPM</span>
          </span>
        </div>

        <TypingWorkspace
          text={typing.text} typed={typing.typed} onInput={typing.handleInput}
          disabled={phase!=='racing'} active={phase==='racing'} inputRef={inputRef}
          fontSize={passageSize} lines={3}
          idleHint="Click here to keep typing"
        />
      </section>
    </div>
  );
}
