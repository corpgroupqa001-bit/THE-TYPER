export default function ProgressBar({ value }){
  const pct = Math.max(0,Math.min(100, value));
  return (
    <div style={{width:'100%',height:10,background:'rgba(255,255,255,0.06)',borderRadius:999,overflow:'hidden'}}>
      <div style={{
        width:`${pct}%`,height:'100%',
        background:'linear-gradient(90deg,var(--neon-cyan),var(--neon-purple))',
        transition:'width .2s ease'
      }}/>
    </div>
  );
}
