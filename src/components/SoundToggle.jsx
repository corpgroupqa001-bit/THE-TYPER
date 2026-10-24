import { Volume2, VolumeX } from 'lucide-react';
import { useTypingSounds } from '../hooks/useTypingSounds';

export default function SoundToggle(){
  const { enabled, setEnabled } = useTypingSounds();
  return (
    <button className="btn" onClick={()=> setEnabled(v=>!v)} style={{padding:'.4rem .7rem',background:'transparent',border:'1px solid var(--border)'}} title="Toggle sound">
      {enabled ? <Volume2 size={16}/> : <VolumeX size={16}/>}
    </button>
  );
}
