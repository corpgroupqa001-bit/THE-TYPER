export default function Footer(){
  return (
    <footer style={{marginTop:'auto',padding:'2rem 0',textAlign:'center',color:'var(--muted)'}}>
      <div className="container">
        <p>© {new Date().getFullYear()} THE TYPER • Futuristic typing test • Demo auth only</p>
      </div>
    </footer>
  );
}
