import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Keyboard, Bike, Flag, LayoutDashboard, Trophy, Settings, LogOut, LogIn, Menu, X, Sun, Moon, ChevronDown, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SoundToggle from './SoundToggle';
import Logo from './Logo';

const LINKS = [
  { to:'/typing', label:'Typing Test', icon:Keyboard },
  { to:'/racing', label:'3D Race', icon:Bike },
  { to:'/campaign', label:'Campaign', icon:Flag },
  { to:'/dashboard', label:'Dashboard', icon:LayoutDashboard },
  { to:'/leaderboard', label:'Leaderboard', icon:Trophy },
];

export default function Navbar(){
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);
  const { pathname } = useLocation();

  useEffect(()=>{ setOpen(false); setMenu(false); },[pathname]);
  useEffect(()=>{
    if(!menu) return;
    const close = (e)=>{ if(!menuRef.current?.contains(e.target)) setMenu(false); };
    const esc = (e)=>{ if(e.key==='Escape') setMenu(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return ()=>{ document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  },[menu]);

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="nav-logo" aria-label="THE TYPER home">
          <Logo size="sm" />
        </Link>

        <nav className={`nav-links ${open?'is-open':''}`} aria-label="Main">
          {LINKS.map(({ to, label, icon:Icon })=>(
            <NavLink key={to} to={to} className={({ isActive })=> `nav-link ${isActive?'is-active':''}`}>
              <Icon size={15}/> {label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-right">
          <SoundToggle />
          <button type="button" className="nav-icon" onClick={toggleTheme} aria-label={`Switch to ${theme==='dark'?'light':'dark'} theme`}>
            {theme==='dark' ? <Sun size={16}/> : <Moon size={16}/>}
          </button>
          {user ? (
            <div className="nav-profile" ref={menuRef}>
              <button type="button" className="nav-user" onClick={()=> setMenu(m=>!m)} aria-expanded={menu} aria-haspopup="menu">
                <span className="nav-avatar">{(user.name||'?')[0].toUpperCase()}</span>
                <span className="nav-hide-sm">{user.name}</span>
                <ChevronDown size={14}/>
              </button>
              {menu && (
                <div className="nav-menu" role="menu">
                  <div className="nav-menu-head"><User size={14}/> {user.isGuest ? 'Guest session' : user.email}</div>
                  <Link to="/settings" role="menuitem"><Settings size={15}/> Settings</Link>
                  <button type="button" role="menuitem" onClick={logout}><LogOut size={15}/> Log out</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/settings" className="nav-icon" aria-label="Settings"><Settings size={16}/></Link>
              <Link to="/login" className="nav-login"><LogIn size={15}/> <span className="nav-hide-sm">Log in</span></Link>
            </>
          )}
          <button type="button" className="nav-icon nav-burger" onClick={()=> setOpen(o=>!o)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X size={18}/> : <Menu size={18}/>}
          </button>
        </div>
      </div>
    </header>
  );
}
