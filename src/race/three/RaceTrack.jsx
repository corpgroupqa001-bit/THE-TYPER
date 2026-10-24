import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { makeAsphaltTexture, makeGlowTexture, makeWindowTexture, mulberry32, useDisposable } from './textures';

/*
 * The world never moves the bike forward; instead repeating roadside groups
 * slide toward the camera by (travel mod period). Every object inside a group
 * repeats with that period, so the wrap is seamless and nothing is created per frame.
 */
const ROAD_HALF = 7;
const ROAD_LEN = 440;
const ROAD_CENTER_Z = -190;
const ROAD_PERIOD = 72;     // dashes (9), posts (6) and lamps (36) all divide it
const CITY_PERIOD = 120;
const Z_NEAR = 36, Z_FAR = -400;
const LANES = [-2.33, 2.33];

const dummy = new THREE.Object3D();

function useInstanceLayout(ref, items){
  useLayoutEffect(()=>{
    const mesh = ref.current;
    if(!mesh) return;
    items.forEach((it,i)=>{
      dummy.position.set(...it.p);
      dummy.rotation.set(...(it.r || [0,0,0]));
      dummy.scale.set(...(it.s || [1,1,1]));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  },[ref, items]);
}

function Instances({ items, geometry, material, castShadow=false }){
  const ref = useRef();
  useInstanceLayout(ref, items);
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={castShadow} frustumCulled={false} />;
}

function range(step, from=Z_NEAR, to=Z_FAR){
  const out = [];
  for(let z=from; z>=to; z-=step) out.push(z);
  return out;
}

function Road({ engine, quality, edges=['#22d3ee','#a855f7'] }){
  const asphalt = useDisposable(()=>{
    const t = makeAsphaltTexture();
    t.repeat.set(2, ROAD_LEN/8);
    return t;
  },[]);
  const tileLen = 8;

  useFrame(()=>{
    asphalt.offset.y = (engine.travel/tileLen) % 1;
  });

  return (
    <group>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,ROAD_CENTER_Z]} receiveShadow>
        <planeGeometry args={[ROAD_HALF*2+2, ROAD_LEN]} />
        {quality==='high' ? (
          <MeshReflectorMaterial
            map={asphalt} color="#8f96a8" roughness={0.75} metalness={0.35}
            blur={[260,80]} resolution={512} mixBlur={1} mixStrength={2.2} mixContrast={1}
            depthScale={0.6} minDepthThreshold={0.4} maxDepthThreshold={1.2} mirror={0.5}
          />
        ) : (
          <meshStandardMaterial map={asphalt} color="#8f96a8" roughness={0.55} metalness={0.3} />
        )}
      </mesh>
      {/* shoulders & ground */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.02,ROAD_CENTER_Z]} receiveShadow>
        <planeGeometry args={[400, ROAD_LEN]} />
        <meshStandardMaterial color="#05070d" roughness={0.9} />
      </mesh>
      {/* continuous edge lines */}
      {[-1,1].map(side=>(
        <mesh key={side} rotation={[-Math.PI/2,0,0]} position={[side*(ROAD_HALF-0.4),0.012,ROAD_CENTER_Z]}>
          <planeGeometry args={[0.16, ROAD_LEN]} />
          <meshBasicMaterial color={new THREE.Color(side<0 ? edges[0] : edges[1]).multiplyScalar(1.6)} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Roadside({ engine }){
  const group = useRef();
  const res = useDisposable(()=>{
    const glow = makeGlowTexture();
    return {
      glow,
      dashGeo: new THREE.BoxGeometry(0.11, 0.02, 3.2),
      postGeo: new THREE.BoxGeometry(0.14, 1.0, 0.14),
      capGeo: new THREE.BoxGeometry(0.16, 0.08, 0.05),
      poleGeo: new THREE.CylinderGeometry(0.09, 0.13, 7, 8),
      armGeo: new THREE.BoxGeometry(2.1, 0.1, 0.16),
      lampGeo: new THREE.BoxGeometry(1.1, 0.07, 0.28),
      poolGeo: new THREE.PlaneGeometry(7, 9),
      dashMat: new THREE.MeshBasicMaterial({ color: new THREE.Color('#cbd5e1').multiplyScalar(0.75) }),
      postMat: new THREE.MeshStandardMaterial({ color:'#1a1f2b', metalness:0.7, roughness:0.4 }),
      capCyan: new THREE.MeshBasicMaterial({ color: new THREE.Color('#22d3ee').multiplyScalar(2.5), toneMapped:false }),
      capMagenta: new THREE.MeshBasicMaterial({ color: new THREE.Color('#e879f9').multiplyScalar(2.5), toneMapped:false }),
      poleMat: new THREE.MeshStandardMaterial({ color:'#202634', metalness:0.8, roughness:0.35 }),
      lampMat: new THREE.MeshBasicMaterial({ color: new THREE.Color('#bdf4ff').multiplyScalar(3), toneMapped:false }),
      poolCyan: new THREE.MeshBasicMaterial({ color:'#38bdf8', map:glow, transparent:true, opacity:0.22, blending:THREE.AdditiveBlending, depthWrite:false }),
      poolViolet: new THREE.MeshBasicMaterial({ color:'#a78bfa', map:glow, transparent:true, opacity:0.22, blending:THREE.AdditiveBlending, depthWrite:false }),
    };
  },[]);

  const layout = useMemo(()=>{
    const dashes = [], posts = [], capsL = [], capsR = [], poles = [], arms = [], lamps = [], poolsL = [], poolsR = [];
    for(const z of range(9)) for(const x of LANES) dashes.push({ p:[x,0.012,z] });
    for(const z of range(6)) for(const side of [-1,1]){
      posts.push({ p:[side*8.2,0.5,z] });
      (side<0?capsL:capsR).push({ p:[side*8.2,0.86,z+0.09] });
    }
    // Lamps alternate sides every 36 m → whole pattern repeats every 72 m.
    for(const z of range(36)){
      const side = Math.round((Z_NEAR - z)/36) % 2 === 0 ? -1 : 1;
      poles.push({ p:[side*9.4,3.5,z] });
      arms.push({ p:[side*8.45,6.95,z] });
      lamps.push({ p:[side*7.9,6.86,z] });
      (side<0?poolsL:poolsR).push({ p:[side*5.2,0.02,z], r:[-Math.PI/2,0,0] });
    }
    return { dashes, posts, capsL, capsR, poles, arms, lamps, poolsL, poolsR };
  },[]);

  useFrame(()=>{
    if(group.current) group.current.position.z = engine.travel % ROAD_PERIOD;
  });

  return (
    <>
      <group ref={group}>
        <Instances items={layout.dashes} geometry={res.dashGeo} material={res.dashMat} />
        <Instances items={layout.posts} geometry={res.postGeo} material={res.postMat} />
        <Instances items={layout.capsL} geometry={res.capGeo} material={res.capCyan} />
        <Instances items={layout.capsR} geometry={res.capGeo} material={res.capMagenta} />
        <Instances items={layout.poles} geometry={res.poleGeo} material={res.poleMat} castShadow />
        <Instances items={layout.arms} geometry={res.armGeo} material={res.poleMat} />
        <Instances items={layout.lamps} geometry={res.lampGeo} material={res.lampMat} />
        <Instances items={layout.poolsL} geometry={res.poolGeo} material={res.poolCyan} />
        <Instances items={layout.poolsR} geometry={res.poolGeo} material={res.poolViolet} />
      </group>
      {/* continuous barrier rails with a neon strip */}
      {[-1,1].map(side=>(
        <group key={side}>
          <mesh position={[side*8.3,0.62,ROAD_CENTER_Z]} castShadow>
            <boxGeometry args={[0.1,0.32,ROAD_LEN]} />
            <meshStandardMaterial color="#2a3242" metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[side*8.24,0.62,ROAD_CENTER_Z]}>
            <boxGeometry args={[0.02,0.04,ROAD_LEN]} />
            <meshBasicMaterial color={new THREE.Color(side<0?'#22d3ee':'#e879f9').multiplyScalar(2)} toneMapped={false} />
          </mesh>
          <mesh position={[side*10.6,0.08,ROAD_CENTER_Z]} receiveShadow>
            <boxGeometry args={[4,0.16,ROAD_LEN]} />
            <meshStandardMaterial color="#0b0f18" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </>
  );
}

const CLASSES = [
  { key:'low',  h:[10,22], rows:7,  cols:7,  tints:['120,220,255','255,160,230'] },
  { key:'mid',  h:[26,48], rows:14, cols:8,  tints:['150,170,255','120,220,255'] },
  { key:'tall', h:[56,96], rows:26, cols:9,  tints:['200,140,255','110,200,255'] },
];

function City({ engine, quality }){
  const group = useRef();
  const res = useDisposable(()=>{
    const box = new THREE.BoxGeometry(1,1,1); box.translate(0,0.5,0);
    const out = { box,
      neonCyan: new THREE.MeshBasicMaterial({ color:new THREE.Color('#22d3ee').multiplyScalar(2.2), toneMapped:false }),
      neonMagenta: new THREE.MeshBasicMaterial({ color:new THREE.Color('#e879f9').multiplyScalar(2.2), toneMapped:false }),
    };
    CLASSES.forEach((c,i)=>{
      const tex = makeWindowTexture(11+i*7, c.tints[0], c.rows, c.cols);
      out[c.key+'Tex'] = tex;
      out[c.key] = new THREE.MeshStandardMaterial({ color:'#0a0e1a', roughness:0.55, metalness:0.4, emissive:'#ffffff', emissiveMap:tex, emissiveIntensity:1.35 });
    });
    return out;
  },[]);

  const layout = useMemo(()=>{
    const rand = mulberry32(42);
    const byClass = { low:[], mid:[], tall:[] }, neonC = [], neonM = [];
    const chunk = [];
    for(const side of [-1,1]){
      let z = 0;
      while(z < CITY_PERIOD){
        const len = 8 + rand()*12;
        const depth = 8 + rand()*14;
        const r = rand();
        const cls = r<0.4 ? CLASSES[0] : r<0.8 ? CLASSES[1] : CLASSES[2];
        const h = cls.h[0] + rand()*(cls.h[1]-cls.h[0]);
        const x = side*(17 + rand()*8 + depth/2);
        chunk.push({ cls:cls.key, x, z: -(z+len/2), w:depth, h, d:len, neon: rand(), side });
        z += len + 2 + rand()*6;
      }
      // a second, taller row further back
      z = rand()*10;
      while(z < CITY_PERIOD){
        const len = 12 + rand()*16, depth = 14 + rand()*16;
        const h = 40 + rand()*90;
        chunk.push({ cls: h>56 ? 'tall':'mid', x: side*(48 + rand()*20 + depth/2), z: -(z+len/2), w:depth, h, d:len, neon:1, side });
        z += len + 4 + rand()*10;
      }
    }
    const chunks = Math.ceil((Z_NEAR - Z_FAR + CITY_PERIOD)/CITY_PERIOD);
    for(let c=0;c<chunks;c++){
      const base = Z_NEAR - c*CITY_PERIOD;
      for(const b of chunk){
        const z = base + b.z;
        byClass[b.cls].push({ p:[b.x,0,z], s:[b.w,b.h,b.d] });
        if(b.neon<0.45){
          const target = b.neon<0.22 ? neonC : neonM;
          target.push({ p:[b.x,b.h+0.15,z], s:[b.w*1.02,0.3,b.d*1.02] });
          // vertical strip on the road-facing corner
          target.push({ p:[b.x - b.side*b.w/2, b.h/2, z + b.d/2], s:[0.25,b.h,0.25] });
        }
      }
    }
    return { byClass, neonC, neonM };
  },[]);

  useFrame(()=>{
    if(group.current) group.current.position.z = engine.travel % CITY_PERIOD;
  });

  return (
    <group ref={group}>
      {CLASSES.map(c=>(
        <Instances key={c.key} items={layout.byClass[c.key]} geometry={res.box} material={res[c.key]} castShadow={quality==='high' && c.key==='low'} />
      ))}
      <Instances items={layout.neonC} geometry={res.box} material={res.neonCyan} />
      <Instances items={layout.neonM} geometry={res.box} material={res.neonMagenta} />
    </group>
  );
}

// Distant static skyline — far enough that parallax is negligible.
function Skyline(){
  const res = useDisposable(()=>{
    const box = new THREE.BoxGeometry(1,1,1); box.translate(0,0.5,0);
    const tex = makeWindowTexture(99, '170,150,255', 24, 10);
    return {
      box, tex,
      mat: new THREE.MeshBasicMaterial({ color:'#0b0a22', fog:false }),
      lit: new THREE.MeshBasicMaterial({ color:'#3b2f7a', map:tex, transparent:true, opacity:0.55, fog:false, blending:THREE.AdditiveBlending, depthWrite:false }),
    };
  },[]);
  const items = useMemo(()=>{
    const rand = mulberry32(5);
    const out = [];
    for(let x=-320; x<320; x+= 10 + rand()*16){
      const h = 30 + rand()*rand()*170 + (Math.abs(x)<60 ? 40 : 0);
      out.push({ p:[x, -1, -360 - rand()*60], s:[10+rand()*18, h, 12] });
    }
    const lit = out.map(it=>({ p:[it.p[0], it.p[1], it.p[2]+6.1], s:[it.s[0]*0.9, it.s[1]*0.97, 0.1] }));
    return { solid:out, lit };
  },[]);
  return (
    <group>
      <Instances items={items.solid} geometry={res.box} material={res.mat} />
      <Instances items={items.lit} geometry={res.box} material={res.lit} />
    </group>
  );
}

function Sky({ colors }){
  const mat = useDisposable(()=> new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite:false, fog:false,
    uniforms:{
      top:{ value:new THREE.Color('#03040c') },
      mid:{ value:new THREE.Color('#120a35') },
      horizon:{ value:new THREE.Color('#5b1d6e') },
      glow:{ value:new THREE.Color('#0e7490') },
    },
    vertexShader:`varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 glow; varying vec3 vP;
      void main(){
        float h = clamp(vP.y, -0.2, 1.0);
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.18, h));
        c = mix(c, top, smoothstep(0.18, 0.7, h));
        float ahead = pow(max(0.0, -vP.z), 6.0) * (1.0 - smoothstep(0.0, 0.25, abs(h)));
        c += glow * ahead * 0.6;
        gl_FragColor = vec4(c, 1.0);
      }`,
  }),[]);
  useEffect(()=>{
    const c = { top:'#03040c', mid:'#120a35', horizon:'#5b1d6e', glow:'#0e7490', ...colors };
    for(const k of ['top','mid','horizon','glow']) mat.uniforms[k].value.set(c[k]);
  },[mat, colors]);

  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[480, 32, 16]} />
    </mesh>
  );
}

export default function RaceTrack({ engine, quality, theme }){
  return (
    <>
      <Sky colors={theme?.sky} />
      <Skyline />
      <Road engine={engine} quality={quality} edges={theme?.edges} />
      <Roadside engine={engine} />
      <City engine={engine} quality={quality} />
    </>
  );
}
