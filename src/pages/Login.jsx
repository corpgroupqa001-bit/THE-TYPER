import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [show,setShow]=useState(false);
  const { login, loginGuest } = useAuth();
  const navigate = useNavigate();
  const [err,setErr]=useState('');

  const submit = (e)=>{
    e.preventDefault();
    try{
      login({email,password});
      navigate('/typing');
    }catch(e){ setErr(e.message); }
  };

  return (
    <div className="container" style={{maxWidth:520, marginTop:'4rem'}}>
      <div className="card glass">
        <h2 className="neon-text">Login</h2>
        <p style={{color:'var(--muted)'}}>Demo authentication using LocalStorage.</p>
        <form onSubmit={submit} className="grid" style={{marginTop:'1rem'}}>
          <label className="label">Email</label>
          <input className="input" value={email} onChange={e=>setEmail(e.target.value)} required/>
          <label className="label">Password</label>
          <div style={{position:'relative'}}>
            <input className="input" type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required/>
            <button type="button" onClick={()=>setShow(s=>!s)} style={{position:'absolute',right:10,top:10}}>{show?'Hide':'Show'}</button>
          </div>
          {err && <div style={{color:'var(--error)'}}>{err}</div>}
          <button className="btn">Login</button>
          <button type="button" className="btn" onClick={()=>{loginGuest();navigate('/typing');}} style={{background:'transparent',border:'1px solid var(--border)'}}>Continue as Guest</button>
        </form>
        <p style={{marginTop:'1rem',color:'var(--muted)'}}>No account? <Link to="/signup">Sign up</Link></p>
      </div>
    </div>
  );
}
