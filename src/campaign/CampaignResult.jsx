import { motion } from 'framer-motion';
import { Trophy, Skull, Crown, ArrowRight, RotateCcw, Map as MapIcon, Award, Cpu, User, Info } from 'lucide-react';
import { CAMPAIGN_LEVELS, LEVEL_COUNT } from './levels';
import { DEFEAT_REASONS } from './feedback';

const fmtMs = (ms)=>{
  const s = Math.round(ms/1000);
  const m = Math.floor(s/60);
  return m ? `${m}m ${s%60}s` : `${s}s`;
};

function Compare({ player, ai, level }){
  const rows = [
    ['WPM', player.wpm, ai.wpm],
    ['Accuracy', `${player.accuracy}%`, `${ai.accuracy}%`],
    ['Completed', `${player.completed}/${player.length}`, `${ai.completed}/${ai.length}`],
    ['Mistakes', player.keystrokes - player.correctKeystrokes, ai.mistakes],
  ];
  return (
    <table className="cr-compare">
      <thead><tr><th/><th><User size={13}/> You</th><th style={{ color:level.opponent.color }}><Cpu size={13}/> {level.opponent.name} <small>AI</small></th></tr></thead>
      <tbody>{rows.map(([k,a,b])=> <tr key={k}><th>{k}</th><td>{a}</td><td>{b}</td></tr>)}</tbody>
    </table>
  );
}

// Lightweight CSS particle burst for wins (skipped with reduced motion).
function Burst({ colors }){
  return (
    <div className="cr-burst" aria-hidden="true">
      {Array.from({ length:28 }, (_,i)=>(
        <i key={i} style={{ '--a':`${(i/28)*360}deg`, '--d':`${90 + (i%5)*28}px`, '--c':colors[i%colors.length], animationDelay:`${(i%7)*40}ms` }} />
      ))}
    </div>
  );
}

export default function CampaignResult({ result, level, reducedMotion, onNext, onRestart, onMap, onNewCampaign }){
  const { kind, player, ai, feedback, completion, outcome } = result;
  const next = CAMPAIGN_LEVELS[level.level];   // level numbers are 1-based

  const panelAnim = reducedMotion ? {} : {
    initial: kind==='defeat' ? { opacity:0, scale:1.06 } : { opacity:0, y:30, scale:0.96 },
    animate: kind==='defeat' ? { opacity:1, scale:1, x:[0,-10,10,-6,6,0] } : { opacity:1, y:0, scale:1 },
    transition: { duration: kind==='defeat' ? 0.6 : 0.55, ease:[0.2,0.8,0.2,1] },
  };

  return (
    <motion.div className={`cr-backdrop k-${kind}`} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.4 }}>
      <motion.div className={`cr-panel k-${kind}`} role="dialog" aria-modal="true" aria-labelledby="cr-title" {...panelAnim}>
        {(kind==='victory' || kind==='champion') && !reducedMotion && <Burst colors={kind==='champion' ? ['#facc15','#f59e0b','#fde68a','#ef4444'] : [level.opponent.color,'#22d3ee','#a855f7']} />}

        {kind==='stale' && (
          <>
            <Info size={30} className="cr-icon"/>
            <h2 id="cr-title" className="cr-title">Race already recorded</h2>
            <p className="cr-sub">This race was settled elsewhere (another tab, or the page was reloaded), so this result wasn't counted again.</p>
            <div className="rr-actions"><button type="button" className="rc-btn primary" onClick={onMap} autoFocus><MapIcon size={16}/> Campaign map</button></div>
          </>
        )}

        {kind==='victory' && (
          <>
            <span className="cr-kicker">Level {level.level} cleared</span>
            <h2 id="cr-title" className="cr-title win"><Trophy size={30}/> Victory</h2>
            <p className="cr-sub">{level.victory}</p>
            <Compare player={player} ai={ai} level={level} />
            <ul className="cr-tips">{feedback.map((t,i)=> <li key={i}>{t}</li>)}</ul>
            {next && (
              <div className="cr-next" style={{ '--c':next.opponent.color }}>
                <span>Unlocked</span>
                <strong>Level {next.level}: {next.name}{next.boss ? ' (final boss)' : ''}</strong>
                <small>vs {next.opponent.name} (AI) · ~{next.ai.target} WPM · {next.theme.name}</small>
              </div>
            )}
            <div className="rr-actions">
              <button type="button" className="rc-btn primary" onClick={onNext} autoFocus><ArrowRight size={16}/> Race Level {level.level+1}</button>
              <button type="button" className="rc-btn" onClick={onMap}><MapIcon size={16}/> Campaign map</button>
            </div>
          </>
        )}

        {kind==='defeat' && (
          <>
            <Skull size={34} className="cr-icon bad"/>
            <h2 id="cr-title" className="cr-title fail">Campaign failed — back to Level 1</h2>
            <p className="cr-sub"><strong>{level.opponent.name}</strong> (AI, Level {level.level}) wins. {DEFEAT_REASONS[outcome.reason]}</p>
            <div className="cr-facts">
              <span><b>{player.wpm}</b> WPM</span>
              <span><b>{player.accuracy}%</b> accuracy</span>
              <span><b>{player.elapsedSeconds}s</b> raced</span>
              <span><b>{player.completed}/{player.length}</b> chars</span>
            </div>
            <Compare player={player} ai={ai} level={level} />
            <ul className="cr-tips">{feedback.map((t,i)=> <li key={i}>{t}</li>)}</ul>
            <p className="cr-reset-note">Your current campaign progress has been reset. Your history, best level and other game modes are unchanged.</p>
            <div className="rr-actions">
              <button type="button" className="rc-btn primary" onClick={onRestart} autoFocus><RotateCcw size={16}/> Restart at Level 1</button>
              <button type="button" className="rc-btn" onClick={onMap}><MapIcon size={16}/> Campaign map</button>
            </div>
          </>
        )}

        {kind==='champion' && (
          <>
            <motion.div className="cr-crown" initial={reducedMotion ? false : { scale:0, rotate:-20 }} animate={{ scale:1, rotate:0 }} transition={{ delay:0.25, type:'spring', stiffness:180, damping:12 }}>
              <Crown size={40}/>
            </motion.div>
            <span className="cr-kicker gold">Campaign complete</span>
            <h2 id="cr-title" className="cr-title champ">Apex Champion</h2>
            <p className="cr-sub">{level.victory}</p>
            <div className="cr-badge"><Award size={18}/> Title earned: <strong>Apex Champion</strong> · Campaign completion badge</div>
            {completion && (
              <>
                <div className="cr-facts">
                  <span><b>{completion.avgWpm}</b> avg WPM</span>
                  <span><b>{completion.avgAccuracy}%</b> avg accuracy</span>
                  <span><b>{fmtMs(completion.durationMs)}</b> total time</span>
                  <span><b>{LEVEL_COUNT}/{LEVEL_COUNT}</b> levels</span>
                </div>
                <table className="cr-levels">
                  <thead><tr><th>Level</th><th>Opponent</th><th>WPM</th><th>Acc</th></tr></thead>
                  <tbody>{completion.levels.map(c=>{
                    const l = CAMPAIGN_LEVELS[c.level-1];
                    return <tr key={c.level}><td>{c.level}</td><td style={{ color:l.opponent.color }}>{l.opponent.name}</td><td>{c.wpm}</td><td>{c.accuracy}%</td></tr>;
                  })}</tbody>
                </table>
              </>
            )}
            <div className="rr-actions">
              <button type="button" className="rc-btn primary" onClick={onNewCampaign} autoFocus><RotateCcw size={16}/> Start new campaign</button>
              <button type="button" className="rc-btn" onClick={onMap}><MapIcon size={16}/> Campaign map</button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
