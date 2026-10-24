// Form validation shared by Login, Signup and the auth context.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email){
  return String(email || '').trim().toLowerCase();
}

export function isValidEmail(email){
  return EMAIL_RE.test(normalizeEmail(email));
}

// Password policy: at least 8 characters, 1 capital letter, 1 special character.
export const PASSWORD_RULES = [
  { id:'length',  label:'At least 8 characters',            test:(p)=> p.length >= 8 },
  { id:'upper',   label:'1 capital letter (A–Z)',            test:(p)=> /[A-Z]/.test(p) },
  { id:'special', label:'1 special character (e.g. ! @ # $)', test:(p)=> /[^A-Za-z0-9\s]/.test(p) },
];

export function passwordChecks(password=''){
  return PASSWORD_RULES.map(r=>({ ...r, ok: r.test(password) }));
}

export function isStrongPassword(password=''){
  return PASSWORD_RULES.every(r=> r.test(password));
}
