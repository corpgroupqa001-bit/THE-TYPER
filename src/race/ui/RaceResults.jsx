import { motion } from 'framer-motion';
import { RotateCcw, BarChart3, Trophy, TrendingUp, TrendingDown, Award } from 'lucide-react';

function Stat({ label, value, unit }){
  return (
    <div className="rr-stat">
      <span>{label}</span>
      <b>{value}{unit && <small>{unit}</small>}</b>
    </div>
  );
}

export default function RaceResults({ result, previousBest, badge, saved, onRaceAgain, onViewResults }){
  const isPB = saved && (previousBest==null || result.wpm>previousBest);
  const delta = previousBest==null ? null : result.wpm - previousBest;
  const dist = result.distance>=1000 ? [(result.distance/1000).toFixed(2),'km'] : [Math.round(result.distance),'m'];

  return (
    <motion.div className="rr-backdrop" initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.5 }}>
      <motion.div
        className="rr-panel" role="dialog" aria-label="Race results"
        initial={{ y:30, opacity:0, scale:0.97 }} animate={{ y:0, opacity:1, scale:1 }}
        transition={{ delay:0.15, duration:0.5, ease:[0.2,0.8,0.2,1] }}
      >
        <div className="rr-head">
          <span className="rr-kicker">Race complete</span>
          {isPB && <span className="rr-pb"><Trophy size={14}/> New personal best</span>}
        </div>

        <div className="rr-main">
          <div className="rr-wpm">
            <b>{result.wpm}</b>
            <span>net WPM</span>
          </div>
          <div className={`rr-badge tone-${badge.tone}`}>
            <Award size={18}/>
            <div>
              <strong>{badge.name}{badge.extra && <em> · {badge.extra}</em>}</strong>
              <p>{badge.note}</p>
            </div>
          </div>
        </div>

        <div className="rr-grid">
          <Stat label="Accuracy" value={result.accuracy} unit="%" />
          <Stat label="Distance" value={dist[0]} unit={dist[1]} />
          <Stat label="Top speed" value={result.topSpeedKmh} unit="km/h" />
          <Stat label="Gross WPM" value={result.grossWpm} />
          <Stat label="Correct / errors" value={`${result.correctChars} / ${result.errorChars}`} />
          <Stat label="Time" value={result.elapsedSeconds} unit="s" />
        </div>

        <div className="rr-compare">
          {!saved ? 'No keys typed — this run was not saved.'
            : previousBest==null ? 'First race on record. This is your benchmark.'
            : delta>0 ? <><TrendingUp size={14}/> {delta} WPM above your previous best ({previousBest}).</>
            : delta===0 ? <>Matched your personal best of {previousBest} WPM.</>
            : <><TrendingDown size={14}/> {Math.abs(delta)} WPM below your best of {previousBest}.</>}
        </div>

        <div className="rr-actions">
          <button type="button" className="rc-btn primary" onClick={onRaceAgain} autoFocus><RotateCcw size={16}/> Race again</button>
          <button type="button" className="rc-btn" onClick={onViewResults} disabled={!saved}><BarChart3 size={16}/> View results</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
