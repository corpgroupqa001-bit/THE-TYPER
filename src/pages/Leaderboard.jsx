import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Medal, Crown, Bike, Keyboard, Info, ArrowUp } from 'lucide-react';
import Segmented from '../components/Segmented';
import { loadHistory } from '../utils/storage';
import { useAuth } from '../context/AuthContext';
import { buildRanking } from '../utils/leaderboard';

const PERIODS = [{ id:'day', label:'Today' }, { id:'week', label:'This week' }, { id:'all', label:'All time' }];
const KINDS = [{ id:'all', label:'All tests' }, { id:'typing', label:'Typing test' }, { id:'race', label:'3D race' }];
const TOP = 10;

function Avatar({ name, you }){
  return <span className={`lb-avatar ${you?'you':''}`}>{(name||'?')[0].toUpperCase()}</span>;
}

function PlayerName({ p }){
  return (
    <span className="lb-name">
      <Avatar name={p.name} you={p.you} />
      <span className="lb-name-text">{p.name}</span>
      {p.you && <span className="lb-tag you">You</span>}
      {p.demo && <span className="lb-tag">Demo</span>}
    </span>
  );
}

export default function Leaderboard(){
  const { user } = useAuth();
  const [period, setPeriod] = useState('all');
  const [kind, setKind] = useState('all');
  const myId = user?.id || 'guest';
  const history = useMemo(()=> loadHistory(), []);

  const ranking = useMemo(()=> buildRanking(history, { period, kind, myId, myName:user?.name || 'Guest' }),
    [history, period, kind, myId, user?.name]);

  const me = ranking.find(p=> p.you);
  const ahead = me && me.rank>1 ? ranking[me.rank-2] : null;
  const top = ranking.slice(0, TOP);
  const podium = top.slice(0, 3);
  const rest = top.slice(3);
  const meOutsideTop = me && me.rank > TOP;
  const periodLabel = PERIODS.find(p=> p.id===period).label.toLowerCase();

  return (
    <div className="lb container">
      <header className="lb-head">
        <div>
          <span className="db-kicker">Leaderboard</span>
          <h1>Top typists</h1>
          <p>Ranked by best net WPM; ties go to the higher accuracy.</p>
        </div>
        <div className="lb-filters">
          <Segmented label="Period" value={period} options={PERIODS} onChange={setPeriod} />
          <Segmented label="Tests" value={kind} options={KINDS} onChange={setKind} />
        </div>
      </header>

      <section className={`lb-me ${me ? '' : 'empty'}`} aria-label="Your standing">
        {me ? (
          <>
            <div className="lb-me-rank"><span>Your rank</span><b>#{me.rank}</b><small>of {ranking.length}</small></div>
            <div className="lb-me-stats">
              <div><span>Best</span><b>{me.wpm} <small>WPM</small></b></div>
              <div><span>Accuracy</span><b>{me.accuracy}%</b></div>
              <div><span>Tests</span><b>{me.tests}</b></div>
            </div>
            <div className="lb-me-next">
              {ahead ? (
                <><ArrowUp size={15}/> <span><b>{ahead.wpm - me.wpm + 1} WPM</b> more to pass {ahead.name} (#{ahead.rank})</span></>
              ) : (
                <><Crown size={15}/> <span>You're number one {period==='all' ? 'of all time' : periodLabel}. Defend it!</span></>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="lb-me-empty">
              <strong>You're not on the board {period==='all' ? 'yet' : periodLabel}</strong>
              <span>Finish a {kind==='race' ? 'race' : kind==='typing' ? 'typing test' : 'typing test or race'} to get your rank.</span>
            </div>
            <div className="db-actions">
              {kind!=='race' && <Link to="/typing" className="rc-btn"><Keyboard size={16}/> Typing test</Link>}
              {kind!=='typing' && <Link to="/racing" className="rc-btn primary"><Bike size={16}/> Start a race</Link>}
            </div>
          </>
        )}
      </section>

      <section className="lb-podium" aria-label="Top three">
        {podium.map(p=>(
          <div key={p.id} className={`lb-pod place-${p.rank} ${p.you?'is-you':''}`}>
            <div className="lb-pod-icon">{p.rank===1 ? <Crown size={20}/> : <Medal size={20}/>}</div>
            <span className="lb-pod-rank">#{p.rank}</span>
            <Avatar name={p.name} you={p.you} />
            <strong>{p.name}{p.demo && <span className="lb-tag">Demo</span>}{p.you && <span className="lb-tag you">You</span>}</strong>
            <div className="lb-pod-wpm">{p.wpm}<small>WPM</small></div>
            <span className="lb-pod-acc">{p.accuracy}% accuracy</span>
          </div>
        ))}
      </section>

      <section className="db-card" aria-label="Rankings">
        <div className="db-table-wrap">
          <table className="db-table lb-table">
            <thead>
              <tr><th className="rank">Rank</th><th>Player</th><th className="num">WPM</th><th className="num">Accuracy</th><th className="num hide-sm">Tests</th></tr>
            </thead>
            <tbody>
              {rest.map(p=>(
                <tr key={p.id} className={p.you ? 'is-you' : ''}>
                  <td className="rank">{p.rank}</td>
                  <td><PlayerName p={p} /></td>
                  <td className="num strong">{p.wpm}</td>
                  <td className="num">{p.accuracy}%</td>
                  <td className="num muted hide-sm">{p.tests}</td>
                </tr>
              ))}
              {meOutsideTop && (
                <>
                  <tr className="lb-gap"><td colSpan={5}>⋯</td></tr>
                  <tr className="is-you">
                    <td className="rank">{me.rank}</td>
                    <td><PlayerName p={me} /></td>
                    <td className="num strong">{me.wpm}</td>
                    <td className="num">{me.accuracy}%</td>
                    <td className="num muted hide-sm">{me.tests}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="lb-note">
        <Info size={14}/> Players marked <span className="lb-tag">Demo</span> are sample data. Real scores come from tests completed in this browser{user?.isGuest || !user ? '; log in to rank under your own name' : ''}.
        {' '}Your best result in the selected period counts.
      </p>
    </div>
  );
}
