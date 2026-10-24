import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup(){
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [show,setShow]=useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [err,setErr]=useState('');

  const submit = (e)=>{
    e.preventDefault();
    if(password!==confirm){ setErr('Passwords do not match'); return; }
    try{
      signup({name,email,password});
      navigate('/typing');
    }catch(e){ setErr(e.message); }
  };

  return (
    <div className="container" style={{maxWidth:520,marginTop:'4rem'}}>
      <div className="card glass">
        <h2 className="neon-text">Sign Up</h2>
        <form onSubmit={submit} className="grid" style={{marginTop:'1rem'}}>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} required/>
          <label className="label">Email</label>
          <input className="input" value={email} onChange={e=>setEmail(e.target.value)} required/>
          <label className="label">Password</label>
          <div style={{position:'relative'}}>
            <input className="input" type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required/>
            <button type="button" onClick={()=>setShow(s=>!s)} style={{position:'absolute',right:10,top:10}}>{show?'Hide':'Show'}</button>
          </div>
          <label className="label">Confirm Password</label>
          <input className="input" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required/>
          {err && <div style={{color:'var(--error)'}}>{err}</div>}
          <button className="btn">Create Account</button>
        </form>
        <p style={{marginTop:'1rem',color:'var(--muted)'}}>Have account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
}
