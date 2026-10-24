import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Check, Crown, Play, Skull, Trophy, Flag, Info, Cpu, Timer, Gauge, Target, RotateCcw, AlertTriangle } from 'lucide-react';
import { CAMPAIGN_LEVELS, LEVEL_COUNT } from '../campaign/levels';
import { levelStatus } from '../campaign/campaignStore';
import { useCampaign } from '../campaign/useCampaign';
import { DEFEAT_REASONS } from '../campaign/feedback';

// Node positions on the map (percent of the map box): a winding road.
const NODES = [
  { x:10, y:72 }, { x:30, y:34 }, { x:50, y:66 }, { x:70, y:30 }, { x:88, y:58 },
];
const PATH = 'M 10 72 C 18 72, 21 34, 30 34 S 42 66, 50 66 S 62 30, 70 30 S 82 58, 88 58';

const fmtDuration = (ms)=>{
  const m = Math.round(ms/60000);
  return m < 60 ? `${m} min` : `${Math.floor(m/60)} h ${m%60} min`;
};

export function OpponentAvatar({ level, size=56 }){
  return (
    <span className="cp-avatar" style={{ '--c':level.opponent.color, width:size, height:size, fontSize:size*0.38 }}>
      {level.boss ? <Crown size={size*0.42}/> : level.opponent.name[0]}
    </span>
  );
}

export default function CampaignHub(){
  const { state, newCampaign } = useCampaign();
  const navigate = useNavigate();
  const { run, stats, lastEvent } = state;
  const complete = run.status==='completed';
  const [selected, setSelected] = useState(complete ? LEVEL_COUNT : run.level);
  const sel = CAMPAIGN_LEVELS[selected-1] || CAMPAIGN_LEVELS[0];
  const selStatus = levelStatus(state, sel.level);
  const clearedHere = run.cleared.find(c=> c.level===sel.level);
  const progressPct = (run.cleared.length / LEVEL_COUNT) * 100;
  const lastCompletion = stats.completions[stats.completions.length-1];

  // Portion of the road that's been ridden, for the glowing overlay.
  const ridden = useMemo(()=> Math.min(1, run.cleared.length/(LEVEL_COUNT-1)), [run.cleared.length]);

  const start = ()=> navigate(`/campaign/race/${run.level}`);

  return (
    <div className="cp container">
      <header className="cp-head">
        <div>
          <span className="db-kicker">Campaign</span>
          <h1>Road to Apex</h1>
          <p>Beat five AI riders in a row. Lose once and you start again from Level 1.</p>
        </div>
        {!complete && (
          <button type="button" className="rc-btn primary lg" onClick={start}>
            <Play size={18}/> {run.level===1 && run.cleared.length===0 ? 'Start Level 1' : `Continue · Level ${run.level}`}
          </button>
        )}
      </header>

      <section className="cp-stats" aria-label="Campaign stats">
        <div className="cp-stat wide">
          <span>Current run</span>
          <b>{complete ? 'Completed' : <>Level {run.level}<small> / {LEVEL_COUNT}</small></>}</b>
          <div className="cp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={LEVEL_COUNT} aria-valuenow={run.cleared.length}><i style={{ width:`${progressPct}%` }} /></div>
        </div>
        <div className="cp-stat"><span>Wins</span><b>{stats.wins}</b></div>
        <div className="cp-stat"><span>Losses</span><b>{stats.losses}</b></div>
        <div className="cp-stat"><span>Best level cleared</span><b>{stats.bestLevelCleared || '–'}</b></div>
        <div className="cp-stat"><span>Campaigns won</span><b>{stats.completions.length}</b></div>
      </section>

      {lastEvent?.type==='failed' && !complete && (
        <div className="cp-banner fail" role="status">
          <Skull size={18}/>
          <div><strong>Campaign failed at Level {lastEvent.level}, back to Level 1.</strong> <span>{DEFEAT_REASONS[lastEvent.reason] || ''}</span></div>
        </div>
      )}
      {lastEvent?.type==='cleared' && !complete && (
        <div className="cp-banner ok" role="status">
          <Check size={18}/><div><strong>Level {lastEvent.level} cleared.</strong> <span>Level {lastEvent.level+1} is unlocked.</span></div>
        </div>
      )}
      {complete && (
        <div className="cp-champ-banner">
          <Crown size={26}/>
          <div>
            <strong>Apex Champion</strong>
            <span>You cleared all {LEVEL_COUNT} levels{lastCompletion ? ` in ${fmtDuration(lastCompletion.durationMs)} · avg ${lastCompletion.avgWpm} WPM` : ''}.</span>
          </div>
          <button type="button" className="rc-btn primary" onClick={()=>{ newCampaign(); setSelected(1); }}><RotateCcw size={16}/> Start new campaign</button>
        </div>
      )}

      <div className="cp-main">
        <section className="cp-map" aria-label="Campaign map">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d={PATH} className="cp-road" />
            <path d={PATH} className="cp-road-dash" />
            <path d={PATH} className="cp-road-done" pathLength="1" style={{ strokeDasharray:`${ridden} 1` }} />
          </svg>
          {CAMPAIGN_LEVELS.map((lvl, i)=>{
            const st = levelStatus(state, lvl.level);
            const Icon = st==='locked' ? Lock : st==='completed' ? Check : lvl.boss ? Crown : Flag;
            return (
              <button key={lvl.level} type="button"
                className={`cp-node s-${st} ${lvl.boss?'boss':''} ${selected===lvl.level?'is-selected':''}`}
                style={{ left:`${NODES[i].x}%`, top:`${NODES[i].y}%`, '--c':lvl.opponent.color }}
                onClick={()=> setSelected(lvl.level)}
                aria-label={`Level ${lvl.level}: ${lvl.name}, ${st}${lvl.boss ? ', boss' : ''}`}
                aria-pressed={selected===lvl.level}>
                <span className="cp-node-ring"><Icon size={lvl.boss ? 22 : 18}/></span>
                <span className="cp-node-label"><b>{lvl.level}</b> {lvl.name}</span>
              </button>
            );
          })}
        </section>

        <aside className={`cp-card s-${selStatus} ${sel.boss?'boss':''}`} style={{ '--c':sel.opponent.color }} aria-live="polite">
          <div className="cp-card-top">
            <OpponentAvatar level={sel} />
            <div>
              <span className="cp-card-level">Level {sel.level}{sel.boss ? ' · Final boss' : ''}</span>
              <h2>{sel.opponent.name}</h2>
              <span className="cp-ai-tag"><Cpu size={12}/> AI opponent · {sel.opponent.handle}</span>
            </div>
          </div>
          <p className="cp-intro">{sel.opponent.intro}</p>
          <dl className="cp-specs">
            <div><dt><Gauge size={13}/> Target pace</dt><dd>~{sel.ai.target} WPM</dd></div>
            <div><dt><Target size={13}/> Accuracy</dt><dd>~{Math.round(sel.ai.accuracy*100)}%</dd></div>
            <div><dt><Timer size={13}/> Race</dt><dd>{sel.duration}s</dd></div>
            <div><dt><Flag size={13}/> Track</dt><dd>{sel.theme.name}</dd></div>
          </dl>
          <div className="cp-tier">{sel.tier} · {sel.name}</div>
          {selStatus==='current' && (
            <button type="button" className="rc-btn primary cp-cta" onClick={start}><Play size={17}/> Race {sel.opponent.name}</button>
          )}
          {selStatus==='locked' && (
            <p className="cp-locked"><Lock size={15}/> Win Level {sel.level-1} to unlock.</p>
          )}
          {selStatus==='completed' && (
            <p className="cp-cleared"><Check size={15}/> {clearedHere ? `Cleared this run · ${clearedHere.wpm} WPM, ${clearedHere.accuracy}% accuracy` : 'Cleared'}</p>
          )}
        </aside>
      </div>

      <section className="cp-rules">
        <h3><AlertTriangle size={16}/> Campaign rules</h3>
        <ul>
          <li>Levels unlock one at a time. Win to open the next one.</li>
          <li><strong>Any defeat resets the campaign to Level 1.</strong> Leaving or refreshing mid-race counts as a defeat.</li>
          <li>You and the AI share the same passage, countdown and clock. Whoever has typed more of the passage correctly when time runs out wins; finishing it first wins outright. A tie goes to the AI.</li>
          <li>Opponents are computer-controlled AI, not real players, and never appear on the leaderboard.</li>
        </ul>
        {stats.titles.length>0 && <p className="cp-titles"><Trophy size={15}/> Titles earned: {stats.titles.join(', ')}</p>}
        <p className="cp-note"><Info size={14}/> Progress is saved in this browser only, for this account ({state.stats.attempts} races so far). It isn't synced to other devices and isn't protected against editing.</p>
        <p className="cp-note"><Link to="/racing">Free race</Link> and <Link to="/typing">typing tests</Link> aren't affected by the campaign.</p>
      </section>
    </div>
  );
}
