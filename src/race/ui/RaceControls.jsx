import { Flag, Pause, Play, RotateCcw, Shuffle } from 'lucide-react';
import Segmented from '../../components/Segmented';
import { DIFFICULTIES, DURATIONS, MODES } from '../../utils/sampleTexts';
import { AI_LEVELS } from '../aiTypist';

const RACE_MODES = [{ id:'duel', label:'vs AI' }, { id:'solo', label:'Solo' }];

export default function RaceControls({
  raceMode, onRaceMode, aiLevel, onAiLevel,
  phase, duration, mode, difficulty, onDuration, onMode, onDifficulty,
  onStart, onPause, onResume, onRestart, onFinish, onNewText, startLabel='Start Race',
}){
  const locked = phase==='countdown' || phase==='racing' || phase==='paused';
  return (
    <div className={`rc ${locked?'is-locked':''}`}>
      <div className="rc-settings">
        {onRaceMode && <Segmented label="Race" value={raceMode} disabled={locked} options={RACE_MODES} onChange={onRaceMode} />}
        {raceMode==='duel' && (
          <div className="seg-ai">
            <Segmented label="AI opponent" value={aiLevel} disabled={locked} options={Object.values(AI_LEVELS)} onChange={onAiLevel} />
          </div>
        )}
        <Segmented label="Duration" value={duration} disabled={locked}
          options={DURATIONS.map(d=>({ id:d, label:`${d}s` }))} onChange={onDuration} />
        <Segmented label="Text" value={mode} disabled={locked} options={MODES} onChange={onMode} />
        <Segmented label="Text difficulty" value={difficulty} disabled={locked}
          options={DIFFICULTIES.map(d=>({ id:d, label:d[0].toUpperCase()+d.slice(1) }))} onChange={onDifficulty} />
      </div>
      <div className="rc-actions">
        {(phase==='ready' || phase==='finished') && (
          <>
            {onNewText && <button type="button" className="rc-btn ghost" onClick={onNewText} title="New passage"><Shuffle size={16}/><span className="rc-hide-sm">New text</span></button>}
            <button type="button" className="rc-btn primary" onClick={onStart}><Play size={16}/> {startLabel}</button>
          </>
        )}
        {phase==='countdown' && <button type="button" className="rc-btn" onClick={onRestart}><RotateCcw size={16}/> Cancel</button>}
        {phase==='racing' && <button type="button" className="rc-btn" onClick={onPause} title="Pause (Esc)"><Pause size={16}/> Pause</button>}
        {phase==='paused' && <button type="button" className="rc-btn primary" onClick={onResume} title="Resume (Esc)"><Play size={16}/> Resume</button>}
        {(phase==='racing' || phase==='paused') && (
          <>
            <button type="button" className="rc-btn" onClick={onRestart}><RotateCcw size={16}/> Restart</button>
            <button type="button" className="rc-btn finish" onClick={onFinish}><Flag size={16}/> Finish</button>
          </>
        )}
      </div>
    </div>
  );
}
