import { useId, useState } from 'react';
import { Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react';
import Logo from './Logo';
import { passwordChecks } from '../utils/validation';

// Centered card with the brand, used by Login and Signup.
export function AuthLayout({ title, subtitle, children, footer }){
  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-brand"><Logo size="md" /></div>
        <h1>{title}</h1>
        {subtitle && <p className="auth-sub">{subtitle}</p>}
        {children}
        {footer && <div className="auth-footer">{footer}</div>}
      </div>
      <p className="auth-demo">Demo sign-in: accounts are stored only in this browser. Don't reuse a real password.</p>
    </div>
  );
}

export function Field({ label, error, hint, children, id }){
  return (
    <div className={`auth-field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <p className="auth-error" id={`${id}-err`} role="alert"><AlertCircle size={14}/> {error}</p>
        : hint ? <p className="auth-hint" id={`${id}-hint`}>{hint}</p> : null}
    </div>
  );
}

export function TextField({ label, error, hint, ...input }){
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} id={id}>
      <input id={id} className="auth-input" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...input} />
    </Field>
  );
}

// Password input with an eye button to show/hide what's typed.
export function PasswordField({ label='Password', error, hint, ...input }){
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <Field label={label} error={error} hint={hint} id={id}>
      <div className="auth-pass">
        <input id={id} className="auth-input" type={show ? 'text' : 'password'}
          aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...input} />
        <button type="button" className="auth-eye" onClick={()=> setShow(s=>!s)}
          aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} title={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff size={18}/> : <Eye size={18}/>}
        </button>
      </div>
    </Field>
  );
}

// Live checklist for the password policy.
export function PasswordRules({ password }){
  return (
    <ul className="auth-rules" aria-label="Password requirements">
      {passwordChecks(password).map(r=>(
        <li key={r.id} className={r.ok ? 'ok' : ''}>
          {r.ok ? <Check size={14}/> : <X size={14}/>} {r.label}
        </li>
      ))}
    </ul>
  );
}
