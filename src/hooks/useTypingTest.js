import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { calculateWPM, calculateGrossWPM, calculateAccuracy } from '../utils/typingCalculations';

/*
 * Typing engine shared by the Typing Test and 3D Race pages.
 *
 * status: idle → running ⇄ paused → finished
 *  - autoStart: the first keystroke starts the clock (Typing Test).
 *    The race page passes autoStart:false and calls start() on "GO".
 *  - timed:false counts up instead of down.
 *  - One interval at most, owned by the effect keyed on `status`.
 *  - Elapsed time = sum of running segments, so pauses never leak into WPM.
 *  - getMoreText(): when it returns text, the passage is extended before the
 *    typist reaches the end, so timed runs never stall on a short quote.
 */
export function useTypingTest({ duration=60, timed=true, autoStart=true, onKeystroke, getMoreText } = {}){
  const [text, setText] = useState('');
  const [typed, setTyped] = useState('');
  const [status, setStatus] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [keys, setKeys] = useState({ total:0, correct:0 });

  const clock = useRef({ acc:0, segStart:0 });
  const live = useRef({});
  const callbacks = useRef({});
  callbacks.current = { onKeystroke, getMoreText };

  const readElapsed = ()=>{
    const c = clock.current;
    return c.acc + (c.segStart ? (performance.now()-c.segStart)/1000 : 0);
  };

  const { correctChars, incorrectChars } = useMemo(()=>{
    let correct = 0;
    for(let i=0;i<typed.length;i++) if(typed[i]===text[i]) correct++;
    return { correctChars:correct, incorrectChars:typed.length-correct };
  },[typed,text]);

  const netWpm = calculateWPM(correctChars, elapsed);
  const grossWpm = calculateGrossWPM(typed.length, elapsed);
  const accuracy = calculateAccuracy(keys.correct, keys.total);

  live.current = { text, typed, status, correctChars, incorrectChars, keys, duration, timed };

  const start = useCallback(()=>{
    clock.current = { acc:0, segStart:performance.now() };
    setElapsed(0);
    setStatus('running');
  },[]);

  const pause = useCallback(()=>{
    if(live.current.status!=='running') return;
    const c = clock.current;
    c.acc = readElapsed(); c.segStart = 0;
    setElapsed(c.acc);
    setStatus('paused');
  },[]);

  const resume = useCallback(()=>{
    if(live.current.status!=='paused') return;
    clock.current.segStart = performance.now();
    setStatus('running');
  },[]);

  const finish = useCallback(()=>{
    const s = live.current.status;
    if(s!=='running' && s!=='paused') return;
    const c = clock.current;
    let t = readElapsed();
    if(live.current.timed) t = Math.min(t, live.current.duration);
    c.acc = t; c.segStart = 0;
    setElapsed(t);
    setStatus('finished');
  },[]);

  const reset = useCallback((newText)=>{
    clock.current = { acc:0, segStart:0 };
    if(newText!==undefined) setText(newText);
    setTyped('');
    setKeys({ total:0, correct:0 });
    setElapsed(0);
    setStatus('idle');
  },[]);

  // The single clock interval.
  useEffect(()=>{
    if(status!=='running') return;
    const id = setInterval(()=>{
      const t = readElapsed();
      if(live.current.timed && t>=live.current.duration) finish();
      else setElapsed(t);
    },100);
    return ()=> clearInterval(id);
  },[status, finish]);

  const handleInput = useCallback((value)=>{
    const cur = live.current;
    if(cur.status==='idle' && autoStart && value.length>0) start();
    else if(cur.status!=='running') return;

    let p = 0;
    const prev = cur.typed;
    while(p<prev.length && p<value.length && prev[p]===value[p]) p++;
    const added = value.slice(p, p + Math.max(0, cur.text.length - p));
    const next = value.slice(0, p) + added;

    if(added.length){
      let ok = 0;
      for(let i=0;i<added.length;i++){
        const correct = added[i]===cur.text[p+i];
        if(correct) ok++;
        callbacks.current.onKeystroke?.(correct);
      }
      setKeys(k=>({ total:k.total+added.length, correct:k.correct+ok }));
    }
    setTyped(next);

    const remaining = cur.text.length - next.length;
    if(remaining<=30 && cur.timed){
      const more = callbacks.current.getMoreText?.();
      if(more){ setText(t=> t + ' ' + more); return; }
    }
    if(remaining<=0) setTimeout(finish, 0);
  },[autoStart, start, finish]);

  // Snapshot for saving: read from refs so it is correct even inside callbacks.
  const getResults = useCallback(()=>{
    const cur = live.current;
    const t = clock.current.acc || readElapsed();
    return {
      wpm: calculateWPM(cur.correctChars, t),
      grossWpm: calculateGrossWPM(cur.typed.length, t),
      accuracy: calculateAccuracy(cur.keys.correct, cur.keys.total),
      correctChars: cur.correctChars,
      errorChars: cur.incorrectChars,
      totalTyped: cur.typed.length,
      keystrokes: cur.keys.total,
      correctKeystrokes: cur.keys.correct,
      elapsedSeconds: Math.round(t*10)/10,
    };
  },[]);

  return {
    text, typed, status, elapsed,
    timeLeft: timed ? Math.max(0, duration-elapsed) : null,
    correctChars, incorrectChars, totalTyped: typed.length,
    keystrokes: keys.total, correctKeystrokes: keys.correct,
    netWpm, grossWpm, accuracy,
    progress: timed ? Math.min(1, elapsed/duration) : (text.length ? typed.length/text.length : 0),
    start, pause, resume, finish, reset, handleInput, getResults,
  };
}
