import { useEffect, useRef } from 'react';
import { Volume2, VolumeX, Sparkles, Feather, Cpu, User } from 'lucide-react';
import { speedToKmh } from '../raceEngine';
import { formatTime } from '../../utils/typingCalculations';

const fmtDist = (m)=> m>=1000 ? `${(m/1000).toFixed(2)} km` : `${Math.round(m)} m`;

/*
 * 1v1 HUD. Player WPM/accuracy/characters arrive as React props (they change
 * on keystrokes). Everything driven by the simulation — both speeds, AI stats,
 * leader, gap, rail markers, overtake toasts — is written to the DOM from the
 * per-frame engine emit, so the HUD never re-renders at frame rate.
 */
export default function DuelHUD({
  engine, opponent, aiLevel, player, timeLeft, phase,
  audioOn, onToggleAudio, quality, onToggleQuality,
}){
  const r = useRef({});
  const set = (k)=> (el)=>{ r.current[k] = el; };

  useEffect(()=>{
    let last = 0, lastToastAt = null, lastAiFinished = false;
    const refs = r.current;
    const text = (k, v)=>{ const el = refs[k]; if(el && el.textContent!==v) el.textContent = v; };
    return engine.subscribe((e)=>{
      const { typist, engine:ai } = opponent;
      if(refs.flash) refs.flash.style.opacity = String(e.errorFlash*0.8);
      if(refs.pNitro) refs.pNitro.style.transform = `scaleX(${e.nitro/100})`;
      const len = typist.length || 1;
      const aiPct = typist.completed/len;
      const pPct = e.completed/len;
      if(refs.aiBar) refs.aiBar.style.transform = `scaleX(${aiPct})`;
      if(refs.railAi) refs.railAi.style.left = `${aiPct*100}%`;
      if(refs.railP) refs.railP.style.left = `${pPct*100}%`;

      const now = performance.now();
      if(now-last < 90) return;
      last = now;
      text('pKmh', String(Math.round(speedToKmh(e.speed))));
      text('pDist', fmtDist(e.distance));
      text('aiKmh', String(Math.round(speedToKmh(ai.speed))));
      text('aiDist', fmtDist(ai.distance));
      text('aiWpm', String(typist.wpm()));
      text('aiAcc', `${typist.accuracy()}%`);
      text('aiChars', `${typist.completed}/${len}`);
      text('aiPct', `${Math.round(aiPct*100)}%`);

      const diff = Math.abs(typist.completed - e.completed);
      const leader = opponent.leader;
      text('leader', leader==='player' ? 'You lead' : leader==='ai' ? 'AI leads' : 'Level');
      text('gap', leader==='even' ? '±0 chars' : `+${diff} char${diff===1?'':'s'}`);
      if(refs.leaderBox) refs.leaderBox.dataset.leader = leader;
      if(refs.root){
        refs.root.dataset.leader = leader;
        refs.root.classList.toggle('nitro-on', e.nitroTime>0);
      }

      const ov = opponent.lastOvertake;
      if(ov && ov.at!==lastToastAt && refs.toast){
        lastToastAt = ov.at;
        refs.toast.textContent = ov.by==='player' ? 'Overtake! You take the lead' : 'Overtaken. AI takes the lead';
        refs.toast.dataset.by = ov.by;
        refs.toast.classList.remove('show'); void refs.toast.offsetWidth; refs.toast.classList.add('show');
      }
      const aiFinished = typist.phase==='finished';
      if(aiFinished!==lastAiFinished && refs.aiDone){
        lastAiFinished = aiFinished;
        refs.aiDone.hidden = !aiFinished || e.phase!=='racing';
      }
      if(refs.aiDone && e.phase!=='racing') refs.aiDone.hidden = true;
    });
  },[engine, opponent]);

  const status = phase==='racing' || phase==='paused' ? (phase==='paused' ? 'Paused' : 'Racing') : phase==='finished' ? 'Finished' : 'Starting';
  const live = phase!=='ready';
  const pPct = player.length ? player.completed/player.length : 0;

  return (
    <div ref={set('root')} className={`hud duel ${live?'is-live':''}`}>
      <div ref={set('flash')} className="hud-flash" />

      <div className="duel-top">
        <div className="duel-status">
          <span className={`duel-pill s-${status.toLowerCase()}`}>{status}</span>
          <span className={`duel-time ${timeLeft<=5 && phase==='racing' ? 'is-low':''}`}>{formatTime(timeLeft)}</span>
        </div>
        <div className="duel-rail" aria-hidden="true">
          <span ref={set('railP')} className="rail-dot p" />
          <span ref={set('railAi')} className="rail-dot ai" />
          <span className="rail-flag" />
        </div>
        <div ref={set('leaderBox')} className="duel-leader" data-leader="even">
          <b ref={set('leader')}>Level</b><span ref={set('gap')}>±0 chars</span>
        </div>
        <div ref={set('toast')} className="duel-toast" role="status" />
        <div ref={set('aiDone')} className="duel-aidone" hidden>AI crossed the line. Keep racing for your best result</div>
      </div>

      <div className="hud-tr">
        <button type="button" className="hud-icon" onClick={onToggleAudio} aria-pressed={audioOn} title={audioOn?'Mute engine audio':'Enable engine audio'}>
          {audioOn ? <Volume2 size={16}/> : <VolumeX size={16}/>}
        </button>
        <button type="button" className="hud-icon" onClick={onToggleQuality} title={quality==='high'?'Switch to low graphics':'Switch to high graphics'}>
          {quality==='high' ? <Sparkles size={16}/> : <Feather size={16}/>}
          <span className="hud-icon-text">{quality==='high'?'High':'Low'}</span>
        </button>
      </div>

      <section className="racer-card p" aria-label="Player stats">
        <header><User size={13}/> <b>You</b><span className="racer-tag">Player</span></header>
        <div className="racer-wpm">{player.wpm}<small>WPM</small></div>
        <dl>
          <div><dt>Acc</dt><dd>{player.accuracy}%</dd></div>
          <div><dt>km/h</dt><dd ref={set('pKmh')}>0</dd></div>
          <div><dt>Chars</dt><dd>{player.completed}/{player.length}</dd></div>
          <div><dt>Dist</dt><dd ref={set('pDist')}>0 m</dd></div>
        </dl>
        <div className="racer-progress"><i><span style={{ transform:`scaleX(${pPct})` }} /></i><em>{Math.round(pPct*100)}%</em></div>
        <div className="racer-nitro"><span>Nitro</span><i><b ref={set('pNitro')} /></i></div>
      </section>

      <section className="racer-card ai" aria-label="AI opponent stats">
        <header><Cpu size={13}/> <b>AI · {aiLevel.label}</b><span className="racer-tag">Computer</span></header>
        <div className="racer-wpm"><span ref={set('aiWpm')}>0</span><small>WPM</small></div>
        <dl>
          <div><dt>Acc</dt><dd ref={set('aiAcc')}>100%</dd></div>
          <div><dt>km/h</dt><dd ref={set('aiKmh')}>0</dd></div>
          <div><dt>Chars</dt><dd ref={set('aiChars')}>0/0</dd></div>
          <div><dt>Dist</dt><dd ref={set('aiDist')}>0 m</dd></div>
        </dl>
        <div className="racer-progress"><i><span ref={set('aiBar')} /></i><em ref={set('aiPct')}>0%</em></div>
      </section>
    </div>
  );
}
