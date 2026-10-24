import { Gauge, Zap, Target, Timer, MapPin } from 'lucide-react';

export default function RaceHUD({ wpm, accuracy, speedNorm, timeLeft, distance, progress, tier, nitro }){
  const items = [
    {icon:<Gauge/>, label:'WPM', value:wpm},
    {icon:<Zap/>, label:'Speed', value: `${Math.round(speedNorm)}%`},
    {icon:<Target/>, label:'Accuracy', value:`${accuracy}%`},
    {icon:<Timer/>, label:'Time', value:`${Math.ceil(timeLeft)}s`},
    {icon:<MapPin/>, label:'Distance', value:`${distance.toFixed(0)} m`},
  ];
  return (
    <div className="card glass" style={{padding:.0,overflow:'hidden'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:0}}>
        {items.map(it=>(
          <div key={it.label} style={{padding:'1rem',borderRight:'1px solid var(--border)',borderBottom:'1px solid var(--border)'}}>
            <div style={{display:'flex',gap:'.4rem',alignItems:'center',color:'var(--muted)',fontSize:'.8rem'}}>{it.icon}{it.label}</div>
            <div style={{fontSize:'1.6rem',fontWeight:700}} className="neon-text">{it.value}</div>
          </div>
        ))}
      </div>
      <div style={{padding:'1rem',background:'rgba(255,255,255,.02)'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'.5rem',fontSize:'.85rem',color:'var(--muted)'}}>
          <span>Tier: {tier}</span><span>Nitro: {nitro}%</span>
        </div>
        <div style={{width:'100%',height:10,background:'rgba(255,255,255,.06)',borderRadius:999,overflow:'hidden'}}>
          <div style={{width:`${progress}%`,height:'100%',background:'linear-gradient(90deg,var(--neon-cyan),var(--neon-purple))',transition:'width .2s'}}/>
        </div>
      </div>
    </div>
  );
}
