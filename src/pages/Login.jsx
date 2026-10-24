import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, UserRound, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthLayout, TextField, PasswordField } from '../components/AuthForm';
import { isValidEmail, isStrongPassword } from '../utils/validation';

export default function Login(){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const { login, loginGuest } = useAuth();
  const navigate = useNavigate();

  const show = (k)=> submitted || touched[k];
  const emailError = !email.trim() ? 'Enter your email address.'
    : !isValidEmail(email) ? 'Enter a valid email, like name@example.com.' : '';
  const passwordError = !password ? 'Enter your password.'
    : !isStrongPassword(password) ? 'Passwords have at least 8 characters, including 1 capital letter and 1 special character.' : '';

  const submit = (e)=>{
    e.preventDefault();
    setSubmitted(true);
    setFormError('');
    if(emailError || passwordError) return;
    try{
      login({ email, password });
      navigate('/typing');
    }catch{
      setFormError('That email and password don’t match an account. Check them or create an account.');
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in with your email to save your results and climb the leaderboard."
      footer={<>New to THE TYPER? <Link to="/signup">Create an account</Link></>}
    >
      <form onSubmit={submit} noValidate className="auth-form">
        {formError && <div className="auth-alert" role="alert"><AlertCircle size={16}/> {formError}</div>}
        <TextField
          label="Email" type="email" autoComplete="email" inputMode="email" autoFocus
          placeholder="name@example.com" value={email}
          onChange={(e)=>{ setEmail(e.target.value); setFormError(''); }}
          onBlur={()=> setTouched(t=>({ ...t, email:true }))}
          error={show('email') ? emailError : ''}
        />
        <PasswordField
          autoComplete="current-password" placeholder="Your password" value={password}
          onChange={(e)=>{ setPassword(e.target.value); setFormError(''); }}
          onBlur={()=> setTouched(t=>({ ...t, password:true }))}
          error={show('password') ? passwordError : ''}
        />
        <button type="submit" className="rc-btn primary auth-submit"><LogIn size={17}/> Log in</button>
      </form>

      <div className="auth-or"><span>or</span></div>
      <button type="button" className="rc-btn auth-guest" onClick={()=>{ loginGuest(); navigate('/typing'); }}>
        <UserRound size={17}/> Continue as guest
      </button>
      <p className="auth-guest-note">Guest results are saved in this browser under "Guest".</p>
    </AuthLayout>
  );
}
