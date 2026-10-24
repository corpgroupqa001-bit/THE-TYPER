import { createContext, useContext, useEffect, useState } from 'react';
import { isStrongPassword, isValidEmail, normalizeEmail } from '../utils/validation';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const STORAGE_KEY = 'tt_users';
const SESSION_KEY = 'tt_session';

export function AuthProvider({ children }){
  const [user, setUser] = useState(null);

  useEffect(()=>{
    const session = localStorage.getItem(SESSION_KEY);
    if(session) setUser(JSON.parse(session));
  },[]);

  const saveUsers = (users) => localStorage.setItem(STORAGE_KEY, JSON.stringify(users));

  const getUsers = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  };

  const signup = ({email: rawEmail, password, name}) => {
    const email = normalizeEmail(rawEmail);
    if(!isValidEmail(email)) throw new Error('Enter a valid email address.');
    if(!isStrongPassword(password)) throw new Error('Password must be at least 8 characters with 1 capital letter and 1 special character.');
    const users = getUsers();
    if(users.find(u=>normalizeEmail(u.email)===email)) throw new Error('An account with this email already exists. Log in instead.');
    const newUser = { id: crypto.randomUUID(), email, password, name, createdAt: Date.now() };
    users.push(newUser);
    saveUsers(users);
    login({email, password});
  };

  const login = ({email: rawEmail, password}) => {
    const email = normalizeEmail(rawEmail);
    const users = getUsers();
    const found = users.find(u=>normalizeEmail(u.email)===email && u.password===password);
    if(!found) throw new Error('Invalid credentials');
    const { password: _, ...safe } = found;
    setUser(safe);
    localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
  };

  const loginGuest = () => {
    const guest = { id:'guest', name:'Guest', email:'guest@local', isGuest:true };
    setUser(guest);
    localStorage.setItem(SESSION_KEY, JSON.stringify(guest));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, signup, login, loginGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
