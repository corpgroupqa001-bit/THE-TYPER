import { useMemo } from 'react';

export default function TypingArea({ text, input, onChange, finished }){
  const rendered = useMemo(()=>{
    const spans = [];
    const typed = input || '';
    for(let i=0;i<text.length;i++){
      const char = text[i];
      const typedChar = typed[i];
      let cls = '';
      if(i < typed.length){
        cls = typedChar === char ? 'text-cyan' : 'text-red';
      } else if(i === typed.length){
        cls = 'current';
      }
      spans.push(<span key={i} className={cls} style={{...styles.char,...styles[cls]}}>{char}</span>);
    }
    // show extra typed chars
    if(typed.length > text.length){
      for(let i=text.length;i<typed.length;i++){
        spans.push(<span key={i} style={{...styles.char,color:'var(--error)'}}>{typed[i]}</span>);
      }
    }
    return spans;
  },[text,input]);

  return (
    <div className="card glass neon-border" style={{padding:'1.5rem',position:'relative',overflow:'auto'}}>
      <div style={{fontSize:'1.25rem',lineHeight:'2',whiteSpace:'pre-wrap',wordBreak:'break-word'}}>
        {rendered}
      </div>
      <textarea
        value={input}
        onChange={onChange}
        disabled={finished}
        placeholder="Start typing..."
        style={{
          position:'absolute',inset:0,opacity:0,pointerEvents:'none',
        }}
      />
    </div>
  );
}

const styles = {
  char:{position:'relative'},
  'text-cyan':{color:'var(--neon-cyan)'},
  'text-red':{color:'var(--error)',textDecoration:'underline'},
  current:{background:'rgba(34,211,238,0.25)',caretColor:'var(--neon-cyan)'},
};
