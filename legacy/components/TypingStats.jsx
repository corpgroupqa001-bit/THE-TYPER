import AnimatedCounter from './AnimatedCounter';

export default function TypingStats({ wpm, accuracy, correct, errors, timeLeft }){
  return (
    <div className="grid grid-3">
      <Stat label="WPM" value={<AnimatedCounter value={wpm}/>}/>
      <Stat label="Accuracy" value={<AnimatedCounter value={accuracy}/> + '%'}/>
      <Stat label="Time" value={Math.ceil(timeLeft)+'s'}/>
      <Stat label="Correct" value={correct}/>
      <Stat label="Errors" value={errors}/>
    </div>
  );
}

function Stat({label,value}){
  return (
    <div className="card glass">
      <div style={{color:'var(--muted)',fontSize:'.85rem'}}>{label}</div>
      <div style={{fontSize:'2rem',fontWeight:700}} className="neon-text">{value}</div>
    </div>
  );
}
