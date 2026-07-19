'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function doLogin(e) {
    e.preventDefault(); setErr(''); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) { setErr('Correo o contraseña incorrectos.'); setLoading(false); return; }
    let { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
    if (!profile) {
      const m = data.user.user_metadata || {};
      await supabase.from('profiles').insert({ id: data.user.id, role: m.role || 'paciente',
        name: m.name || 'Usuario', cedula: m.cedula, phone: m.phone, dob: m.dob || null });
      profile = { role: m.role || 'paciente' };
    }
    router.push(profile.role === 'admin' ? '/admin' : profile.role === 'fisio' ? '/fisio' : '/paciente');
  }

  return (
    <main style={{maxWidth:420,margin:'0 auto',padding:'80px 24px'}}>
      <div className="logo" style={{textAlign:'center',marginBottom:6}}>
        <span className="w4">Mom</span><span className="w6">en</span><span className="w7">tum</span>
      </div>
      <p style={{textAlign:'center',fontSize:'.6rem',color:'#555',letterSpacing:'.15em',marginBottom:40}}>v3.0 · NEXT + SUPABASE</p>
      <form onSubmit={doLogin} style={{display:'flex',flexDirection:'column',gap:14}}>
        <input type="email" placeholder="correo@ejemplo.com" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input type="password" placeholder="Contraseña" value={pass} onChange={e=>setPass(e.target.value)} required />
        {err && <p style={{color:'var(--danger)',fontSize:'.8rem'}}>{err}</p>}
        <button className="btn" disabled={loading}>{loading ? 'Entrando…' : 'Iniciar sesión'}</button>
      </form>
      <p style={{textAlign:'center',marginTop:16,fontSize:'.82rem'}}>
        <Link href="/recuperar" style={{color:'var(--grey)'}}>¿Olvidaste tu contraseña?</Link>
      </p>
      <p style={{textAlign:'center',marginTop:8,fontSize:'.82rem',color:'var(--grey)'}}>
        ¿No tienes cuenta? <Link href="/registro" style={{color:'var(--white)'}}>Regístrate</Link>
      </p>
    </main>
  );
}
