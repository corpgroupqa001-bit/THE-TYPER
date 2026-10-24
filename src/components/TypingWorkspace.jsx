import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MousePointerClick } from 'lucide-react';

const BLOCKED_KEYS = new Set(['Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown']);

// Split into words that keep their trailing space, so a word never wraps mid-way.
function tokenize(text){
  const words = [];
  const re = /\S+\s*|\s+/g;
  let m;
  while((m = re.exec(text))) words.push({ start:m.index, value:m[0] });
  return words;
}

const Word = memo(function Word({ value, start, typedPart }){
  return (
    <span className="tw-word">
      {Array.from(value).map((ch,i)=>{
        const t = typedPart[i];
        const cls = t===undefined ? '' : t===ch ? ' ok' : ' bad';
        return <span key={i} data-i={start+i} className={'tw-ch'+cls+(ch===' '?' sp':'')}>{ch}</span>;
      })}
    </span>
  );
});

/*
 * The typing passage. A hidden textarea owns keyboard input (works with mobile
 * keyboards and IME); the visible text is rendered word by word and a single
 * caret element glides to the next character.
 */
export default function TypingWorkspace({
  text, typed, onInput, disabled=false, active=false, inputRef, fontSize=22, lines=3, idleHint,
}){
  const words = useMemo(()=> tokenize(text), [text]);
  const boxRef = useRef(null);
  const innerRef = useRef(null);
  const caretRef = useRef(null);
  const ownInput = useRef(null);
  const input = inputRef || ownInput;
  const [focused, setFocused] = useState(false);
  const lineHeight = Math.round(fontSize*1.75);

  useLayoutEffect(()=>{
    const inner = innerRef.current, caret = caretRef.current;
    if(!inner || !caret) return;
    const idx = Math.min(typed.length, Math.max(0, text.length-1));
    const el = inner.querySelector(`[data-i="${idx}"]`);
    if(!el){ caret.style.opacity = '0'; return; }
    const atEnd = typed.length>=text.length;
    const left = el.offsetLeft + (atEnd ? el.offsetWidth : 0);
    const top = el.offsetTop;
    caret.style.opacity = '1';
    caret.style.transform = `translate(${left}px, ${top}px)`;
    // Keep the caret on the second visible line once the first line is done.
    const line = Math.round(top/lineHeight);
    inner.style.transform = `translateY(${-Math.max(0, line-1)*lineHeight}px)`;
  },[typed, text, lineHeight, fontSize]);

  const focus = ()=> input.current?.focus({ preventScroll:true });

  return (
    <div
      ref={boxRef}
      className={`tw ${active?'is-active':''} ${focused?'is-focused':''}`}
      onMouseDown={(e)=>{ if(e.target!==input.current){ e.preventDefault(); focus(); } }}
      style={{ '--tw-size':`${fontSize}px`, '--tw-line':`${lineHeight}px`, height: lineHeight*lines }}
    >
      <div ref={innerRef} className="tw-inner" aria-hidden="true">
        {words.map(w=>(
          <Word key={w.start} value={w.value} start={w.start} typedPart={typed.slice(w.start, w.start+w.value.length)} />
        ))}
        <div ref={caretRef} className={`tw-caret ${typed.length===0 && !active ? 'blink':''}`} style={{ height: lineHeight }} />
      </div>
      <textarea
        ref={input}
        className="tw-input"
        value={typed}
        onChange={(e)=> onInput(e.target.value)}
        onKeyDown={(e)=>{ if(BLOCKED_KEYS.has(e.key)) e.preventDefault(); }}
        onSelect={(e)=>{ const t=e.target; if(t.selectionStart!==t.value.length) t.setSelectionRange(t.value.length,t.value.length); }}
        onPaste={(e)=> e.preventDefault()}
        onDrop={(e)=> e.preventDefault()}
        onFocus={()=> setFocused(true)}
        onBlur={()=> setFocused(false)}
        disabled={disabled}
        autoCapitalize="off" autoComplete="off" autoCorrect="off" spellCheck={false}
        aria-label="Typing input"
      />
      <span className="sr-only" aria-live="polite">{typed.length} of {text.length} characters typed</span>
      {!focused && !disabled && (
        <button type="button" className="tw-focus-hint" onClick={focus}>
          <MousePointerClick size={16}/> {idleHint || 'Click here or press any key to focus'}
        </button>
      )}
    </div>
  );
}
