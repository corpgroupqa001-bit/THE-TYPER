import { Link } from 'react-router-dom';
export default function NotFound(){
  return (
    <div className="container" style={{textAlign:'center',paddingTop:'6rem'}}>
      <h1 className="neon-text">404</h1>
      <p style={{color:'var(--muted)'}}>Page not found</p>
      <Link to="/" className="btn" style={{marginTop:'1rem'}}>Go Home</Link>
    </div>
  );
}
