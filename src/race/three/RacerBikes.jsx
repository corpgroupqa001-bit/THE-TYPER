import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Motorcycle from './Motorcycle';
import { AI_LANE_X, PLAYER_LANE_X } from '../duel';

export function PlayerMotorcycle({ engine, reducedMotion, duel, placement, rootRef }){
  return (
    <Motorcycle
      engine={engine} reducedMotion={reducedMotion} rootRef={rootRef}
      laneX={duel ? PLAYER_LANE_X : 0} weaveScale={duel ? 0.35 : 1} placement={placement}
      paint="#1240c8" accent="#22d3ee"
    />
  );
}

export function AIMotorcycle({ opponent, reducedMotion, placement, rootRef, paint='#b8320f', accent='#ff8a1f' }){
  return (
    <Motorcycle
      engine={opponent.engine} reducedMotion={reducedMotion} rootRef={rootRef}
      laneX={AI_LANE_X} weaveScale={0.35} placement={placement} headlightBeam={false}
      paint={paint} accent={accent}
    />
  );
}

/*
 * Positions both bikes from the duel state each frame. The player bike anchors
 * the world at z = 0; the AI bike is placed by the smoothed progress gap, and
 * the racer that just overtook swerves slightly toward the centre line.
 */
export function useDuelPlacements(opponent, reducedMotion){
  const placements = useMemo(()=>({ player:{ z:0, x:0 }, ai:{ z:0, x:0 } }), []);
  useFrame(()=>{
    if(!opponent) return;
    const swing = (v)=> reducedMotion ? 0 : Math.sin(v*Math.PI)*0.75;
    placements.player.x = swing(opponent.swerve.player);
    placements.ai.z = -opponent.visualGap;
    placements.ai.x = -swing(opponent.swerve.ai);
  });
  return placements;
}

const TAG_HEIGHT = 2.05;
const v = new THREE.Vector3();

/*
 * Name tags are plain DOM elements (rendered next to the canvas) moved each
 * frame to the projected screen position of their bike — no extra React roots.
 */
export function TagProjector({ targets }){
  const { camera, size } = useThree();
  useFrame(()=>{
    for(const { obj, el } of targets){
      const o = obj.current, e = el.current;
      if(!o || !e) continue;
      o.getWorldPosition(v);
      v.y += TAG_HEIGHT;
      v.project(camera);
      const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      e.style.opacity = visible ? '1' : '0';
      if(visible){
        const x = (v.x*0.5 + 0.5)*size.width;
        const y = (-v.y*0.5 + 0.5)*size.height;
        e.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      }
    }
  });
  return null;
}

export function useTagRefs(){
  return { playerObj:useRef(), aiObj:useRef(), playerEl:useRef(), aiEl:useRef() };
}
