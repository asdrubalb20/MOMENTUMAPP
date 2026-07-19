'use client';

// Aviso in-app (reemplaza a alert()): banner flotante arriba al centro.
export default function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      position:'fixed', top:20, left:'50%', transform:'translateX(-50%)',
      background:'var(--card)', border:'1px solid var(--border)', color:'var(--white)',
      padding:'11px 20px', borderRadius:10, zIndex:1000, fontSize:'.85rem',
      boxShadow:'0 8px 30px rgba(0,0,0,.5)', maxWidth:'90vw', textAlign:'center'
    }}>
      {msg}
    </div>
  );
}
