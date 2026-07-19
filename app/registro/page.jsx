'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Registro() {
  const [f, setF] = useState({ name:'', cedula:'', dob:'', phone:'', email:'', pass:'', role:'paciente', code:'', fisio_id:'' });
  const [fisios, setFisios] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const set = k => e => setF({ ...f, [k]: e.target.value });

  // cargar fisioterapeutas para que el paciente elija el suyo
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('list_fisios');
      if (!error && data) return setFisios(data);
      // fallback: lectura directa (si RLS aún no expone el RPC)
      const { data: d2 } = await supabase.from('profiles').select('id,name').eq('role','fisio');
      setFisios(d2 || []);
    })();
  }, []);

  async function doRegister(e) {
    e.preventDefault(); setErr('');
    if (f.name.trim().length < 3) return setErr('Ingresa tu nombre completo.');
    if (f.pass.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres.');
    if (f.role === 'fisio' && f.code !== process.env.NEXT_PUBLIC_FISIO_CODE) return setErr('Código de fisioterapeuta incorrecto.');
    if (f.role === 'admin' && f.code !== process.env.NEXT_PUBLIC_ADMIN_CODE) return setErr('Código de administrador incorrecto.');
    if (f.role === 'paciente' && !f.fisio_id) return setErr('Selecciona tu fisioterapeuta.');
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
    // si es paciente, crear su ficha enlazada al fisio que eligió
    if (f.role === 'paciente' && data.user) {
      await supabase.from('patients').insert({
        user_id: data.user.id, fisio_id: f.fisio_id, name: f.name,
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
        {f.role==='paciente' && (
          <select value={f.fisio_id} onChange={set('fisio_id')} required>
            <option value="">Selecciona tu fisioterapeuta…</option>
            {fisios.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        )}
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
