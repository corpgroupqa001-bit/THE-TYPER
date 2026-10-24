import { useLocation, useNavigate, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
import AnimatedCounter from '../components/AnimatedCounter';
import { useAuth } from '../context/AuthContext';
import { loadHistory } from '../utils/storage';

export default function Results(){
  const { state } = useLocation();
  const navigate = useNavigate();
  const result = state?.result;
  if(!result) return <div className="container">No result. <Link to="/typing">Go back</Link></div>;

  const history = loadHistory();
  const best = history.reduce((m,r)=> r.wpm>m.wpm? r : m, {wpm:0});
  const isPersonalBest = result.wpm >= best.wpm;

  const data = [
    {name:'WPM',value:result.wpm,max:100},
    {name:'Accuracy',value:result.accuracy,max:100},
  ];

  return (
    <div className="container" style={{paddingTop:'2rem'}}>
      <div className="card glass neon-border">
        <h2 className="neon-text">Results</h2>
        <div className="grid grid-2" style={{marginTop:'1rem',alignItems:'center'}}>
          <div>
            <div style={{fontSize:'3rem',fontWeight:800}} className="neon-text"><AnimatedCounter value={result.wpm}/> WPM</div>
            <div style={{color:'var(--muted)'}}>Accuracy: <AnimatedCounter value={result.accuracy}/> %</div>
            <div style={{color:'var(--muted)',marginTop:'.5rem'}}>Correct: {result.correctChars} • Errors: {result.errorChars} • Total: {result.totalTyped}</div>
            {isPersonalBest && <div style={{marginTop:'1rem',color:'var(--success)',fontWeight:700}}>🎉 New Personal Best!</div>}
          </div>
          <div style={{height:220}}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="20%" outerRadius="90%" data={data} startAngle={90} endAngle={-270}>
                <RadialBar background dataKey="value"/>
                <Tooltip/>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{marginTop:'1.5rem',display:'flex',gap:'1rem',flexWrap:'wrap'}}>
          <Link to="/typing" className="btn">Retry Test</Link>
          <Link to="/dashboard" className="btn" style={{background:'transparent',border:'1px solid var(--border)'}}>Back to Dashboard</Link>
        </div>
      </div>

      <div className="card glass" style={{marginTop:'1.5rem'}}>
        <h3>Summary Chart</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={[
            {k:'WPM',v:result.wpm},
            {k:'Accuracy',v:result.accuracy},
            {k:'CorrectChars',v:result.correctChars},
          ]}>
            <XAxis dataKey="k"/>
            <YAxis/>
            <Tooltip/>
            <Bar dataKey="v" fill="url(#grad)" />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--neon-cyan)"/>
                <stop offset="100%" stopColor="var(--neon-purple)"/>
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
