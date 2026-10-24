import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthLayout, TextField, PasswordField, PasswordRules } from '../components/AuthForm';
import { isValidEmail, isStrongPassword } from '../utils/validation';

export default function Signup(){
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const { signup } = useAuth();
  const navigate = useNavigate();

  const show = (k)=> submitted || touched[k];
  const touch = (k)=> ()=> setTouched(t=>({ ...t, [k]:true }));
  const errors = {
    name: !name.trim() ? 'Enter a display name for the leaderboard.' : '',
    email: !email.trim() ? 'Enter your email address.' : !isValidEmail(email) ? 'Enter a valid email, like name@example.com.' : '',
    password: !password ? 'Create a password.' : !isStrongPassword(password) ? 'Your password doesn’t meet all the requirements below.' : '',
    confirm: !confirm ? 'Re-enter your password.' : confirm!==password ? 'Passwords don’t match.' : '',
  };

  const submit = (e)=>{
    e.preventDefault();
    setSubmitted(true);
    setFormError('');
    if(Object.values(errors).some(Boolean)) return;
    try{
      signup({ name: name.trim(), email, password });
      navigate('/typing');
    }catch(err){
      setFormError(err.message);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Track your progress, race the AI and get ranked under your own name."
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      <form onSubmit={submit} noValidate className="auth-form">
        {formError && <div className="auth-alert" role="alert"><AlertCircle size={16}/> {formError}</div>}
        <TextField label="Display name" autoComplete="nickname" autoFocus placeholder="e.g. Nova" maxLength={24}
          value={name} onChange={(e)=> setName(e.target.value)} onBlur={touch('name')}
          error={show('name') ? errors.name : ''} />
        <TextField label="Email" type="email" autoComplete="email" inputMode="email" placeholder="name@example.com"
          value={email} onChange={(e)=>{ setEmail(e.target.value); setFormError(''); }} onBlur={touch('email')}
          error={show('email') ? errors.email : ''} />
        <PasswordField autoComplete="new-password" placeholder="Create a password"
          value={password} onChange={(e)=> setPassword(e.target.value)} onBlur={touch('password')}
          error={show('password') ? errors.password : ''} />
        <PasswordRules password={password} />
        <PasswordField label="Confirm password" autoComplete="new-password" placeholder="Re-enter your password"
          value={confirm} onChange={(e)=> setConfirm(e.target.value)} onBlur={touch('confirm')}
          error={show('confirm') ? errors.confirm : ''} />
        <button type="submit" className="rc-btn primary auth-submit"><UserPlus size={17}/> Create account</button>
      </form>
    </AuthLayout>
  );
}
