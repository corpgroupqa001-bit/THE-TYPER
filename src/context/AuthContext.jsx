import { createContext, useContext, useEffect, useState } from 'react';

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

  const signup = ({email, password, name}) => {
    const users = getUsers();
    if(users.find(u=>u.email===email)) throw new Error('Email already registered');
    const newUser = { id: crypto.randomUUID(), email, password, name, createdAt: Date.now() };
    users.push(newUser);
    saveUsers(users);
    login({email, password});
  };

  const login = ({email, password}) => {
    const users = getUsers();
    const found = users.find(u=>u.email===email && u.password===password);
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
