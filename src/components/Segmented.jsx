import { useId } from 'react';

// Accessible segmented control (radio group styled as a pill strip).
export default function Segmented({ label, value, options, onChange, disabled=false }){
  const name = useId();
  return (
    <fieldset className="seg" disabled={disabled}>
      <legend className="seg-label">{label}</legend>
      <div className="seg-track">
        {options.map(o=>{
          const id = typeof o==='object' ? o.id : o;
          const text = typeof o==='object' ? o.label : o;
          return (
            <label key={id} className={`seg-opt ${value===id?'is-on':''}`}>
              <input type="radio" name={name} value={id} checked={value===id} onChange={()=> onChange(id)} />
              <span>{text}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
