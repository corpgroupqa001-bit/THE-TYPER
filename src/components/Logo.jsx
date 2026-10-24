import { useId } from 'react';

/*
 * THE TYPER brand: a glowing rounded-square "T" with speed lines, the
 * two-tone italic wordmark and the TYPE › RACE › WIN tagline.
 * Vector + CSS so it stays crisp at any size and works in both themes.
 */
export function LogoMark({ size=36 }){
  const id = useId().replace(/:/g,'');
  return (
    <svg className="logo-mark" width={size*1.2} height={size} viewBox="0 0 120 100" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7df9ff"/><stop offset=".55" stopColor="#3b82f6"/><stop offset="1" stopColor="#e040fb"/>
        </linearGradient>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0e3a8a"/><stop offset=".6" stopColor="#1a1670"/><stop offset="1" stopColor="#3a1078"/>
        </linearGradient>
        <linearGradient id={`${id}-t`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff"/><stop offset=".45" stopColor="#a5f3fc"/><stop offset="1" stopColor="#22d3ee"/>
        </linearGradient>
        <linearGradient id={`${id}-streak`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="58" y2="0">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0"/><stop offset="1" stopColor="#7df9ff"/>
        </linearGradient>
        <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="26" y="10" width="80" height="80" rx="20" fill={`url(#${id}-fill)`} stroke={`url(#${id}-edge)`} strokeWidth="5" filter={`url(#${id}-glow)`}/>
      <path d="M38 22 h52 a10 10 0 0 1 8 6" fill="none" stroke="#ffffff" strokeOpacity=".25" strokeWidth="2.5" strokeLinecap="round"/>
      {/* speed lines */}
      <g stroke={`url(#${id}-streak)`} strokeLinecap="round">
        <line x1="2" y1="38" x2="56" y2="38" strokeWidth="4"/>
        <line x1="10" y1="50" x2="52" y2="50" strokeWidth="3"/>
        <line x1="0" y1="62" x2="48" y2="62" strokeWidth="4"/>
        <line x1="14" y1="73" x2="44" y2="73" strokeWidth="2.5"/>
      </g>
      {/* italic T */}
      <g filter={`url(#${id}-glow)`} fill={`url(#${id}-t)`}>
        <path d="M47 28 H96 L92 43 H43 Z"/>
        <path d="M63 43 H79 L69 80 H53 Z"/>
      </g>
    </svg>
  );
}

export default function Logo({ size='md', tagline=false }){
  return (
    <span className={`logo logo-${size}`}>
      <LogoMark size={size==='lg' ? 96 : size==='sm' ? 28 : 34} />
      <span className="logo-text">
        <span className="logo-word"><span className="logo-the">THE</span> <span className="logo-typer">TYPER</span></span>
        {tagline && (
          <span className="logo-tagline">TYPE <i className="c1">›</i> RACE <i className="c2">›</i> WIN</span>
        )}
      </span>
    </span>
  );
}
