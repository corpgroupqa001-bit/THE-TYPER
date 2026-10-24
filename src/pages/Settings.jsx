import { useTheme } from '../context/ThemeContext';
import { saveSettings, loadSettings, HISTORY_KEY } from '../utils/storage';
import { useEffect, useState } from 'react';

export default function Settings(){
  const { theme, toggleTheme, reducedMotion, setReducedMotion } = useTheme();
  const [sound,setSound]=useState(loadSettings().soundOn ?? true);
  const [passageSize,setPassageSize]=useState(loadSettings().passageSize ?? 22);
  const [duration,setDuration]=useState(loadSettings().defaultDuration ?? 60);
  const [raceQuality,setRaceQuality]=useState(loadSettings().raceQuality ?? 'high');

  useEffect(()=>{
    saveSettings({soundOn:sound,passageSize,defaultDuration:duration,raceQuality});
  },[sound,passageSize,duration,raceQuality]);

  const clearHistory = ()=>{
    if(window.confirm('Clear all typing history?')) localStorage.removeItem(HISTORY_KEY);
  };

  return (
    <div className="container" style={{paddingTop:'2rem',maxWidth:720}}>
      <h2 className="neon-text">Settings</h2>
      <div className="card glass">
        <div className="grid" style={{gap:'1.25rem'}}>
          <div>
            <label className="label">Theme</label>
            <button className="btn" onClick={toggleTheme}>{theme==='dark'?'Switch to Light':'Switch to Dark'}</button>
          </div>
          <div>
            <label className="label">Typing sound</label>
            <input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)} />
          </div>
          <div>
            <label className="label">Reduced motion</label>
            <input type="checkbox" checked={reducedMotion} onChange={e=>setReducedMotion(e.target.checked)} />
          </div>
          <div>
            <label className="label">Passage font size</label>
            <select className="input" value={passageSize} onChange={e=>setPassageSize(Number(e.target.value))}>
              {[18,20,22,24,26,28,32].map(s=> <option key={s} value={s}>{s}px</option>)}
            </select>
          </div>
          <div>
            <label className="label">3D race graphics</label>
            <select className="input" value={raceQuality} onChange={e=>setRaceQuality(e.target.value)}>
              <option value="high">High: reflections, shadows, bloom</option>
              <option value="low">Low: for slower computers</option>
            </select>
          </div>
          <div>
            <label className="label">Default duration</label>
            <select className="input" value={duration} onChange={e=>setDuration(Number(e.target.value))}>
              {[15,30,60,120].map(d=> <option key={d} value={d}>{d}s</option>)}
            </select>
          </div>
          <div>
            <button className="btn" onClick={clearHistory} style={{background:'#ef4444'}}>Clear typing history</button>
          </div>
        </div>
      </div>
    </div>
  );
}
