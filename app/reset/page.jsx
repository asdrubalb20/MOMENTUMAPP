'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Reset() {
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // El enlace del correo establece una sesión de recuperación.
    // supabase-js la detecta y emite PASSWORD_RECOVERY (o ya hay sesión).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e) {
    e.preventDefault(); setErr('');
    if (pass.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres.');
    if (pass !== pass2) return setErr('Las contraseñas no coinciden.');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setLoading(false);
    if (error) return setErr(error.message);
    setOk(true);
    setTimeout(() => router.push('/'), 1800);
  }

  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: '80px 24px' }}>
      <div className="logo" style={{ textAlign: 'center', marginBottom: 30 }}>
        <span className="w4">Mom</span><span className="w6">en</span><span className="w7">tum</span>
      </div>
      <h1 style={{ fontWeight: 700, marginBottom: 16 }}>Nueva contraseña</h1>

      {ok ? (
        <div className="card" style={{ borderColor: 'var(--ok)' }}>
          <p style={{ fontSize: '.9rem' }}>✓ Contraseña actualizada. Redirigiéndote al inicio de sesión…</p>
        </div>
      ) : !ready ? (
        <p style={{ fontSize: '.85rem', color: 'var(--grey)' }}>
          Verificando el enlace… Si llegaste aquí sin usar el enlace del correo, vuelve a
          <Link href="/recuperar" style={{ color: 'var(--white)' }}> solicitarlo</Link>.
        </p>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input type="password" placeholder="Nueva contraseña (mín. 6)" value={pass} onChange={e => setPass(e.target.value)} required />
          <input type="password" placeholder="Repite la contraseña" value={pass2} onChange={e => setPass2(e.target.value)} required />
          {err && <p style={{ color: 'var(--danger)', fontSize: '.8rem' }}>{err}</p>}
          <button className="btn" disabled={loading}>{loading ? 'Guardando…' : 'Guardar contraseña'}</button>
        </form>
      )}

      <p style={{ textAlign: 'center', marginTop: 24, fontSize: '.82rem' }}>
        <Link href="/" style={{ color: 'var(--grey)' }}>← Volver al inicio de sesión</Link>
      </p>
    </main>
  );
}
