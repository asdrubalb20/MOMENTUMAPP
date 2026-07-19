'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Registro() {
  const [f, setF] = useState({ name:'', cedula:'', dob:'', phone:'', email:'', pass:'', role:'paciente', code:'' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const set = k => e => setF({ ...f, [k]: e.target.value });

  async function doRegister(e) {
    e.preventDefault(); setErr('');
    if (f.name.trim().length < 3) return setErr('Ingresa tu nombre completo.');
    if (f.pass.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres.');
    if (f.role === 'fisio' && f.code !== process.env.NEXT_PUBLIC_FISIO_CODE) return setErr('Código de fisioterapeuta incorrecto.');
    if (f.role === 'admin' && f.code !== process.env.NEXT_PUBLIC_ADMIN_CODE) return setErr('Código de administrador incorrecto.');
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: f.email, password: f.pass,
      options: { data: { name: f.name, role: f.role, cedula: f.cedula, dob: f.dob || null, phone: f.phone } }
    });
    if (error) { setErr(error.message); setLoading(false); return; }
    // crear el perfil (no dependemos del trigger de Supabase, que puede no existir)
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id, role: f.role, name: f.name,
        cedula: f.cedula, dob: f.dob || null, phone: f.phone
      });
    }
    // si es paciente, crear su ficha SIN fisio (el fisio lo reclamará luego)
    if (f.role === 'paciente' && data.user) {
      await supabase.from('patients').insert({
        user_id: data.user.id, fisio_id: null, name: f.name,
        age: f.dob ? Math.floor((Date.now()-new Date(f.dob))/31557600000) : null,
        phone: f.phone, email: f.email
      });
    }
    router.push(f.role === 'admin' ? '/admin' : f.role === 'fisio' ? '/fisio' : '/paciente');
  }

  return (
    <main style={{maxWidth:420,margin:'0 auto',padding:'60px 24px'}}>
      <h1 style={{marginBottom:24,fontWeight:700}}>Crear cuenta</h1>
      <form onSubmit={doRegister} style={{display:'flex',flexDirection:'column',gap:12}}>
        <select value={f.role} onChange={set('role')}>
          <option value="paciente">Soy paciente</option>
          <option value="fisio">Soy fisioterapeuta</option>
          <option value="admin">Soy administrador</option>
        </select>
        {f.role==='fisio' && <input placeholder="Código de fisioterapeuta" value={f.code} onChange={set('code')} />}
        {f.role==='admin' && <input placeholder="Código de administrador" value={f.code} onChange={set('code')} />}
        <input placeholder="Nombre y apellido" value={f.name} onChange={set('name')} maxLength={80} required />
        <input placeholder="Cédula" value={f.cedula} onChange={set('cedula')} maxLength={15} />
        <input type="date" value={f.dob} onChange={set('dob')} />
        <input placeholder="Teléfono" value={f.phone} onChange={set('phone')} maxLength={20} />
        <input type="email" placeholder="correo@ejemplo.com" value={f.email} onChange={set('email')} required />
        <input type="password" placeholder="Contraseña (mín. 6)" value={f.pass} onChange={set('pass')} required />
        {err && <p style={{color:'var(--danger)',fontSize:'.8rem'}}>{err}</p>}
        <button className="btn" disabled={loading}>{loading?'Creando…':'Registrarme'}</button>
      </form>
      <p style={{textAlign:'center',marginTop:20,fontSize:'.82rem',color:'var(--grey)'}}>
        <Link href="/" style={{color:'var(--white)'}}>← Volver al inicio de sesión</Link>
      </p>
    </main>
  );
}
