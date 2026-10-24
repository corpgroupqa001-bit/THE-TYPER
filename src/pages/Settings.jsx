import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Palette, Keyboard, Bike, Database, Moon, Sun, Sparkles, Feather, Check, Trash2, Volume2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Segmented from '../components/Segmented';
import { saveSettings, loadSettings, loadHistory, HISTORY_KEY } from '../utils/storage';
import { DURATIONS } from '../utils/sampleTexts';

const SIZES = [18, 20, 22, 24, 26, 28, 32];

function Section({ icon:Icon, title, desc, children }){
  return (
    <section className="st-section">
      <header>
        <span className="st-icon"><Icon size={18}/></span>
        <div><h2>{title}</h2>{desc && <p>{desc}</p>}</div>
      </header>
      <div className="st-rows">{children}</div>
    </section>
  );
}

function Row({ label, hint, children, htmlFor }){
  return (
    <div className="st-row">
      <div className="st-row-text">
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span className="st-label">{label}</span>}
        {hint && <p>{hint}</p>}
      </div>
      <div className="st-row-control">{children}</div>
    </div>
  );
}

function Switch({ checked, onChange, label }){
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label}
      className={`st-switch ${checked ? 'on' : ''}`} onClick={()=> onChange(!checked)}>
      <span />
    </button>
  );
}

export default function Settings(){
  const { theme, toggleTheme, reducedMotion, setReducedMotion } = useTheme();
  const initial = useMemo(()=> loadSettings(), []);
  const [passageSize, setPassageSize] = useState(initial.passageSize ?? 22);
  const [duration, setDuration] = useState(initial.defaultDuration ?? 60);
  const [raceQuality, setRaceQuality] = useState(initial.raceQuality ?? 'high');
  const [raceAudio, setRaceAudio] = useState(initial.raceAudio ?? false);
  const [historyCount, setHistoryCount] = useState(()=> loadHistory().length);
  const [confirmClear, setConfirmClear] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef(null);

  useEffect(()=> ()=> clearTimeout(savedTimer.current), []);

  // Save only what the user changes (never on page load).
  const save = (patch)=>{
    saveSettings(patch);
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(()=> setSaved(false), 1600);
  };

  const clearHistory = ()=>{
    localStorage.removeItem(HISTORY_KEY);
    setHistoryCount(0);
    setConfirmClear(false);
    save({});
  };

  return (
    <div className="st container">
      <header className="st-head">
        <div>
          <span className="db-kicker">Settings</span>
          <h1>Preferences</h1>
          <p>Changes save automatically on this device.</p>
        </div>
        <span className={`st-saved ${saved ? 'show' : ''}`} role="status" aria-live="polite">
          {saved && <><Check size={15}/> Saved</>}
        </span>
      </header>

      <Section icon={Palette} title="Appearance" desc="How THE TYPER looks and moves.">
        <Row label="Theme" hint="Dark suits the neon racing look; light is easier in bright rooms.">
          <div className="st-choice">
            <button type="button" className={theme==='dark' ? 'on' : ''} aria-pressed={theme==='dark'}
              onClick={()=>{ if(theme!=='dark'){ toggleTheme(); save({}); } }}><Moon size={16}/> Dark</button>
            <button type="button" className={theme==='light' ? 'on' : ''} aria-pressed={theme==='light'}
              onClick={()=>{ if(theme!=='light'){ toggleTheme(); save({}); } }}><Sun size={16}/> Light</button>
          </div>
        </Row>
        <Row label="Reduce motion" hint="Turns off camera shake, speed streaks and most animations.">
          <Switch label="Reduce motion" checked={reducedMotion} onChange={(v)=>{ setReducedMotion(v); save({}); }} />
        </Row>
      </Section>

      <Section icon={Keyboard} title="Typing" desc="Applies to the typing test, 3D race and campaign.">
        <Row label="Passage text size" hint="Bigger screens scale the typing test up from this size.">
          <div className="st-size">
            <Segmented label="Passage text size" value={passageSize}
              options={SIZES.map(s=>({ id:s, label:String(s) }))}
              onChange={(v)=>{ setPassageSize(v); save({ passageSize:v }); }} />
          </div>
        </Row>
        <div className="st-preview" style={{ fontSize:passageSize }} aria-label="Text size preview">
          <span className="ok">The quick</span> <span className="bad">b</span><span className="caret" />rown fox jumps over the lazy dog.
        </div>
        <Row label="Default test length" hint="The duration a new typing test or race starts with.">
          <Segmented label="Default test length" value={duration}
            options={DURATIONS.map(d=>({ id:d, label:`${d}s` }))}
            onChange={(v)=>{ setDuration(v); save({ defaultDuration:v }); }} />
        </Row>
      </Section>

      <Section icon={Bike} title="3D Race" desc="Used by the 3D race and the campaign.">
        <div className="st-cards" role="radiogroup" aria-label="Graphics quality">
          <button type="button" role="radio" aria-checked={raceQuality==='high'} className={`st-card ${raceQuality==='high' ? 'on' : ''}`}
            onClick={()=>{ setRaceQuality('high'); save({ raceQuality:'high' }); }}>
            <Sparkles size={20}/><strong>High graphics</strong><span>Reflections, shadows and glow. Best on newer computers.</span>
          </button>
          <button type="button" role="radio" aria-checked={raceQuality==='low'} className={`st-card ${raceQuality==='low' ? 'on' : ''}`}
            onClick={()=>{ setRaceQuality('low'); save({ raceQuality:'low' }); }}>
            <Feather size={20}/><strong>Low graphics</strong><span>Smoother on older laptops and phones.</span>
          </button>
        </div>
        <Row label={<><Volume2 size={15}/> Engine sound</>} hint="A soft engine note that rises with your speed during races.">
          <Switch label="Engine sound" checked={raceAudio} onChange={(v)=>{ setRaceAudio(v); save({ raceAudio:v }); }} />
        </Row>
      </Section>

      <Section icon={Database} title="Your data" desc="Stored only in this browser.">
        <Row label="Typing history"
          hint={historyCount ? `${historyCount} saved result${historyCount===1?'':'s'}, used by your Dashboard and Leaderboard. Campaign progress isn't affected.` : 'No saved results yet.'}>
          {!confirmClear ? (
            <button type="button" className="rc-btn st-danger" disabled={!historyCount} onClick={()=> setConfirmClear(true)}>
              <Trash2 size={16}/> Clear history
            </button>
          ) : (
            <div className="st-confirm" role="alertdialog" aria-label="Confirm clearing history">
              <span>Delete {historyCount} result{historyCount===1?'':'s'} for good?</span>
              <button type="button" className="rc-btn st-danger solid" onClick={clearHistory} autoFocus>Yes, delete</button>
              <button type="button" className="rc-btn" onClick={()=> setConfirmClear(false)}>Cancel</button>
            </div>
          )}
        </Row>
        {historyCount===0 && <p className="st-note">Results appear here after you finish a <Link to="/typing">typing test</Link> or <Link to="/racing">race</Link>.</p>}
      </Section>
    </div>
  );
}
