import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeFadeTexture, makeGlowTexture, useDisposable } from './textures';

/*
 * Procedural sportbike. Modelled along local +x (forward), y up, z = axle
 * direction, then turned to face −Z (down the highway). Dimensions are metres.
 */
const WHEEL_R = 0.345;
const FRONT_AXLE = [0.70, WHEEL_R, 0];
const REAR_AXLE = [-0.70, WHEEL_R, 0];
const RED = new THREE.Color('#ff2b4a');
const MAGENTA = new THREE.Color('#d946ef');

function bodyShape(){
  const s = new THREE.Shape();
  s.moveTo(0.88, 0.80);
  s.splineThru([
    new THREE.Vector2(0.80, 0.96), new THREE.Vector2(0.62, 1.06), new THREE.Vector2(0.40, 1.09),
    new THREE.Vector2(0.15, 1.11), new THREE.Vector2(-0.05, 1.00), new THREE.Vector2(-0.30, 0.92),
    new THREE.Vector2(-0.52, 0.95), new THREE.Vector2(-0.82, 1.07), new THREE.Vector2(-0.96, 1.06),
  ]);
  s.lineTo(-0.88, 0.96);
  s.lineTo(-0.55, 0.80);
  s.lineTo(-0.25, 0.62);
  s.quadraticCurveTo(-0.12, 0.30, 0.05, 0.28);
  s.lineTo(0.30, 0.28);
  s.lineTo(0.40, 0.55);
  s.quadraticCurveTo(0.52, 0.73, 0.78, 0.74);
  s.lineTo(0.88, 0.80);
  return s;
}

function screenShape(){
  const s = new THREE.Shape();
  s.moveTo(0.80, 0.96);
  s.quadraticCurveTo(0.70, 1.14, 0.52, 1.17);
  s.lineTo(0.56, 1.07);
  s.lineTo(0.80, 0.96);
  return s;
}

// Capsule/cylinder between two points.
function segment(a, b){
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const dir = B.clone().sub(A);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
  return { position: A.add(B).multiplyScalar(0.5).toArray(), quaternion: q.toArray(), len };
}

function Limb({ a, b, r, material }){
  const s = useMemo(()=> segment(a,b), [a,b]);
  return (
    <mesh position={s.position} quaternion={s.quaternion} material={material} castShadow>
      <capsuleGeometry args={[r, Math.max(0.01, s.len - r), 6, 12]} />
    </mesh>
  );
}

function Rod({ a, b, r, material, segments=10 }){
  const s = useMemo(()=> segment(a,b), [a,b]);
  return (
    <mesh position={s.position} quaternion={s.quaternion} material={material} castShadow>
      <cylinderGeometry args={[r, r, s.len, segments]} />
    </mesh>
  );
}

function Wheel({ position, spinRef, m, front }){
  const spokes = [0,1,2,3,4];
  return (
    <group position={position}>
      <group ref={spinRef}>
        <mesh material={m.tire} castShadow>
          <torusGeometry args={[0.265, 0.08, 14, 40]} />
        </mesh>
        <mesh material={m.rimGlow}>
          <torusGeometry args={[0.205, 0.016, 8, 40]} />
        </mesh>
        {spokes.map(i=>(
          <mesh key={i} rotation={[0,0,(i/5)*Math.PI*2]} position={[0,0,0]} material={m.rim}>
            <boxGeometry args={[0.035, 0.40, 0.035]} />
          </mesh>
        ))}
        <mesh rotation={[Math.PI/2,0,0]} material={m.metal}>
          <cylinderGeometry args={[0.05, 0.05, front?0.16:0.2, 16]} />
        </mesh>
        {[1,-1].slice(0, front?2:1).map(side=>(
          <mesh key={side} rotation={[Math.PI/2,0,0]} position={[0,0,side*0.065]} material={m.disc}>
            <cylinderGeometry args={[0.15, 0.15, 0.008, 28]} />
          </mesh>
        ))}
      </group>
      {/* caliper (does not spin) */}
      <mesh position={front?[-0.12,0.08,0.075]:[-0.11,0.09,-0.07]} material={m.caliper}>
        <boxGeometry args={[0.07, 0.09, 0.025]} />
      </mesh>
    </group>
  );
}

/*
 * Props for multi-bike races:
 *  paint / accent — livery colours (player cyan-blue, AI orange-red)
 *  laneX          — lane centre on the road
 *  placement      — optional mutable { z, x } updated by the race director each
 *                   frame (z = position along the road, x = overtaking swerve)
 *  weaveScale     — how much the bike drifts within its lane
 *  headlightBeam  — real spotlight on the road (only the player's, to save GPU)
 *  rootRef        — receives the bike's root group (used to project name tags)
 */
export default function Motorcycle({
  engine, reducedMotion, paint='#1240c8', accent='#22d3ee', laneX=0, placement,
  weaveScale=1, headlightBeam=true, rootRef,
}){
  const ownRoot = useRef();
  const root = rootRef || ownRoot;     // world space: lateral drift + lean
  const sprung = useRef();   // body on suspension: bob + pitch
  const frontSpin = useRef();
  const rearSpin = useRef();
  const trailL = useRef(), trailR = useRef();
  const flame = useRef();
  const glowLight = useRef();
  const glowDisc = useRef();
  const motion = useRef({ x:0, vx:0, t:0 });

  const geo = useDisposable(()=>({
    body: (()=>{ const g = new THREE.ExtrudeGeometry(bodyShape(), { depth:0.34, bevelEnabled:true, bevelThickness:0.03, bevelSize:0.03, bevelSegments:4, curveSegments:24 }); g.translate(0,0,-0.17); return g; })(),
    screen: (()=>{ const g = new THREE.ExtrudeGeometry(screenShape(), { depth:0.26, bevelEnabled:true, bevelThickness:0.01, bevelSize:0.01, bevelSegments:2, curveSegments:16 }); g.translate(0,0,-0.13); return g; })(),
    trail: (()=>{ const g = new THREE.PlaneGeometry(0.07, 1); g.translate(0,-0.5,0); g.rotateX(-Math.PI/2); return g; })(),
  }),[]);

  const tex = useDisposable(()=>{ const fade = makeFadeTexture(); fade.flipY = false; return { fade, glow: makeGlowTexture() }; },[]);

  const m = useDisposable(()=>({
    paint: new THREE.MeshPhysicalMaterial({ color:paint, metalness:0.55, roughness:0.22, clearcoat:1, clearcoatRoughness:0.08 }),
    carbon: new THREE.MeshStandardMaterial({ color:'#0d1016', metalness:0.4, roughness:0.45 }),
    metal: new THREE.MeshStandardMaterial({ color:'#9aa4b5', metalness:0.95, roughness:0.25 }),
    fork: new THREE.MeshStandardMaterial({ color:'#d4a640', metalness:0.9, roughness:0.25 }),
    tire: new THREE.MeshStandardMaterial({ color:'#0a0a0c', metalness:0, roughness:0.85 }),
    rim: new THREE.MeshStandardMaterial({ color:'#1b2230', metalness:0.85, roughness:0.3 }),
    rimGlow: new THREE.MeshStandardMaterial({ color:'#0a2a33', emissive:accent, emissiveIntensity:1.6, metalness:0.6, roughness:0.3, toneMapped:false }),
    disc: new THREE.MeshStandardMaterial({ color:'#c9ced6', metalness:1, roughness:0.35 }),
    caliper: new THREE.MeshStandardMaterial({ color:'#e11d48', metalness:0.5, roughness:0.4 }),
    glass: new THREE.MeshPhysicalMaterial({ color:'#7dd3fc', metalness:0.1, roughness:0.05, transmission:0, transparent:true, opacity:0.35 }),
    headlight: new THREE.MeshBasicMaterial({ color: new THREE.Color('#e6fbff').multiplyScalar(4), toneMapped:false }),
    taillight: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff1f3d').multiplyScalar(2.5), toneMapped:false }),
    accent: new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(2.2), toneMapped:false }),
    suit: new THREE.MeshStandardMaterial({ color:'#11141c', metalness:0.2, roughness:0.6 }),
    suitAccent: new THREE.MeshStandardMaterial({ color:'#0b1220', emissive:accent, emissiveIntensity:0.6, roughness:0.5 }),
    helmet: new THREE.MeshPhysicalMaterial({ color:'#e8edf5', metalness:0.3, roughness:0.2, clearcoat:1 }),
    visor: new THREE.MeshStandardMaterial({ color:'#05070c', metalness:0.9, roughness:0.05, emissive:new THREE.Color(accent).multiplyScalar(0.45), emissiveIntensity:0.5 }),
    trail: new THREE.MeshBasicMaterial({ color:accent, map:tex.fade, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false }),
    flame: new THREE.MeshBasicMaterial({ color: new THREE.Color('#a855f7').multiplyScalar(3), transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false }),
    glowDisc: new THREE.MeshBasicMaterial({ color:accent, map:tex.glow, transparent:true, opacity:0.25, blending:THREE.AdditiveBlending, depthWrite:false }),
  }),[tex, paint, accent]);

  const spotTarget = useMemo(()=> new THREE.Object3D(), []);
  const trailColor = useMemo(()=> new THREE.Color(), []);
  const accentColor = useMemo(()=> new THREE.Color(accent), [accent]);

  useFrame((_, rawDt)=>{
    const dt = Math.min(rawDt, 0.1);
    const s = engine.speed/100;
    const mo = motion.current;
    mo.t += dt;

    // Wheels: ω = v / r, accumulated by the engine.
    if(frontSpin.current) frontSpin.current.rotation.z = -engine.wheelAngle;
    if(rearSpin.current) rearSpin.current.rotation.z = -engine.wheelAngle;

    // Gentle weave down the lane while racing; lean into the lateral velocity.
    const weave = reducedMotion || engine.phase!=='racing' ? 0 : (Math.sin(mo.t*0.55)*0.55*Math.min(1, s*1.6) + Math.sin(mo.t*1.7)*0.08*s)*weaveScale;
    const nx = THREE.MathUtils.damp(mo.x, weave, 2.5, dt);
    const vx = dt>0 ? (nx-mo.x)/dt : 0;
    mo.vx = THREE.MathUtils.damp(mo.vx, vx, 6, dt);
    mo.x = nx;
    if(root.current){
      root.current.position.x = laneX + mo.x + (placement?.x || 0);
      root.current.position.z = placement?.z || 0;
      root.current.rotation.z = THREE.MathUtils.clamp(-mo.vx*0.35, -0.28, 0.28);
      root.current.rotation.y = -mo.vx*0.04;
    }

    // Suspension: road buzz scaled by speed, squat/dive from acceleration.
    if(sprung.current){
      const buzz = reducedMotion ? 0 : Math.sin(mo.t*31)*0.004*s + Math.sin(mo.t*7.3)*0.006*s;
      sprung.current.position.y = buzz - Math.abs(engine.accel)*0.0006;
      sprung.current.rotation.z = THREE.MathUtils.clamp(engine.accel*0.0012, -0.05, 0.06);
    }

    // Trails: length & opacity from speed; colour reacts to mistakes and nitro.
    const nitroOn = engine.nitroTime>0;
    trailColor.copy(accentColor);
    if(nitroOn) trailColor.lerp(MAGENTA, 0.85);
    trailColor.lerp(RED, engine.errorFlash);
    m.trail.color.copy(trailColor).multiplyScalar(1.6);
    m.trail.opacity = THREE.MathUtils.clamp((s-0.15)*1.4, 0, 0.9) + engine.errorFlash*0.4;
    const len = 0.5 + s*5 + (nitroOn?3:0);
    if(trailL.current) trailL.current.scale.z = len;
    if(trailR.current) trailR.current.scale.z = len;

    if(flame.current){
      m.flame.opacity = nitroOn ? 0.85 : THREE.MathUtils.damp(m.flame.opacity, 0, 8, dt);
      const f = nitroOn ? 1 + Math.sin(mo.t*60)*0.15 : 0.6;
      flame.current.scale.set(f, 1 + (nitroOn?0.6:0), f);
    }

    m.taillight.color.set('#ff1f3d').multiplyScalar(2.5 + engine.errorFlash*5 + (engine.phase==='finished'?3:0));
    m.rimGlow.emissiveIntensity = 0.9 + s*0.8 + (nitroOn?1:0);
    if(glowLight.current) glowLight.current.intensity = 1 + s*3 + (nitroOn?4:0);
    m.glowDisc.opacity = 0.1 + s*0.14 + (nitroOn?0.14:0);
    if(glowDisc.current) m.glowDisc.color.copy(nitroOn ? MAGENTA : accentColor);
  });

  return (
    <group ref={root}>
      <group rotation={[0, Math.PI/2, 0]}>
        <Wheel position={FRONT_AXLE} spinRef={frontSpin} m={m} front />
        <Wheel position={REAR_AXLE} spinRef={rearSpin} m={m} />

        <group ref={sprung}>
          {/* bodywork */}
          <mesh geometry={geo.body} material={m.paint} castShadow receiveShadow />
          <mesh geometry={geo.screen} material={m.glass} />
          {/* engine, frame, belly */}
          <mesh position={[0.08,0.46,0]} material={m.carbon} castShadow><boxGeometry args={[0.5,0.34,0.3]} /></mesh>
          <mesh position={[-0.05,0.75,0]} rotation={[0,0,-0.35]} material={m.metal}><boxGeometry args={[0.55,0.06,0.38]} /></mesh>
          {/* front forks + triple clamp */}
          {[1,-1].map(z=>(<Rod key={z} a={[0.70,WHEEL_R,z*0.095]} b={[0.56,1.0,z*0.095]} r={0.024} material={m.fork} />))}
          <mesh position={[0.56,1.0,0]} material={m.metal}><boxGeometry args={[0.06,0.03,0.26]} /></mesh>
          {/* clip-on bars */}
          {[1,-1].map(z=>(<Rod key={z} a={[0.54,1.02,z*0.12]} b={[0.50,1.0,z*0.25]} r={0.014} material={m.carbon} />))}
          {/* swingarm + shock */}
          {[1,-1].map(z=>(<Rod key={z} a={[-0.18,0.50,z*0.11]} b={[-0.70,WHEEL_R,z*0.11]} r={0.03} material={m.metal} segments={6} />))}
          <Rod a={[-0.36,0.48,0]} b={[-0.22,0.84,0]} r={0.035} material={m.fork} />
          {/* exhaust */}
          <Rod a={[-0.30,0.50,0.2]} b={[-0.78,0.74,0.2]} r={0.065} material={m.metal} segments={16} />
          <Rod a={[-0.76,0.73,0.2]} b={[-0.80,0.75,0.2]} r={0.068} material={m.accent} segments={16} />
          <mesh ref={flame} position={[-0.98,0.84,0.2]} rotation={[0,0,Math.PI/2 - 0.46]} material={m.flame}>
            <coneGeometry args={[0.06,0.4,12,1,true]} />
          </mesh>
          {/* footpegs */}
          {[1,-1].map(z=>(<mesh key={z} position={[-0.22,0.55,z*0.21]} material={m.metal}><boxGeometry args={[0.08,0.02,0.06]} /></mesh>))}
          {/* lights */}
          {[1,-1].map(z=>(
            <mesh key={z} position={[0.865,0.86,z*0.075]} rotation={[0,0,-0.9]} material={m.headlight}>
              <boxGeometry args={[0.02,0.07,0.1]} />
            </mesh>
          ))}
          <mesh position={[-0.955,1.02,0]} rotation={[0,0,0.4]} material={m.taillight}><boxGeometry args={[0.02,0.04,0.22]} /></mesh>
          {/* accent light strips */}
          {[1,-1].map(z=>(
            <group key={z}>
              <mesh position={[0.5,0.72,z*0.205]} rotation={[0,0,0.42]} material={m.accent}><boxGeometry args={[0.5,0.018,0.01]} /></mesh>
              <mesh position={[-0.68,0.92,z*0.205]} rotation={[0,0,0.38]} material={m.accent}><boxGeometry args={[0.38,0.014,0.01]} /></mesh>
            </group>
          ))}
          {headlightBeam && <>
            <spotLight position={[0.9,0.9,0]} target={spotTarget} angle={0.42} penumbra={0.6} intensity={60} distance={40} decay={1.5} color="#cfefff" />
            <primitive object={spotTarget} position={[8,0,0]} />
          </>}

          {/* rider, tucked */}
          <group>
            <Limb a={[-0.22,1.06,0]} b={[0.16,1.29,0]} r={0.15} material={m.suit} />
            <Limb a={[-0.20,1.17,0]} b={[0.12,1.39,0]} r={0.05} material={m.suitAccent} />
            <mesh position={[0.33,1.40,0]} material={m.helmet} castShadow><sphereGeometry args={[0.135,24,18]} /></mesh>
            <mesh position={[0.42,1.40,0]} scale={[0.6,0.5,0.85]} material={m.visor}><sphereGeometry args={[0.12,20,14]} /></mesh>
            {[1,-1].map(z=>(
              <group key={z}>
                <Limb a={[0.16,1.27,z*0.17]} b={[0.36,1.12,z*0.23]} r={0.055} material={m.suit} />
                <Limb a={[0.36,1.12,z*0.23]} b={[0.51,1.02,z*0.22]} r={0.045} material={m.suit} />
                <Limb a={[-0.26,1.02,z*0.13]} b={[0.06,0.86,z*0.25]} r={0.08} material={m.suit} />
                <Limb a={[0.06,0.86,z*0.25]} b={[-0.22,0.58,z*0.21]} r={0.06} material={m.suit} />
                <mesh position={[0.0,0.92,z*0.31]} material={m.suitAccent}><sphereGeometry args={[0.04,10,8]} /></mesh>
              </group>
            ))}
          </group>
        </group>
      </group>

      {/* world-aligned effects (bike faces −Z) */}
      <mesh ref={trailL} geometry={geo.trail} material={m.trail} position={[-0.06,0.015,0.68]} />
      <mesh ref={trailR} geometry={geo.trail} material={m.trail} position={[0.06,0.015,0.68]} />
      <mesh ref={glowDisc} rotation={[-Math.PI/2,0,0]} position={[0,0.012,0]} material={m.glowDisc}>
        <planeGeometry args={[2.2,3.2]} />
      </mesh>
      <pointLight ref={glowLight} position={[0,0.25,0]} color={accent} distance={5} decay={2} intensity={2} />
    </group>
  );
}
