import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, Pause, Flag, Lock, Map as MapIcon, Crown, Cpu, Timer, Gauge, Target, AlertTriangle } from 'lucide-react';
import { useTypingTest } from '../hooks/useTypingTest';
import { useRaceEngine } from '../hooks/useRaceEngine';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import TypingWorkspace from '../components/TypingWorkspace';
import { speedToKmh } from '../race/raceEngine';
import { createOpponent, decideWinner, resetOpponent } from '../race/duel';
import { hasWebGL, SceneFallback } from '../race/sceneSupport';
import { useEngineAudio } from '../race/useEngineAudio';
import DuelHUD from '../race/ui/DuelHUD';
import RaceCountdown from '../race/ui/RaceCountdown';
import { getLevel, aiProfile, LEVEL_COUNT } from '../campaign/levels';
import { levelStatus, campaignOutcome } from '../campaign/campaignStore';
import { useCampaign } from '../campaign/useCampaign';
import { raceFeedback } from '../campaign/feedback';
import CampaignResult from '../campaign/CampaignResult';
import { OpponentAvatar } from './CampaignHub';
import { getRacePassage } from '../utils/sampleTexts';
import { addResult, loadSettings, saveSettings } from '../utils/storage';

const RaceScene = lazy(()=> import('../race/RaceScene'));
const COUNT_STEP_MS = 900;

function seedFromUrl(){
  const v = Number(new URLSearchParams(window.location.search).get('seed'));
  return Number.isFinite(v) && v>0 ? v : null;
}

function Gate({ icon:Icon, title, children, actions }){
  return (
    <div className="cp-gate container">
      <div className="cp-gate-card">
        <Icon size={30}/>
        <h1>{title}</h1>
        <p>{children}</p>
        <div className="db-actions">{actions}</div>
      </div>
    </div>
  );
}

/*
 * phase: intro → countdown → racing ⇄ paused → finished
 * The race is registered with the campaign at GO (before any result exists)
 * and resolved exactly once from the typing engine's 'finished' status.
 * Unmounting or unloading mid-race resolves it as a defeat ("abandoned").
 */
export default function CampaignRace(){
  const { level: levelParam } = useParams();
  const level = getLevel(levelParam);
  const campaign = useCampaign();
  const { state } = campaign;
  const status = level ? levelStatus(state, level.level) : 'missing';

  const navigate = useNavigate();
  const { user } = useAuth();
  const { reducedMotion: reducedSetting } = useTheme();
  const prefersReduced = usePrefersReducedMotion();
  const reducedMotion = reducedSetting || prefersReduced;
  const settings = useMemo(()=> loadSettings(), []);
  const [quality, setQuality] = useState(()=> settings.raceQuality ?? 'high');
  const [audioOn, setAudioOn] = useState(settings.raceAudio ?? false);
  const webgl = useMemo(()=> hasWebGL(), []);
  const engine = useRaceEngine();
  const opponent = useMemo(()=> createOpponent(), []);
  const fixedSeed = useMemo(()=> seedFromUrl(), []);
  const inputRef = useRef(null);

  const [phase, setPhase] = useState('intro');
  const [count, setCount] = useState(3);
  const [showGo, setShowGo] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState('');
  const raceIdRef = useRef(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const typing = useTypingTest({
    duration: level?.duration ?? 30, timed:true, autoStart:false,
    onKeystroke: (correct)=> engine.registerKey(correct),
  });

  // Fresh passage + opponent for this attempt.
  const prepare = useCallback(()=>{
    if(!level) return;
    const passage = getRacePassage(level.text.mode, level.text.difficulty, level.duration);
    typing.reset(passage);
    opponent.typist.configure({ profile:aiProfile(level), length:passage.length, seed: fixedSeed ?? Date.now() });
    resetOpponent(opponent);
    engine.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[level?.level, typing.reset, opponent, engine, fixedSeed]);

  useEffect(()=>{ prepare(); setPhase('intro'); setResult(null); setShowResult(false); },[prepare]);

  useEffect(()=>{ engine.setStats(typing.netWpm, typing.accuracy, typing.correctChars); },[engine, typing.netWpm, typing.accuracy, typing.correctChars]);
  useEngineAudio(engine, audioOn);

  useEffect(()=>{ if(phase==='racing') inputRef.current?.focus({ preventScroll:true }); },[phase]);

  const startCountdown = useCallback(()=>{
    if(phaseRef.current!=='intro') return;
    setError('');
    setCount(3);
    setPhase('countdown');
  },[]);

  // GO: register the race with the campaign, then start everything on the same tick.
  useEffect(()=>{
    if(phase!=='countdown') return;
    if(count>0){
      const id = setTimeout(()=> setCount(c=> c-1), COUNT_STEP_MS);
      return ()=> clearTimeout(id);
    }
    const raceId = crypto.randomUUID();
    const res = campaign.begin(level.level, raceId);
    if(!res.ok){
      setError(res.error==='campaign-complete' ? 'This campaign is already complete.' : 'This level is locked. Your campaign has moved on, possibly in another tab.');
      setPhase('intro');
      return;
    }
    raceIdRef.current = raceId;
    typing.start();
    engine.start();
    opponent.typist.start();
    opponent.engine.start();
    setPhase('racing');
    setShowGo(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase, count]);

  // Once the AI has completed the passage the player can't win: end the race.
  useEffect(()=>{
    if(phase!=='racing' && phase!=='paused') return;
    return engine.subscribe(()=>{
      if(opponent.typist.phase==='finished' && typing.status==='running') typing.finish();
    });
  },[phase, engine, opponent, typing]);

  useEffect(()=>{
    if(!showGo) return;
    const id = setTimeout(()=> setShowGo(false), 750);
    return ()=> clearTimeout(id);
  },[showGo]);

  const pause = useCallback(()=>{
    if(phaseRef.current!=='racing') return;
    typing.pause(); engine.pause(); opponent.typist.pause(); opponent.engine.pause(); setPhase('paused');
  },[typing, engine, opponent]);
  const resume = useCallback(()=>{
    if(phaseRef.current!=='paused') return;
    typing.resume(); engine.resume(); opponent.typist.resume(); opponent.engine.resume(); setPhase('racing');
  },[typing, engine, opponent]);

  // The single place a campaign race is resolved.
  useEffect(()=>{
    if(typing.status!=='finished') return;
    if(phaseRef.current!=='racing' && phaseRef.current!=='paused') return;
    const raceId = raceIdRef.current;
    raceIdRef.current = null;
    engine.finish();
    opponent.typist.finish();
    opponent.engine.finish();
    const r = typing.getResults();
    const t = opponent.typist, len = typing.text.length;
    const player = { ...r, completed:r.correctChars, length:len, distance:Math.round(engine.distance),
      topSpeedKmh:Math.round(speedToKmh(engine.topSpeed)), finishedAt: r.correctChars>=len ? r.elapsedSeconds : null };
    const ai = { wpm:t.wpm(), accuracy:t.accuracy(), completed:t.completed, mistakes:t.mistakes, length:len, distance:Math.round(opponent.engine.distance),
      topSpeedKmh:Math.round(speedToKmh(opponent.engine.topSpeed)), finishedAt:t.finishedAt };
    const duel = decideWinner(player, ai);
    const outcome = campaignOutcome(duel, { completed:player.completed, keystrokes:r.keystrokes });

    const res = campaign.resolve({ raceId, win:outcome.win, reason:outcome.reason,
      result:{ wpm:r.wpm, accuracy:r.accuracy, seconds:r.elapsedSeconds } });

    if(res.applied && r.keystrokes>0){
      addResult({
        ...r, duration:level.duration, mode:level.text.mode, difficulty:level.text.difficulty,
        race:true, duel:true, outcome: outcome.win ? 'player' : 'ai',
        distance:player.distance, topSpeedKmh:player.topSpeedKmh,
        completedChars:player.completed, passageLength:len,
        campaign:{ level:level.level, name:level.name, win:outcome.win, reason:outcome.reason },
        opponent:{ type:'ai', name:level.opponent.name, level:`campaign-${level.level}`, wpm:ai.wpm, accuracy:ai.accuracy, completed:ai.completed },
        userId:user?.id || 'guest', userName:user?.name || 'Guest',
      });
    }
    const after = res.state;
    setResult({
      kind: !res.applied ? 'stale' : !outcome.win ? 'defeat' : level.level>=LEVEL_COUNT ? 'champion' : 'victory',
      outcome, duel, player, ai,
      feedback: raceFeedback({ win:outcome.win, reason:outcome.reason, player, ai, level }),
      completion: after.stats.completions[after.stats.completions.length-1],
    });
    setPhase('finished');
    inputRef.current?.blur();
    const id = setTimeout(()=> setShowResult(true), reducedMotion ? 250 : 1600);
    return ()=> clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[typing.status]);

  // Leaving mid-race (navigation, unmount) = defeat. Reloads/closed tabs are
  // caught both here and by the reconcile on next load.
  useEffect(()=>{
    const onUnload = ()=>{ if(raceIdRef.current) campaign.abandon(raceIdRef.current); };
    window.addEventListener('pagehide', onUnload);
    return ()=>{ window.removeEventListener('pagehide', onUnload); onUnload(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{
    const onVis = ()=>{ if(document.hidden) pause(); };
    document.addEventListener('visibilitychange', onVis);
    return ()=> document.removeEventListener('visibilitychange', onVis);
  },[pause]);

  const keys = useRef({});
  keys.current = { startCountdown, pause, resume, typing };
  useEffect(()=>{
    const onKey = (e)=>{
      const h = keys.current, p = phaseRef.current;
      const tag = e.target?.tagName;
      const inField = tag==='INPUT' || tag==='TEXTAREA' || tag==='BUTTON' || tag==='A';
      if(e.key==='Escape'){ if(p==='racing'){ e.preventDefault(); h.pause(); } else if(p==='paused'){ e.preventDefault(); h.resume(); } return; }
      if(e.key==='Enter' && !inField && p==='intro'){ e.preventDefault(); h.startCountdown(); return; }
      if(p==='racing' && e.target!==inputRef.current && !inField && e.key.length===1 && !e.metaKey && !e.ctrlKey && !e.altKey){
        e.preventDefault(); inputRef.current?.focus({ preventScroll:true }); h.typing.handleInput(h.typing.typed + e.key);
      }
    };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  },[]);

  const forfeit = ()=>{
    if(!window.confirm('Forfeit this race? It counts as a defeat and your campaign restarts at Level 1.')) return;
    typing.finish();
  };

  // ---------- guards (only before this page has started a race) ----------
  const started = phase!=='intro';
  if(!level){
    return <Gate icon={AlertTriangle} title="Level not found" actions={<Link className="rc-btn primary" to="/campaign"><MapIcon size={16}/> Campaign map</Link>}>
      There's no campaign level "{levelParam}".
    </Gate>;
  }
  if(!started && !result && status!=='current'){
    const complete = state.run.status==='completed';
    return <Gate icon={Lock} title={complete ? 'Campaign complete' : status==='completed' ? `Level ${level.level} already cleared` : `Level ${level.level} is locked`}
      actions={<>
        {!complete && <Link className="rc-btn primary" to={`/campaign/race/${state.run.level}`}><Play size={16}/> Go to Level {state.run.level}</Link>}
        <Link className="rc-btn" to="/campaign"><MapIcon size={16}/> Campaign map</Link>
      </>}>
      {complete ? 'You’ve beaten every level. Start a new campaign from the map to race again.'
        : status==='completed' ? `You've already beaten ${level.opponent.name} in this run. Your next race is Level ${state.run.level}.`
        : `Levels unlock in order. Win Level ${state.run.level} first. Your current level is ${state.run.level}.`}
    </Gate>;
  }

  const timeLeft = phase==='intro' || phase==='countdown' ? level.duration : typing.timeLeft;
  const setQ = (q)=>{ setQuality(q); saveSettings({ raceQuality:q }); };
  const setA = (a)=>{ setAudioOn(a); saveSettings({ raceAudio:a }); };

  return (
    <div className="race-page cp-race">
      <section className={`race-stage phase-${phase}`} aria-label={`Campaign level ${level.level} race`}>
        {webgl ? (
          <Suspense fallback={<div className="scene-loading"><span className="spinner" /> Loading {level.theme.name}…</div>}>
            <RaceScene engine={engine} opponent={opponent} aiLabel={level.opponent.name} aiLivery={level.opponent.livery}
              theme={level.theme} phase={phase==='intro' ? 'ready' : phase} quality={quality} reducedMotion={reducedMotion} />
          </Suspense>
        ) : <SceneFallback engine={engine} opponent={opponent} />}

        <DuelHUD
          engine={engine} opponent={opponent} aiLevel={{ label:level.opponent.name }} phase={phase==='intro' ? 'ready' : phase} timeLeft={timeLeft}
          player={{ wpm:typing.netWpm, accuracy:typing.accuracy, completed:typing.correctChars, length:typing.text.length }}
          audioOn={audioOn} onToggleAudio={()=> setA(!audioOn)}
          quality={quality} onToggleQuality={()=> setQ(quality==='high'?'low':'high')}
        />

        {(phase==='countdown' || showGo) && <RaceCountdown count={phase==='countdown' ? count : 0} />}

        <AnimatePresence>
          {phase==='intro' && (
            <motion.div key="intro" className={`cp-intro-panel ${level.boss?'boss':''}`} style={{ '--c':level.opponent.color }}
              initial={{ opacity:0, y:reducedMotion?0:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:0.4 }}>
              <span className="cp-intro-kicker">{level.boss ? <><Crown size={14}/> Final boss</> : <>Level {level.level} of {LEVEL_COUNT}</>} · {level.theme.name}</span>
              <div className="cp-intro-head">
                <OpponentAvatar level={level} size={level.boss ? 72 : 58} />
                <div>
                  <h1>{level.boss ? <>APEX awaits</> : level.name}</h1>
                  <span className="cp-ai-tag"><Cpu size={12}/> AI opponent · {level.opponent.name} ({level.opponent.handle})</span>
                </div>
              </div>
              <p>{level.opponent.intro}</p>
              <blockquote>“{level.opponent.taunt}”</blockquote>
              <div className="cp-intro-specs">
                <span><Gauge size={13}/> ~{level.ai.target} WPM</span>
                <span><Target size={13}/> ~{Math.round(level.ai.accuracy*100)}% accuracy</span>
                <span><Timer size={13}/> {level.duration}s</span>
              </div>
              <p className="cp-intro-warn"><AlertTriangle size={14}/> Lose, tie or leave mid-race and the campaign restarts at Level 1.</p>
              {error && <p className="stage-warn" role="alert">{error}</p>}
              <div className="stage-intro-cta">
                <button type="button" className="rc-btn primary lg" onClick={startCountdown} autoFocus><Play size={18}/> Start race</button>
                <span className="kbd-hint"><kbd>Enter</kbd> to start</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {phase==='paused' && (
          <div className="stage-paused">
            <Pause size={22}/><strong>Paused</strong>
            <button type="button" className="rc-btn primary" onClick={resume}><Play size={16}/> Resume</button>
            <span className="kbd-hint"><kbd>Esc</kbd> to resume</span>
          </div>
        )}

        <AnimatePresence>
          {showResult && result && (
            <CampaignResult key="result" result={result} level={level} reducedMotion={reducedMotion}
              onNext={()=> navigate(`/campaign/race/${level.level+1}`)}
              onRestart={()=> navigate('/campaign/race/1')}
              onMap={()=> navigate('/campaign')}
              onNewCampaign={()=>{ campaign.newCampaign(); navigate('/campaign'); }}
            />
          )}
        </AnimatePresence>
      </section>

      <section className="race-console">
        <div className="rc cp-console-bar">
          <div className="cp-console-title">
            <span className="meta-title">Campaign · Level {level.level} · {level.name}</span>
            <span className="cp-console-vs">You <em>vs</em> <b style={{ color:level.opponent.color }}>{level.opponent.name}</b> <small>(AI)</small></span>
          </div>
          <div className="rc-actions">
            {phase==='racing' && <button type="button" className="rc-btn" onClick={pause}><Pause size={16}/> Pause</button>}
            {phase==='paused' && <button type="button" className="rc-btn primary" onClick={resume}><Play size={16}/> Resume</button>}
            {(phase==='racing' || phase==='paused') && <button type="button" className="rc-btn" onClick={forfeit}><Flag size={16}/> Forfeit</button>}
            {(phase==='intro' || phase==='finished') && <Link to="/campaign" className="rc-btn ghost"><MapIcon size={16}/> Map</Link>}
          </div>
        </div>
        <div className="console-meta">
          <span className="meta-title">{level.text.mode} · {level.text.difficulty}</span>
          <span className="meta-stats">
            <span><em>Correct</em>{typing.correctChars}</span>
            <span className="bad"><em>Mistakes</em>{typing.keystrokes - typing.correctKeystrokes}</span>
            <span><em>Accuracy</em>{typing.accuracy}%</span>
            <span><em>WPM</em>{typing.netWpm}</span>
          </span>
        </div>
        <TypingWorkspace
          text={typing.text} typed={typing.typed} onInput={typing.handleInput}
          disabled={phase!=='racing'} active={phase==='racing'} inputRef={inputRef}
          fontSize={settings.passageSize ?? 22} lines={3} idleHint="Click here to keep typing"
        />
      </section>
    </div>
  );
}
