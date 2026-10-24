import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

export { mulberry32 } from '../random.js';
import { mulberry32 } from '../random.js';

function canvas(w,h){
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

export function makeAsphaltTexture(){
  const [c,ctx] = canvas(256,256);
  ctx.fillStyle = '#16181f'; ctx.fillRect(0,0,256,256);
  const rand = mulberry32(7);
  for(let i=0;i<9000;i++){
    const v = 18 + rand()*34;
    ctx.fillStyle = `rgba(${v},${v},${v+6},${0.35+rand()*0.4})`;
    ctx.fillRect(rand()*256, rand()*256, 1+rand()*1.5, 1+rand()*1.5);
  }
  // faint tyre-worn bands
  const g = ctx.createLinearGradient(0,0,256,0);
  g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(.3,'rgba(0,0,0,.18)');
  g.addColorStop(.5,'rgba(0,0,0,0)'); g.addColorStop(.7,'rgba(0,0,0,.18)'); g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,256,256);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Lit-window facade; cols×rows windows, some dark, a few tinted.
export function makeWindowTexture(seed, tint, rows=16, cols=8){
  const cw = 16, ch = 12;
  const [c,ctx] = canvas(cols*cw, rows*ch);
  ctx.fillStyle = '#000'; ctx.fillRect(0,0,c.width,c.height);
  const rand = mulberry32(seed);
  for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){
    const r = rand();
    if(r<0.45) continue;
    const a = 0.25 + rand()*0.75;
    ctx.fillStyle = r>0.93 ? `rgba(255,214,170,${a})` : `rgba(${tint},${a})`;
    ctx.fillRect(x*cw+3, y*ch+3, cw-6, ch-5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  return t;
}

// White→transparent ramp along V, used for light trails and streaks.
export function makeFadeTexture(){
  const [c,ctx] = canvas(4,128);
  const g = ctx.createLinearGradient(0,0,0,128);
  g.addColorStop(0,'rgba(255,255,255,0)');
  g.addColorStop(0.7,'rgba(255,255,255,.55)');
  g.addColorStop(1,'rgba(255,255,255,1)');
  ctx.fillStyle = g; ctx.fillRect(0,0,4,128);
  return new THREE.CanvasTexture(c);
}

export function makeGlowTexture(){
  const [c,ctx] = canvas(128,128);
  const g = ctx.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,255,255,1)');
  g.addColorStop(0.35,'rgba(255,255,255,.35)');
  g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
}

// useMemo + dispose on unmount for geometries, materials and textures we create imperatively.
export function useDisposable(factory, deps){
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(factory, deps);
  useEffect(()=> ()=>{
    const list = Array.isArray(value) ? value : value && typeof value==='object' && !value.isObject3D && !value.dispose ? Object.values(value) : [value];
    for(const v of list) v?.dispose?.();
  },[value]);
  return value;
}
