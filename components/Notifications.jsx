'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// tiempo relativo corto en español
function ago(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'ahora';
  const m = Math.floor(s / 60); if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24); if (d < 7) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString('es');
}

export default function Notifications({ userId }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  async function load() {
    if (!userId) return;
    const { data } = await supabase.from('notifications')
      .select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30);
    setItems(data || []);
  }

  useEffect(() => { load(); }, [userId]);

  const unread = items.filter(n => !n.read).length;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) await load();
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    setItems(items.map(n => ({ ...n, read: true })));
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={toggle} className="btn-ol"
        style={{ padding: '9px 12px', position: 'relative' }} aria-label="Notificaciones">
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -6, background: 'var(--danger)', color: '#fff',
            fontSize: '.62rem', fontWeight: 700, minWidth: 17, height: 17, borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px'
          }}>{unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 'min(320px, 90vw)',
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
          boxShadow: '0 12px 40px rgba(0,0,0,.55)', zIndex: 1000, overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <strong style={{ fontSize: '.85rem' }}>Notificaciones</strong>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none',
                color: 'var(--grey)', fontSize: '.72rem' }}>Marcar todas leídas</button>
            )}
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {items.length === 0 && (
              <p style={{ padding: '20px 14px', fontSize: '.8rem', color: 'var(--grey)', textAlign: 'center' }}>
                Sin notificaciones
              </p>
            )}
            {items.map(n => (
              <div key={n.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)',
                background: n.read ? 'none' : 'var(--adim)', display: 'flex', gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: 4, marginTop: 6, flexShrink: 0,
                  background: n.read ? 'transparent' : 'var(--ok)' }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '.8rem', fontWeight: 600 }}>{n.title}</p>
                  {n.sub && <p style={{ fontSize: '.75rem', color: 'var(--grey)' }}>{n.sub}</p>}
                  <p style={{ fontSize: '.66rem', color: 'var(--grey)', marginTop: 2 }}>{ago(n.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
