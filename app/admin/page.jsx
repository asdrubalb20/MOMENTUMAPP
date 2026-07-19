'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Toast from '@/components/Toast';
import Notifications from '@/components/Notifications';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [fisios, setFisios] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appts, setAppts] = useState([]);
  const [metrics, setMetrics] = useState({ fisios: 0, patients: 0, appts: 0, logs: 0 });
  const [toast, setToast] = useState('');
  const router = useRouter();
  const showToast = m => { setToast(m); setTimeout(() => setToast(''), 2800); };

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/');
    setUser(user);
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    setProfile(prof);
    if (prof?.role !== 'admin') return router.push(prof?.role === 'fisio' ? '/fisio' : '/paciente');

    const { data: fs } = await supabase.rpc('list_fisios');
    setFisios(fs || []);
    const { data: pts } = await supabase.from('patients').select('*').order('created_at');
    setPatients(pts || []);
    const today = new Date().toISOString().split('T')[0];
    const { data: ap } = await supabase.from('appointments').select('*').gte('date', today).order('date').order('time');
    setAppts(ap || []);
    const { count } = await supabase.from('completion_logs').select('id', { count: 'exact', head: true });
    setMetrics({ fisios: (fs || []).length, patients: (pts || []).length, appts: (ap || []).length, logs: count || 0 });
  }

  const fisioName = id => fisios.find(f => f.id === id)?.name || '— sin fisio —';

  async function reassign(pt, fisioId) {
    if (!fisioId || fisioId === pt.fisio_id) return;
    await supabase.from('patients').update({ fisio_id: fisioId }).eq('id', pt.id);
    setPatients(ps => ps.map(p => p.id === pt.id ? { ...p, fisio_id: fisioId } : p));
    showToast(`✓ ${pt.name} reasignado a ${fisioName(fisioId)}`);
  }

  if (!user || !profile) return <p style={{ padding: 40 }}>Cargando…</p>;

  const tiles = [
    ['Fisioterapeutas', metrics.fisios], ['Pacientes', metrics.patients],
    ['Citas próximas', metrics.appts], ['Ejercicios completados', metrics.logs],
  ];

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
      <Toast msg={toast} />
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div className="logo"><span className="w4">Mom</span><span className="w6">en</span><span className="w7">tum</span></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Notifications userId={user.id} />
          <button className="btn-ol" onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}>Salir</button>
        </div>
      </header>

      <div className="card" style={{ marginBottom: 18 }}>
        <strong>{profile.name}</strong> <span style={{ fontSize: '.65rem', color: 'var(--ok)', letterSpacing: '.1em' }}>ADMIN</span>
        <p style={{ fontSize: '.75rem', color: 'var(--grey)' }}>{user.email} · Panel de administración de la clínica</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 24 }}>
        {tiles.map(([label, val]) => (
          <div key={label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.9rem', fontWeight: 700 }}>{val}</div>
            <div style={{ fontSize: '.62rem', color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '.1em' }}>{label}</div>
          </div>
        ))}
      </div>

      <h2 style={{ marginBottom: 12 }}>Fisioterapeutas</h2>
      {fisios.map(f => (
        <div key={f.id} className="card" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>{f.name}</strong>
          <span style={{ fontSize: '.78rem', color: 'var(--grey)' }}>
            {patients.filter(p => p.fisio_id === f.id).length} paciente(s)
          </span>
        </div>
      ))}
      {!fisios.length && <p style={{ color: 'var(--grey)' }}>No hay fisioterapeutas registrados.</p>}

      <h2 style={{ margin: '24px 0 12px' }}>Pacientes ({patients.length})</h2>
      {patients.map(p => (
        <div key={p.id} className="card" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <strong>{p.name}</strong>
            <p style={{ fontSize: '.75rem', color: 'var(--grey)' }}>{p.diagnosis} · fisio: {fisioName(p.fisio_id)}</p>
          </div>
          <select value={p.fisio_id || ''} onChange={e => reassign(p, e.target.value)} style={{ maxWidth: 200 }}>
            {fisios.map(f => <option key={f.id} value={f.id}>Reasignar a: {f.name}</option>)}
          </select>
        </div>
      ))}
      {!patients.length && <p style={{ color: 'var(--grey)' }}>No hay pacientes registrados.</p>}

      <h2 style={{ margin: '24px 0 12px' }}>Próximas citas ({appts.length})</h2>
      {appts.map(a => (
        <div key={a.id} className="card" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', fontSize: '.82rem' }}>
          <span>{a.date} {String(a.time).slice(0, 5)} — {a.patient_name || 'Sin ficha'}</span>
          <span style={{ color: 'var(--grey)' }}>fisio: {fisioName(a.fisio_id)}</span>
        </div>
      ))}
      {!appts.length && <p style={{ color: 'var(--grey)' }}>Sin citas próximas en la clínica.</p>}
    </main>
  );
}
