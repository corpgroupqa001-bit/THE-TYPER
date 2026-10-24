import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Flag, Pause, Play, RotateCcw, Bike } from 'lucide-react';
import TypingWorkspace from '../components/TypingWorkspace';
import Segmented from '../components/Segmented';
import { useTypingTest } from '../hooks/useTypingTest';
import { DIFFICULTIES, DURATIONS, MODES, getMoreText, getRandomText } from '../utils/sampleTexts';
import { addResult, loadSettings, saveSettings } from '../utils/storage';
import { formatTime } from '../utils/typingCalculations';
import { useAuth } from '../context/AuthContext';

/*
 * Size the passage to the screen: the font scales with the window width and the
 * passage shows as many lines as fit in the space left below the controls.
 */
function usePassageFit(preferred){
  const boxRef = useRef(null);
  const [fit, setFit] = useState({ fontSize:26, lines:4 });
  useEffect(()=>{
    const el = boxRef.current;
    if(!el) return;
    const measure = ()=>{
      const vw = window.innerWidth;
      const base = preferred ?? 26;
      const fontSize = Math.round(vw < 700 ? Math.min(base, 20) : Math.min(42, Math.max(base, 26, vw/38)));
      const lineHeight = Math.round(fontSize*1.75);
      const cs = getComputedStyle(el);
      const avail = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const lines = Math.max(3, Math.min(10, Math.floor(avail/lineHeight)));
      setFit(f=> f.fontSize===fontSize && f.lines===lines ? f : { fontSize, lines });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return ()=>{ ro.disconnect(); window.removeEventListener('resize', measure); };
  },[preferred]);
  return { ...fit, boxRef };
}

export default function TypingTest(){
  const settings = useMemo(()=> loadSettings(), []);
  const [duration, setDuration] = useState(settings.defaultDuration ?? 60);
  const [mode, setMode] = useState('words');
  const [difficulty, setDifficulty] = useState('medium');
  const [customText, setCustomText] = useState(settings.customText ?? '');
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef(null);
  const timed = true;
  const { fontSize, lines, boxRef } = usePassageFit(settings.passageSize);

  const textOpts = useRef({ mode, difficulty });
  textOpts.current = { mode, difficulty };

  const test = useTypingTest({
    duration, timed, autoStart:true,
    getMoreText: ()=> textOpts.current.mode==='custom' ? null : getMoreText(textOpts.current.mode, textOpts.current.difficulty),
  });

  const makeText = useCallback(()=>{
    if(mode==='custom') return customText.trim().replace(/\s+/g,' ') || 'Write or paste your own passage in the custom text box.';
    return getRandomText(mode, difficulty);
  },[mode, difficulty, customText]);

  const newRun = useCallback(()=>{
    test.reset(makeText());
    requestAnimationFrame(()=> inputRef.current?.focus({ preventScroll:true }));
  },[makeText, test.reset]);

  useEffect(()=>{ newRun(); },[newRun]);

  useEffect(()=>{
    if(test.status!=='finished') return;
    const r = test.getResults();
    if(r.keystrokes===0){ newRun(); return; }
    const result = { ...r, duration, mode, difficulty, userId:user?.id||'guest', userName:user?.name||'Guest' };
    addResult(result);
    navigate('/results', { state:{ result } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[test.status]);

  useEffect(()=>{
    const onKey = (e)=>{
      if(e.key!=='Escape') return;
      if(test.status==='running') test.pause();
      else if(test.status==='paused'){ test.resume(); inputRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  },[test.status, test.pause, test.resume]);

  const running = test.status==='running' || test.status==='paused';
  const clock = timed ? (test.status==='idle' ? duration : test.timeLeft) : test.elapsed;

  return (
    <div className="tt-page">
      <header className="tt-head">
        <div>
          <span className="tt-kicker">Typing Test</span>
          <h1>{`${duration}-second test`}</h1>
        </div>
        <Link to="/racing" className="rc-btn ghost"><Bike size={16}/> Try the 3D race</Link>
      </header>

      <div className="rc tt-controls">
        <div className="rc-settings">
          {timed && <Segmented label="Duration" value={duration} disabled={running} options={DURATIONS.map(d=>({ id:d, label:`${d}s` }))} onChange={setDuration} />}
          <Segmented label="Text" value={mode} disabled={running} options={MODES} onChange={setMode} />
          <Segmented label="Difficulty" value={difficulty} disabled={running} options={DIFFICULTIES.map(d=>({ id:d, label:d[0].toUpperCase()+d.slice(1) }))} onChange={setDifficulty} />
        </div>
        <div className="rc-actions">
          {test.status==='running' && <button type="button" className="rc-btn" onClick={test.pause}><Pause size={16}/> Pause</button>}
          {test.status==='paused' && <button type="button" className="rc-btn primary" onClick={()=>{ test.resume(); inputRef.current?.focus(); }}><Play size={16}/> Resume</button>}
          <button type="button" className="rc-btn" onClick={newRun}><RotateCcw size={16}/> Restart</button>
          <button type="button" className="rc-btn finish" onClick={test.finish} disabled={!running}><Flag size={16}/> Finish</button>
        </div>
      </div>

      {mode==='custom' && !running && (
        <textarea className="custom-text" rows={2} value={customText}
          placeholder="Paste or write your own passage…"
          onChange={(e)=>{ setCustomText(e.target.value); saveSettings({ customText:e.target.value }); }} />
      )}

      <div className="tt-stats" aria-live="off">
        <div className="tt-stat main"><b>{test.netWpm}</b><span>net WPM</span></div>
        <div className="tt-stat"><b>{test.accuracy}%</b><span>accuracy</span></div>
        <div className="tt-stat"><b>{formatTime(clock)}</b><span>{timed ? 'remaining' : 'elapsed'}</span></div>
        <div className="tt-stat"><b>{test.correctChars}</b><span>correct</span></div>
        <div className="tt-stat bad"><b>{test.incorrectChars}</b><span>errors</span></div>
        <div className="tt-stat"><b>{test.grossWpm}</b><span>gross WPM</span></div>
      </div>
      <div className="tt-progress"><span style={{ transform:`scaleX(${test.progress})` }} /></div>

      <div className="tt-workspace" ref={boxRef}>
        <TypingWorkspace
          text={test.text} typed={test.typed} onInput={test.handleInput}
          disabled={test.status==='finished' || test.status==='paused'} active={test.status==='running'}
          inputRef={inputRef} fontSize={fontSize} lines={lines}
          idleHint={test.status==='idle' ? 'Click here and start typing — the clock starts on your first key' : 'Click here to keep typing'}
        />
        {test.status==='paused' && <div className="tt-paused">Paused · press <kbd>Esc</kbd> or Resume</div>}
      </div>
      <p className="tt-foot">Net WPM counts correct characters ÷ 5 per minute. Accuracy counts every key you pressed, including mistakes you fixed.</p>
    </div>
  );
}
