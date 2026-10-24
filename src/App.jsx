import { Routes, Route, useLocation } from 'react-router-dom';
import CampaignHub from './pages/CampaignHub';
import CampaignRace from './pages/CampaignRace';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import TypingTest from './pages/TypingTest';
import RacingTypingTest from './pages/RacingTypingTest';
import Results from './pages/Results';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

// Remount the race on every navigation so "Restart at Level 1" from Level 1 starts fresh.
function CampaignRaceRoute(){
  const { key } = useLocation();
  return <CampaignRace key={key} />;
}

export default function App(){
  const { pathname } = useLocation();
  const fullBleed = pathname==='/racing' || pathname==='/typing' || pathname.startsWith('/campaign/race');
  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column'}}>
      <Navbar/>
      <main style={{flex:1}}>
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/typing" element={<TypingTest/>} />
          <Route path="/racing" element={<RacingTypingTest/>} />
          <Route path="/campaign" element={<CampaignHub/>} />
          <Route path="/campaign/race/:level" element={<CampaignRaceRoute/>} />
          <Route path="/results" element={<Results/>} />
          <Route path="/login" element={<Login/>} />
          <Route path="/signup" element={<Signup/>} />
          <Route path="/dashboard" element={<Dashboard/>} />
          <Route path="/leaderboard" element={<Leaderboard/>} />
          <Route path="/settings" element={<Settings/>} />
          <Route path="*" element={<NotFound/>} />
        </Routes>
      </main>
      {!fullBleed && <Footer/>}
    </div>
  );
}
