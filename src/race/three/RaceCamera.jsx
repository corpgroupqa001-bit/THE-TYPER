import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/*
 * Camera modes driven by the UI phase:
 *  ready     — slow cinematic orbit around the bike
 *  countdown / racing / paused — third-person chase, behind and above
 *  finished  — swings round to a low front three-quarter shot
 * Speed widens the FOV and pulls the camera back; high speed and nitro add shake.
 */
export default function RaceCamera({ engine, opponent, phase, reducedMotion }){
  const { camera } = useThree();
  const state = useRef({ t:0, finishT:0 });
  const tmp = useMemo(()=>({ pos:new THREE.Vector3(), look:new THREE.Vector3(), curLook:new THREE.Vector3(0,0.9,-6) }),[]);

  useFrame((_, rawDt)=>{
    const dt = Math.min(rawDt, 0.1);
    const st = state.current;
    st.t += dt;
    const s = engine.speed/100;
    const nitro = engine.nitroTime>0 ? 1 : 0;
    const { pos, look } = tmp;
    let damping = 3.2;

    // In a duel, frame the midpoint between the two bikes (AI sits at z = −visualGap).
    const duel = !!opponent;
    const midZ = duel ? -opponent.visualGap/2 : 0;
    const spread = duel ? Math.abs(opponent.visualGap) : 0;
    // Portrait/narrow screens: back off so both lanes stay in frame.
    const widen = duel ? THREE.MathUtils.clamp(1.5/camera.aspect, 1, 2.4) : 1;

    if(phase==='ready'){
      const a = st.t*0.12 + 0.6;
      const r = duel ? 8.5*widen : 4.4;
      pos.set(Math.sin(a)*r, (duel?2.2:1.25) + Math.sin(st.t*0.3)*0.15, Math.cos(a)*r - 0.2);
      look.set(0, 0.75, 0);
      damping = 1.6;
      st.finishT = 0;
    } else if(phase==='finished'){
      st.finishT += dt;
      const k = Math.min(1, st.finishT/3);
      const e = 1 - Math.pow(1-k, 3);
      const a = THREE.MathUtils.lerp(0.15, -2.3, e) + (k>=1 ? (st.finishT-3)*0.05 : 0);
      const r = duel ? THREE.MathUtils.lerp(9, 8 + spread*0.4, e)*widen : THREE.MathUtils.lerp(5, 3.6, e);
      pos.set(Math.sin(a)*r, THREE.MathUtils.lerp(duel?2.6:1.9, duel?1.6:0.9, e), midZ + Math.cos(a)*r);
      look.set(0, 0.7, midZ);
      damping = 2.2;
    } else {
      const back = 3.5 + s*1.0 + nitro*0.5 - THREE.MathUtils.clamp(engine.accel*0.01, -0.3, 0.4);
      if(duel){
        pos.set(0, 2.7 + s*0.2 + spread*0.05 + (widen-1)*2.2, midZ + (back + 3.6)*widen + spread*0.42);
        look.set(0, 0.8, midZ - 7);
      } else {
        pos.set(0, 1.5 + s*0.2, back);
        look.set(0, 0.9, -6);
      }
      if(!reducedMotion){
        const shake = Math.max(0, (s-0.55)/0.45)*0.035 + nitro*0.03 + engine.errorFlash*0.02;
        pos.x += (Math.sin(st.t*37.1)+Math.sin(st.t*23.7))*shake*0.5;
        pos.y += (Math.sin(st.t*41.3)+Math.cos(st.t*29.9))*shake*0.4;
      }
      damping = phase==='countdown' ? 1.8 : 4;
    }

    camera.position.x = THREE.MathUtils.damp(camera.position.x, pos.x, damping, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, pos.y, damping, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, pos.z, damping, dt);
    tmp.curLook.x = THREE.MathUtils.damp(tmp.curLook.x, look.x, damping, dt);
    tmp.curLook.y = THREE.MathUtils.damp(tmp.curLook.y, look.y, damping, dt);
    tmp.curLook.z = THREE.MathUtils.damp(tmp.curLook.z, look.z, damping, dt);
    camera.lookAt(tmp.curLook);

    const targetFov = phase==='racing' || phase==='paused'
      ? 56 + s*(reducedMotion?4:14) + nitro*(reducedMotion?0:6)
      : 50;
    const fov = THREE.MathUtils.damp(camera.fov, targetFov, 2.5, dt);
    if(Math.abs(fov-camera.fov)>0.01){ camera.fov = fov; camera.updateProjectionMatrix(); }
  });

  return null;
}
