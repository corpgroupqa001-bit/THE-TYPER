import { Component, useEffect, useRef, useState } from 'react';
import { SceneFallback } from './sceneSupport';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import RaceTrack from './three/RaceTrack';
import { PlayerMotorcycle, AIMotorcycle, useDuelPlacements, TagProjector, useTagRefs } from './three/RacerBikes';
import { tickRace } from './duel';
import RaceCamera from './three/RaceCamera';
import SpeedStreaks from './three/SpeedStreaks';

// The one simulation tick: engine first, then HUD/audio subscribers.
function EngineTicker({ engine, opponent }){
  useFrame((_, dt)=> tickRace(engine, opponent, dt));
  return null;
}

function Racers({ engine, opponent, reducedMotion, tags }){
  const placements = useDuelPlacements(opponent, reducedMotion);
  return (
    <>
      <PlayerMotorcycle engine={engine} reducedMotion={reducedMotion} duel={!!opponent} placement={placements.player} rootRef={tags.playerObj} />
      {opponent && <>
        <AIMotorcycle opponent={opponent} reducedMotion={reducedMotion} placement={placements.ai} rootRef={tags.aiObj} />
        <TagProjector targets={[{ obj:tags.playerObj, el:tags.playerEl }, { obj:tags.aiObj, el:tags.aiEl }]} />
      </>}
    </>
  );
}

function Lights({ quality }){
  return (
    <>
      <hemisphereLight args={['#4f6bff', '#0a0614', 0.55]} />
      <ambientLight intensity={0.12} />
      <directionalLight
        position={[-6, 12, 6]} intensity={1.4} color="#a8c4ff"
        castShadow={quality==='high'}
        shadow-mapSize={[1024,1024]} shadow-bias={-0.0004}
        shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6}
        shadow-camera-near={1} shadow-camera-far={40}
      />
      <pointLight position={[-7,4,-6]} color="#22d3ee" intensity={18} distance={22} decay={2} />
      <pointLight position={[7,4,-10]} color="#c026d3" intensity={18} distance={22} decay={2} />
    </>
  );
}

class SceneBoundary extends Component {
  constructor(props){ super(props); this.state = { error:null }; }
  static getDerivedStateFromError(error){ return { error }; }
  componentDidCatch(error){ console.warn('3D scene failed:', error); }
  render(){ return this.state.error ? this.props.fallback : this.props.children; }
}

export default function RaceScene({ engine, opponent, aiLabel, phase, quality='high', reducedMotion=false }){
  const [lost, setLost] = useState(false);
  const tags = useTagRefs();
  const cleanup = useRef(null);
  useEffect(()=> ()=> cleanup.current?.(), []);

  if(lost){
    return (
      <SceneFallback engine={engine} opponent={opponent} title="Graphics context lost" message="The GPU reset the 3D view. Your typing and race stats are unaffected.">
        <button type="button" className="rc-btn" onClick={()=> setLost(false)}>Restart 3D view</button>
      </SceneFallback>
    );
  }

  const high = quality==='high';
  return (
    <SceneBoundary fallback={<SceneFallback engine={engine} opponent={opponent} />}>
      <>
      <Canvas
        className="race-canvas"
        shadows={high ? 'percentage' : false}
        dpr={high ? [1, 1.75] : [0.7, 1]}
        gl={{ antialias:!high, powerPreference:'high-performance', alpha:false, stencil:false }}
        camera={{ fov:50, near:0.1, far:620, position:[3.5,1.4,3.5] }}
        onCreated={({ gl })=>{
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          const canvas = gl.domElement;
          const onLost = (e)=>{ e.preventDefault(); setLost(true); };
          canvas.addEventListener('webglcontextlost', onLost);
          cleanup.current = ()=> canvas.removeEventListener('webglcontextlost', onLost);
        }}
      >
        <color attach="background" args={['#04050d']} />
        <fog attach="fog" args={['#0b0820', high ? 30 : 20, high ? 300 : 210]} />
        <EngineTicker engine={engine} opponent={opponent} />
        <Lights quality={quality} />
        <RaceTrack engine={engine} quality={quality} />
        <Racers engine={engine} opponent={opponent} reducedMotion={reducedMotion} tags={tags} />
        {!reducedMotion && <SpeedStreaks engine={engine} />}
        <RaceCamera engine={engine} opponent={opponent} phase={phase} reducedMotion={reducedMotion} />
        {high && (
          <EffectComposer multisampling={4}>
            <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.9} luminanceSmoothing={0.2} radius={0.7} />
            <Vignette eskil={false} offset={0.25} darkness={0.75} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
      </Canvas>
      {opponent && (
        <div className="bike-tags" aria-hidden="true">
          <div ref={tags.playerEl} className="bike-tag tone-player">YOU</div>
          <div ref={tags.aiEl} className="bike-tag tone-ai">AI · {aiLabel}</div>
        </div>
      )}
      </>
    </SceneBoundary>
  );
}
