import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

function useReducedMotion(){
  const { reducedMotion } = useTheme();
  return reducedMotion;
}

export default function BikeRaceTrack({ speedNorm, onTrail }) {
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const offsetRef = useRef(0);
  const reduced = useReducedMotion();

  useEffect(()=>{
    if(reduced) return;
    let last = performance.now();
    const loop = (now)=>{
      const dt = Math.min(32, now - last);
      last = now;
      const speedPx = 120 + speedNorm*6; // base + speed
      offsetRef.current = (offsetRef.current + speedPx * dt/16.67) % 200;
      if(containerRef.current){
        containerRef.current.style.setProperty('--road-offset', `${offsetRef.current}px`);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return ()=> cancelAnimationFrame(rafRef.current);
  },[speedNorm, reduced]);

  return (
    <div className="race-track" ref={containerRef} style={{position:'relative',width:'100%',height:'100%',overflow:'hidden',background:'linear-gradient(#0a1020,#050a14)'}}>
      {/* sky gradient */}
      <div style={{position:'absolute',inset:0,background:'radial-gradient(600px 200px at 50% 0%, rgba(34,211,238,.15), transparent), radial-gradient(600px 200px at 80% 20%, rgba(168,85,247,.12), transparent)'}}/>
      {/* buildings */}
      <div className="buildings" style={{position:'absolute',inset:0,opacity:.6,transform:`translateY(${offsetRef.current*0.2}px)`}}>
        {Array.from({length:12}).map((_,i)=>(
          <div key={i} style={{
            position:'absolute',bottom:0,left:`${i*9}%`,width:'8%',height:`${80+ (i%3)*40}px`,
            background:'linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.01))',
            border:'1px solid rgba(255,255,255,.06)',borderRadius:'6px 6px 0 0',
            boxShadow:'0 0 20px rgba(34,211,238,.08)'
          }}/>
        ))}
      </div>
      {/* road */}
      <div className="road" style={{position:'absolute',left:'50%',transform:'translateX(-50%)',bottom:0,width:'60%',height:'100%',background:'linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02))',border:'1px solid rgba(255,255,255,.08)',borderRadius:'12px 12px 0 0','--road-offset':0}}>
        <div className="road-lines" style={{position:'absolute',left:'50%',top:0,width:4,height:'200%',background:'repeating-linear-gradient(to bottom, rgba(34,211,238,.9) 0 40px, transparent 40px 80px)',transform:'translateX(-50%)',opacity:.9}}/>
      </div>
      {/* bike */}
      <div className="bike" style={{
        position:'absolute',left:'50%',bottom:'18%',transform:'translateX(-50%)',
        transition:'transform .1s linear'
      }}>
        <BikeSvg speedNorm={speedNorm} />
      </div>
      {/* speed lines */}
      <div className="speedlines" style={{position:'absolute',inset:0,opacity: speedNorm/100}}>
        {Array.from({length:20}).map((_,i)=>(
          <div key={i} style={{
            position:'absolute',top:0,left:`${i*5}%`,width:2,height:'100%',
            background:'linear-gradient(transparent, rgba(255,255,255,.08), transparent)',
            transform:`translateY(-${(i%3)*30}px)`
          }}/>
        ))}
      </div>
    </div>
  );
}

function BikeSvg({speedNorm}){
  const tilt = Math.max(-8, Math.min(8, (speedNorm-50)/10));
  return (
    <svg width="160" height="100" viewBox="0 0 160 100">
      <g transform={`translate(80,50) rotate(${tilt})`}>
        {/* wheels */}
        <circle cx="-40" cy="20" r="14" fill="none" stroke="var(--neon-cyan)" strokeWidth="3"/>
        <circle cx="40" cy="20" r="14" fill="none" stroke="var(--neon-cyan)" strokeWidth="3"/>
        <circle cx="-40" cy="20" r="7" fill="var(--neon-blue)"/>
        <circle cx="40" cy="20" r="7" fill="var(--neon-blue)"/>
        {/* frame */}
        <line x1="-30" y1="10" x2="10" y2="-10" stroke="var(--neon-purple)" strokeWidth="4" strokeLinecap="round"/>
        <line x1="10" y1="-10" x2="30" y2="10" stroke="var(--neon-purple)" strokeWidth="4" strokeLinecap="round"/>
        <line x1="-30" y1="10" x2="-40" y2="20" stroke="var(--neon-cyan)" strokeWidth="3"/>
        <line x1="30" y1="10" x2="40" y2="20" stroke="var(--neon-cyan)" strokeWidth="3"/>
        {/* seat */}
        <rect x="-32" y="-18" width="16" height="6" rx="3" fill="var(--neon-pink)"/>
        {/* engine glow */}
        <ellipse cx="0" cy="6" rx="18" ry="8" fill="rgba(34,211,238,.15)" className="pulse-glow"/>
      </g>
    </svg>
  );
}
