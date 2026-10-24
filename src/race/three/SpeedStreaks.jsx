import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mulberry32, useDisposable } from './textures';

const COUNT = 70;
const NEAR = 12, FAR = -140;
const dummy = new THREE.Object3D();

// Wind streaks around the camera; they appear from ~35% speed and grow with nitro.
export default function SpeedStreaks({ engine }){
  const ref = useRef();
  const res = useDisposable(()=>({
    geo: new THREE.BoxGeometry(0.025, 0.025, 1),
    mat: new THREE.MeshBasicMaterial({ color:new THREE.Color('#a5f3fc').multiplyScalar(1.5), transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false }),
  }),[]);

  const streaks = useMemo(()=>{
    const rand = mulberry32(3);
    return Array.from({ length:COUNT }, ()=>{
      const angle = rand()*Math.PI*2;
      const radius = 2.6 + rand()*7;
      return { x: Math.cos(angle)*radius*1.6, y: Math.max(0.3, 1.6 + Math.sin(angle)*radius*0.7), z: NEAR - rand()*(NEAR-FAR), k: 0.8 + rand()*0.6 };
    });
  },[]);

  useFrame((_, rawDt)=>{
    const mesh = ref.current;
    if(!mesh) return;
    const dt = Math.min(rawDt, 0.1);
    const s = engine.speed/100;
    const nitro = engine.nitroTime>0 ? 1 : 0;
    const intensity = THREE.MathUtils.clamp((s-0.35)/0.5, 0, 1);
    res.mat.opacity = intensity*0.55 + nitro*0.3;
    mesh.visible = res.mat.opacity>0.01;
    if(!mesh.visible) return;
    const v = 30 + s*160 + nitro*80;
    const len = 1 + s*7 + nitro*5;
    for(let i=0;i<COUNT;i++){
      const st = streaks[i];
      st.z += v*st.k*dt;
      if(st.z>NEAR) st.z -= NEAR-FAR;
      dummy.position.set(st.x, st.y, st.z);
      dummy.scale.set(1,1,len*st.k);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[res.geo, res.mat, COUNT]} frustumCulled={false} />;
}
