'use client';
import { useEffect, useState } from 'react';

// Temporizador de cuenta regresiva con rondas (series).
export default function Timer({ seconds, rounds = 1 }) {
  const [left, setLeft] = useState(seconds);
  const [round, setRound] = useState(1);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  // tic cada segundo mientras corre
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft(l => Math.max(0, l - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  // fin de ronda / fin total
  useEffect(() => {
    if (!running || left > 0) return;
    if (round < rounds) { setRound(r => r + 1); setLeft(seconds); }
    else { setRunning(false); setDone(true); }
  }, [left, running, round, rounds, seconds]);

  function toggle() {
    if (done) { setDone(false); setRound(1); setLeft(seconds); setRunning(true); return; }
    setRunning(r => !r);
  }
  function reset() { setRunning(false); setDone(false); setRound(1); setLeft(seconds); }

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const pct = seconds ? (left / seconds) * 100 : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--adim)',
      border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', margin: '4px 0 12px' }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 78 }}>
        {done ? '¡Listo!' : `${mm}:${ss}`}
      </div>
      <div style={{ flex: 1 }}>
        {rounds > 1 && (
          <div style={{ fontSize: '.68rem', color: 'var(--grey)', marginBottom: 4 }}>Ronda {round}/{rounds}</div>
        )}
        <div style={{ height: 5, background: '#111', borderRadius: 3 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: done ? 'var(--ok)' : 'var(--accent)', borderRadius: 3, transition: 'width .3s linear' }} />
        </div>
      </div>
      <button className="btn" style={{ padding: '8px 14px', fontSize: '.75rem' }} onClick={toggle}>
        {done ? '↻ Repetir' : running ? '⏸ Pausa' : '▶ Iniciar'}
      </button>
      <button className="btn-ol" style={{ padding: '8px 12px', fontSize: '.75rem' }} onClick={reset}>Reiniciar</button>
    </div>
  );
}
