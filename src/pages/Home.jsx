import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { Zap, Gauge, Target, Trophy, BarChart3, Bike } from 'lucide-react';

const features = [
  {icon:<Gauge/>, title:'Live Speed', desc:'Real-time WPM with animated counters.'},
  {icon:<Target/>, title:'Accuracy Focus', desc:'Character highlighting as you type.'},
  {icon:<BarChart3/>, title:'Progress Tracking', desc:'Charts and history in dashboard.'},
  {icon:<Trophy/>, title:'Leaderboard', desc:'Demo rankings and personal bests.'},
];

export default function Home(){
  return (
    <div>
      <section className="container" style={{paddingTop:'4rem',paddingBottom:'4rem'}}>
        <div className="grid grid-2" style={{alignItems:'center'}}>
          <div>
            <h1 className="home-logo"><Logo size="lg" tagline /></h1>
            <p style={{color:'var(--muted)',marginTop:'1rem'}}>Futuristic dark-neon typing test with live feedback, charts and demo auth.</p>
            <div style={{marginTop:'1.5rem',display:'flex',gap:'1rem',flexWrap:'wrap'}}>
              <Link to="/typing" className="btn"><Zap size={18}/> Start Typing Test</Link>
              <Link to="/racing" className="btn" style={{background:'linear-gradient(135deg,var(--neon-cyan),var(--neon-purple))'}}><Bike size={18}/> 3D Race</Link>
              <Link to="/dashboard" className="btn" style={{background:'transparent',border:'1px solid var(--border)',color:'var(--text)'}}>Dashboard</Link>
            </div>
          </div>
          <div className="card glass" style={{padding:'2rem',minHeight:300}}>
            <div className="float" style={{fontSize:'.85rem',color:'var(--muted)',marginBottom:'.5rem'}}>Live preview</div>
            <div style={{fontFamily:'ui-monospace,monospace',lineHeight:1.6,opacity:.9}}>
              The only way to do great work is to love what you do.
            </div>
          </div>
        </div>
      </section>
      <section className="container" style={{paddingBottom:'4rem'}}>
        <div className="grid grid-3">
          {features.map(f=>(
            <div key={f.title} className="card glass">
              <div style={{display:'flex',gap:'.6rem',alignItems:'center',marginBottom:'.5rem'}}>
                {f.icon}<strong>{f.title}</strong>
              </div>
              <p style={{color:'var(--muted)'}}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
