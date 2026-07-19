'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Recuperar() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault(); setErr(''); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset'
    });
    setLoading(false);
    if (error) return setErr(error.message);
    setSent(true);
  }

  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: '80px 24px' }}>
      <div className="logo" style={{ textAlign: 'center', marginBottom: 30 }}>
        <span className="w4">Mom</span><span className="w6">en</span><span className="w7">tum</span>
      </div>
      <h1 style={{ fontWeight: 700, marginBottom: 10 }}>Recuperar contraseña</h1>

      {sent ? (
        <div className="card" style={{ borderColor: 'var(--ok)' }}>
          <p style={{ fontSize: '.9rem' }}>✓ Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.</p>
          <p style={{ fontSize: '.78rem', color: 'var(--grey)', marginTop: 8 }}>Revisa tu bandeja de entrada (y la carpeta de spam).</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '.82rem', color: 'var(--grey)', marginBottom: 20 }}>
            Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.
          </p>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input type="email" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} required />
            {err && <p style={{ color: 'var(--danger)', fontSize: '.8rem' }}>{err}</p>}
            <button className="btn" disabled={loading}>{loading ? 'Enviando…' : 'Enviar enlace'}</button>
          </form>
        </>
      )}

      <p style={{ textAlign: 'center', marginTop: 24, fontSize: '.82rem' }}>
        <Link href="/" style={{ color: 'var(--white)' }}>← Volver al inicio de sesión</Link>
      </p>
    </main>
  );
}
