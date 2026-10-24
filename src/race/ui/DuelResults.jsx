import { motion } from 'framer-motion';
import { RotateCcw, SlidersHorizontal, BarChart3, Trophy, Cpu, User } from 'lucide-react';

const fmtDist = (m)=> m>=1000 ? `${(m/1000).toFixed(2)} km` : `${Math.round(m)} m`;

function marginText(outcome){
  const m = outcome.margin;
  if(outcome.winner==='draw') return 'Dead heat: identical progress.';
  const who = outcome.winner==='player' ? 'You' : 'The AI';
  if(m.seconds) return `${who} crossed the line ${m.seconds.toFixed(1)} s earlier.`;
  return `${who} finished ${m.chars} character${m.chars===1?'':'s'} ahead (≈ ${Math.round(m.meters)} m).`;
}

function Column({ icon:Icon, name, tag, s, win }){
  return (
    <div className={`dr-col ${win?'is-win':''}`}>
      <header><Icon size={14}/> <b>{name}</b> <span>{tag}</span>{win && <Trophy size={14} className="dr-cup"/>}</header>
      <dl>
        <div><dt>WPM</dt><dd className="big">{s.wpm}</dd></div>
        <div><dt>Accuracy</dt><dd>{s.accuracy}%</dd></div>
        <div><dt>Completed</dt><dd>{s.completed}/{s.length}</dd></div>
        <div><dt>Progress</dt><dd>{Math.round(s.completed/s.length*100)}%</dd></div>
        <div><dt>Distance</dt><dd>{fmtDist(s.distance)}</dd></div>
        <div><dt>Top speed</dt><dd>{s.topSpeedKmh} km/h</dd></div>
      </dl>
    </div>
  );
}

export default function DuelResults({ outcome, player, ai, aiLevel, saved, onRaceAgain, onChangeDifficulty, onViewResults }){
  const title = outcome.winner==='player' ? 'Player wins' : outcome.winner==='ai' ? 'AI wins' : 'Draw';
  return (
    <motion.div className="rr-backdrop duel-rr" initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.5 }}>
      <motion.div className="rr-panel dr-panel" role="dialog" aria-label="Race result"
        initial={{ y:30, opacity:0, scale:0.97 }} animate={{ y:0, opacity:1, scale:1 }}
        transition={{ delay:0.15, duration:0.5, ease:[0.2,0.8,0.2,1] }}>
        <span className="rr-kicker">1v1 vs AI · {aiLevel.label}</span>
        <motion.h2 className={`dr-title w-${outcome.winner}`}
          initial={{ letterSpacing:'0.3em', opacity:0 }} animate={{ letterSpacing:'0.02em', opacity:1 }}
          transition={{ delay:0.3, duration:0.6 }}>
          {title}
        </motion.h2>
        <p className="dr-margin">{marginText(outcome)}</p>
        <div className="dr-cols">
          <Column icon={User} name="You" tag="Player" s={player} win={outcome.winner==='player'} />
          <Column icon={Cpu} name={`AI · ${aiLevel.label}`} tag="Computer" s={ai} win={outcome.winner==='ai'} />
        </div>
        {!saved && <p className="dr-note">No keys typed, so this race was not saved to your history.</p>}
        <div className="rr-actions">
          <button type="button" className="rc-btn primary" onClick={onRaceAgain} autoFocus><RotateCcw size={16}/> Race again</button>
          <button type="button" className="rc-btn" onClick={onChangeDifficulty}><SlidersHorizontal size={16}/> Change difficulty</button>
          <button type="button" className="rc-btn ghost" onClick={onViewResults} disabled={!saved}><BarChart3 size={16}/> Results</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
