'use client';
import { useRef, useState } from 'react';

// Textarea con dictado por voz integrado (Web Speech API del navegador).
// value / onChange controlan el texto; el botón 🎤 agrega lo dictado.
export default function VoiceInput({ value, onChange, placeholder, rows = 3 }) {
  const [recording, setRecording] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const recRef = useRef(null);

  function toggle() {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { setUnsupported(true); return; }
    if (recording) { recRef.current && recRef.current.stop(); return; }
    const rec = new SR();
    rec.lang = 'es-ES'; rec.continuous = true; rec.interimResults = true;
    const base = value ? value + ' ' : '';
    let finalT = '';
    rec.onresult = (e) => {
      let interim = '';
      // Empezar en e.resultIndex (no en 0): en Android Chrome los segmentos ya
      // finalizados se reentregan y, si se recorren desde 0, se duplican.
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalT += t + ' '; else interim += t;
      }
      onChange((base + finalT + interim).trim());
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recRef.current = rec; rec.start(); setRecording(true);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <button type="button" onClick={toggle} className="btn-ol"
          style={{ padding: '5px 12px', fontSize: '.72rem', ...(recording ? { color: 'var(--danger)', borderColor: 'var(--danger)' } : {}) }}>
          {recording ? '⏹ Detener' : '🎤 Dictar'}
        </button>
      </div>
      <textarea rows={rows} placeholder={placeholder} value={value || ''} onChange={e => onChange(e.target.value)} />
      {unsupported && <p style={{ fontSize: '.7rem', color: 'var(--grey)', marginTop: 4 }}>El dictado necesita Chrome/Edge con micrófono. Puedes escribir el texto.</p>}
    </div>
  );
}
