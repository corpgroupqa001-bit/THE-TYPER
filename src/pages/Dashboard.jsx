import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Keyboard, Bike, Trophy, Target, Gauge, Flame, TrendingUp, TrendingDown, Minus, Cpu } from 'lucide-react';
import { loadHistory } from '../utils/storage';
import { useAuth } from '../context/AuthContext';

const DAILY_GOAL = 3;
const TREND_POINTS = 20;

const dayKey = (t)=> new Date(t).toDateString();
const avg = (arr, f)=> arr.length ? Math.round(arr.reduce((s,r)=> s+f(r), 0)/arr.length) : 0;

function sessionType(r){
  if(r.duel) return { label:`Race vs AI · ${cap(r.opponent?.level)}`, icon:Cpu };
  if(r.race) return { label:'3D Race', icon:Bike };
  return { label:'Typing Test', icon:Keyboard };
}
const cap = (s='')=> s ? s[0].toUpperCase()+s.slice(1) : '';

function relativeTime(t){
  const s = (Date.now()-t)/1000;
  if(s<60) return 'Just now';
  if(s<3600) return `${Math.floor(s/60)} min ago`;
  if(s<86400) return `${Math.floor(s/3600)} h ago`;
  if(s<172800) return 'Yesterday';
  return new Date(t).toLocaleDateString(undefined, { month:'short', day:'numeric' });
}

function streakDays(history){
  const days = new Set(history.map(r=> dayKey(r.date)));
  let streak = 0;
  const d = new Date();
  if(!days.has(d.toDateString())) d.setDate(d.getDate()-1);   // today not played yet: streak can still continue
  while(days.has(d.toDateString())){ streak++; d.setDate(d.getDate()-1); }
  return streak;
}

function Tile({ icon:Icon, label, value, unit, hint, children }){
  return (
    <div className="db-tile">
      <div className="db-tile-label"><Icon size={14}/> {label}</div>
      <div className="db-tile-value">{value}{unit && <small>{unit}</small>}</div>
      {hint && <div className="db-tile-hint">{hint}</div>}
      {children}
    </div>
  );
}

function Trend({ delta, unit }){
  if(delta==null) return <span className="db-trend flat">Not enough tests yet</span>;
  const Icon = delta>0 ? TrendingUp : delta<0 ? TrendingDown : Minus;
  const cls = delta>0 ? 'up' : delta<0 ? 'down' : 'flat';
  return <span className={`db-trend ${cls}`}><Icon size={13}/> {delta>0?'+':''}{delta}{unit} vs your earlier tests</span>;
}

function ChartTooltip({ active, payload, unit }){
  if(!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="db-tip">
      <b>{payload[0].value}{unit}</b>
      <span>{p.label} · {p.when}</span>
    </div>
  );
}

function TrendChart({ data, dataKey, unit, color, domain }){
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top:10, right:12, bottom:0, left:-12 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey="n" tickLine={false} axisLine={false} tick={{ fill:'var(--ink-3)', fontSize:11 }} interval="preserveStartEnd" />
        <YAxis tickLine={false} axisLine={false} tick={{ fill:'var(--ink-3)', fontSize:11 }} domain={domain} allowDecimals={false} width={44} />
        <Tooltip content={<ChartTooltip unit={unit}/>} cursor={{ stroke:'var(--line-2)' }} />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
          dot={{ r:3, strokeWidth:2, stroke:'var(--db-surface)', fill:color }}
          activeDot={{ r:5, strokeWidth:2, stroke:'var(--db-surface)', fill:color }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function Dashboard(){
  const { user } = useAuth();
  const history = useMemo(()=> loadHistory().filter(h=> h.userId===user?.id || user?.isGuest || !user), [user]);

  const s = useMemo(()=>{
    const recent10 = history.slice(0,10), earlier = history.slice(10,20);
    const best = history.reduce((b,r)=> !b || r.wpm>b.wpm ? r : b, null);
    const today = history.filter(r=> dayKey(r.date)===dayKey(Date.now())).length;
    const duels = history.filter(r=> r.duel);
    return {
      total: history.length,
      best,
      avgWpm: avg(recent10, r=>r.wpm),
      avgAcc: avg(recent10, r=>r.accuracy),
      wpmDelta: earlier.length>=3 ? avg(recent10, r=>r.wpm) - avg(earlier, r=>r.wpm) : null,
      accDelta: earlier.length>=3 ? avg(recent10, r=>r.accuracy) - avg(earlier, r=>r.accuracy) : null,
      today, streak: streakDays(history),
      duels: duels.length, wins: duels.filter(r=> r.outcome==='player').length,
    };
  },[history]);

  // Oldest → newest, numbered so the x-axis reads "test 1, 2, 3…".
  const trend = useMemo(()=> history.slice(0, TREND_POINTS).reverse().map((r,i)=>({
    n: i+1, wpm:r.wpm, accuracy:r.accuracy, label:sessionType(r).label, when:relativeTime(r.date),
  })), [history]);

  const name = user && !user.isGuest ? user.name : null;

  if(history.length===0){
    return (
      <div className="db container">
        <header className="db-head">
          <div><span className="db-kicker">Dashboard</span><h1>{name ? `Welcome, ${name}` : 'Your typing dashboard'}</h1></div>
        </header>
        <div className="db-empty">
          <Gauge size={34}/>
          <h2>No tests yet</h2>
          <p>Finish a typing test or a race and your speed, accuracy and progress will show up here.</p>
          <div className="db-actions">
            <Link to="/typing" className="rc-btn primary"><Keyboard size={16}/> Take a typing test</Link>
            <Link to="/racing" className="rc-btn"><Bike size={16}/> Race the AI</Link>
          </div>
        </div>
      </div>
    );
  }

  const goalPct = Math.min(1, s.today/DAILY_GOAL);

  return (
    <div className="db container">
      <header className="db-head">
        <div>
          <span className="db-kicker">Dashboard</span>
          <h1>{name ? `Welcome back, ${name}` : 'Your progress'}</h1>
          <p>{s.total} test{s.total===1?'':'s'} completed{s.streak>1 ? ` · ${s.streak}-day streak` : ''}</p>
        </div>
        <div className="db-actions">
          <Link to="/typing" className="rc-btn"><Keyboard size={16}/> Typing test</Link>
          <Link to="/racing" className="rc-btn primary"><Bike size={16}/> Start a race</Link>
        </div>
      </header>

      <section className="db-tiles" aria-label="Summary">
        <Tile icon={Trophy} label="Best speed" value={s.best.wpm} unit="WPM" hint={`${s.best.accuracy}% accuracy · ${relativeTime(s.best.date)}`} />
        <Tile icon={Gauge} label="Average speed" value={s.avgWpm} unit="WPM" hint={<Trend delta={s.wpmDelta} unit=" WPM" />} />
        <Tile icon={Target} label="Average accuracy" value={s.avgAcc} unit="%" hint={<Trend delta={s.accDelta} unit="%" />} />
        <Tile icon={Flame} label="Today's goal" value={Math.min(s.today, DAILY_GOAL)} unit={`/ ${DAILY_GOAL} tests`}
          hint={s.today>=DAILY_GOAL ? 'Goal reached. Nice work!' : `${DAILY_GOAL-s.today} more to hit today's goal`}>
          <div className="db-goal" role="progressbar" aria-valuemin={0} aria-valuemax={DAILY_GOAL} aria-valuenow={Math.min(s.today, DAILY_GOAL)}>
            <span style={{ transform:`scaleX(${goalPct})` }} />
          </div>
        </Tile>
      </section>
      <p className="db-note">Averages use your last 10 tests.{s.duels>0 && ` You've won ${s.wins} of ${s.duels} races against the AI.`}</p>

      <section className="db-charts">
        <div className="db-card">
          <div className="db-card-head"><h2>Speed</h2><span>WPM, last {trend.length} tests</span></div>
          {trend.length>=2 ? <TrendChart data={trend} dataKey="wpm" unit=" WPM" color="var(--db-speed)" domain={[0,'auto']} />
            : <p className="db-chart-empty">Complete one more test to see your speed trend.</p>}
        </div>
        <div className="db-card">
          <div className="db-card-head"><h2>Accuracy</h2><span>%, last {trend.length} tests</span></div>
          {trend.length>=2 ? <TrendChart data={trend} dataKey="accuracy" unit="%" color="var(--db-acc)" domain={[(min)=> Math.max(0, Math.floor((min-5)/10)*10), 100]} />
            : <p className="db-chart-empty">Complete one more test to see your accuracy trend.</p>}
        </div>
      </section>

      <section className="db-card">
        <div className="db-card-head"><h2>Recent sessions</h2><span>Newest first</span></div>
        <div className="db-table-wrap">
          <table className="db-table">
            <thead>
              <tr><th>When</th><th>Type</th><th className="num">WPM</th><th className="num">Accuracy</th><th className="num hide-sm">Length</th><th>Result</th></tr>
            </thead>
            <tbody>
              {history.slice(0,8).map(r=>{
                const t = sessionType(r);
                return (
                  <tr key={r.id}>
                    <td className="muted">{relativeTime(r.date)}</td>
                    <td><span className="db-type"><t.icon size={14}/> {t.label}</span></td>
                    <td className="num strong">{r.wpm}</td>
                    <td className="num">{r.accuracy}%</td>
                    <td className="num muted hide-sm">{r.duration}s</td>
                    <td>
                      {r.duel ? (
                        <span className={`db-badge ${r.outcome}`}>{r.outcome==='player' ? 'Won' : r.outcome==='ai' ? 'Lost' : 'Draw'}</span>
                      ) : r.id===s.best.id ? <span className="db-badge best">Best</span> : <span className="muted">-</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
