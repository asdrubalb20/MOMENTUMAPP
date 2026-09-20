'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { sections, exercises, weekPrograms } from '@/lib/data';
import Toast from '@/components/Toast';
import Notifications from '@/components/Notifications';
import VoiceInput from '@/components/VoiceInput';

// Anamnesis (la completa el paciente) — mismas claves que app/paciente
const AN_FIELDS = [
  ['reason','Motivo de consulta'], ['since','¿Desde cuándo?'], ['origin','¿Cómo comenzó?'],
  ['painMov','Dolor al moverse (0-10)'], ['aggrav','¿Qué lo empeora?'], ['relief','¿Qué lo alivia?'],
  ['history','Antecedentes (enfermedades, cirugías, medicamentos)'], ['activity','Actividad física / trabajo'],
];
// Evaluación fisioterapéutica por SELECCIÓN (la completa el fisio) — rápida y objetiva
const EVAL_SECTIONS = [
  { title: 'Dolor y físico', fields: [
    { k: 'pain', label: 'Dolor (EVA)', type: 'range' },
    { k: 'strength', label: 'Fuerza muscular (Daniels)', type: 'select', opts: ['0 - Sin contracción','1 - Contracción visible','2 - Movimiento sin gravedad','3 - Vence gravedad','4 - Vence resistencia leve','5 - Normal'] },
    { k: 'rom', label: 'Rango de movimiento', type: 'select', opts: ['Completo','Leve limitación (~75%)','Moderada (~50%)','Severa (~25%)','Mínima (<25%)'] },
    { k: 'tone', label: 'Tono muscular', type: 'select', opts: ['Normal','Hipotónico','Hipertónico','Espasticidad'] },
  ]},
  { title: 'Inspección y palpación', fields: [
    { k: 'inspection', label: 'Inspección', type: 'multi', opts: ['Normal','Edema','Hematoma','Deformidad','Atrofia','Postura antiálgica','Enrojecimiento'] },
    { k: 'palpation', label: 'Palpación', type: 'multi', opts: ['Sin dolor','Dolor localizado','Espasmo muscular','Aumento de temperatura','Crepitación'] },
  ]},
  { title: 'Análisis postural', fields: [
    { k: 'post_head', label: 'Cabeza', type: 'select', opts: ['Alineada','Inclinada','Rotada','Adelantada'] },
    { k: 'post_shoulders', label: 'Hombros', type: 'select', opts: ['Nivelados','Elevado derecho','Elevado izquierdo','Enrollados (protracción)'] },
    { k: 'post_spine', label: 'Columna', type: 'select', opts: ['Normal','Escoliosis','Hipercifosis dorsal','Hiperlordosis lumbar','Rectificación'] },
    { k: 'post_pelvis', label: 'Pelvis', type: 'select', opts: ['Nivelada','Báscula anterior','Báscula posterior','Oblicuidad lateral'] },
    { k: 'post_knees', label: 'Rodillas', type: 'select', opts: ['Neutras','Genu valgo','Genu varo','Genu recurvatum'] },
    { k: 'post_feet', label: 'Pies', type: 'select', opts: ['Neutros','Pie plano (pronado)','Pie cavo (supinado)','Hallux valgus'] },
  ]},
  { title: 'Análisis de marcha', fields: [
    { k: 'gait_pattern', label: 'Patrón de marcha', type: 'select', opts: ['Normal','Antiálgica','Claudicante','Atáxica','Espástica','Estepaje (pie caído)','Trendelenburg','Parkinsoniana (festinante)'] },
    { k: 'gait_step', label: 'Longitud / simetría del paso', type: 'select', opts: ['Simétrica','Asimétrica','Acortada bilateral'] },
    { k: 'gait_cadence', label: 'Cadencia / velocidad', type: 'select', opts: ['Normal','Reducida','Aumentada'] },
    { k: 'gait_base', label: 'Base de sustentación', type: 'select', opts: ['Normal','Ampliada','Reducida'] },
    { k: 'gait_phase', label: 'Fases (apoyo/balanceo)', type: 'select', opts: ['Normales','Apoyo alterado','Balanceo alterado','Ambas alteradas'] },
    { k: 'gait_aid', label: 'Ayuda técnica', type: 'select', opts: ['Ninguna','Bastón','Muletas','Andador','Silla de ruedas'] },
  ]},
];
// Diagnóstico, pronóstico y plan (la completa el fisio)
const DX_FIELDS = [
  ['diagnosis','Diagnóstico fisioterapéutico'], ['prognosis','Pronóstico'],
  ['goals','Objetivos del tratamiento'], ['plan','Plan de tratamiento'],
];

export default function Fisio() {
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [selPt, setSelPt] = useState(null);
  const [assigned, setAssigned] = useState([]);
  const [freq, setFreq] = useState('3x/semana');
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [metrics, setMetrics] = useState({pts:0,today:0});
  const [customs, setCustoms] = useState([]);
  const [appts, setAppts] = useState([]);
  const [newEx, setNewEx] = useState(null);
  const [newAp, setNewAp] = useState({patient_id:'',date:'',time:'',notes:''});
  const [toast, setToast] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [weekAssign, setWeekAssign] = useState(null);
  const [selProgram, setSelProgram] = useState('');
  const [attToday, setAttToday] = useState([]);
  const [evalData, setEvalData] = useState({});
  const [dxData, setDxData] = useState({});
  const [savingEval, setSavingEval] = useState(false);
  const [newPt, setNewPt] = useState(null);
  const [savingPt, setSavingPt] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [recording, setRecording] = useState(false);
  const [parsing, setParsing] = useState(false);
  const recRef = useRef(null);
  const [sessions, setSessions] = useState([]);
  const [newSession, setNewSession] = useState(null);
  const [savingSession, setSavingSession] = useState(false);
  const router = useRouter();
  const showToast = m => { setToast(m); setTimeout(() => setToast(''), 2800); };

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/');
    setUser(user);
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(prof);
    const isAdmin = prof?.role === 'admin';
    const today = new Date().toISOString().split('T')[0];
    // clínica compartida: todos los fisios ven a TODOS los pacientes
    const { data } = await supabase.from('patients').select('*').order('created_at');
    setPatients(data || []);
    // asistencias que YO marqué hoy
    const { data: att } = await supabase.from('attendance').select('patient_id').eq('fisio_id', user.id).eq('date', today);
    const ids = (att || []).map(a => a.patient_id);
    setAttToday(ids);
    setMetrics({ pts: (data||[]).length, today: ids.length });
    const { data: ce } = await supabase.from('custom_exercises').select('*');
    setCustoms(ce || []);
    const aq = supabase.from('appointments').select('*').gte('date', today).order('date').order('time').limit(10);
    const { data: ap } = isAdmin ? await aq : await aq.eq('fisio_id', user.id);
    setAppts(ap || []);
  }

  async function toggleAttendance(pt) {
    const today = new Date().toISOString().split('T')[0];
    if (attToday.includes(pt.id)) {
      await supabase.from('attendance').delete().eq('patient_id', pt.id).eq('fisio_id', user.id).eq('date', today);
      setAttToday(a => a.filter(id => id !== pt.id));
      setMetrics(m => ({ ...m, today: m.today - 1 }));
    } else {
      await supabase.from('attendance').insert({ patient_id: pt.id, fisio_id: user.id, date: today });
      setAttToday(a => [...a, pt.id]);
      setMetrics(m => ({ ...m, today: m.today + 1 }));
      showToast(`✓ Atendiste a ${pt.name} hoy`);
    }
  }

  function toggleRecording() {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) return showToast('Tu navegador no soporta dictado (usa Chrome). Puedes escribir el reporte.');
    if (recording) { recRef.current && recRef.current.stop(); return; }
    const rec = new SR();
    rec.lang = 'es-ES'; rec.continuous = true; rec.interimResults = true;
    let base = voiceText ? voiceText + ' ' : '';
    rec.onresult = (e) => {
      let finalT = '', interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalT += t + ' '; else interim += t;
      }
      setVoiceText((base + finalT + interim).trim());
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recRef.current = rec; rec.start(); setRecording(true);
  }

  async function parseVoice() {
    if (!voiceText.trim()) return showToast('Dicta o escribe el reporte primero');
    setParsing(true);
    const { data, error } = await supabase.functions.invoke('parse-report', { body: { transcript: voiceText } });
    setParsing(false);
    if (error) {
      let m = error.message;
      try { const j = await error.context.json(); if (j?.error) m = j.error; } catch (_) {}
      return showToast('Error: ' + m);
    }
    if (data?.error) return showToast('Error: ' + data.error);
    const f = (data && data.fields) || {};
    const dxKeys = ['diagnosis', 'prognosis', 'goals', 'plan'];
    const nextEval = { ...evalData }, nextDx = { ...dxData };
    let n = 0;
    for (const [k, v] of Object.entries(f)) { if (dxKeys.includes(k)) nextDx[k] = v; else nextEval[k] = v; n++; }
    setEvalData(nextEval); setDxData(nextDx);
    showToast(n ? `✓ IA rellenó ${n} campo(s) — revísalos y guarda` : 'La IA no encontró campos');
  }

  async function createPatient() {
    if (!newPt?.name?.trim() || !newPt?.email?.trim()) return showToast('Nombre y correo son obligatorios');
    if ((newPt.password || '').length < 6) return showToast('La contraseña debe tener al menos 6 caracteres');
    setSavingPt(true);
    const { data, error } = await supabase.functions.invoke('create-patient', { body: {
      name: newPt.name, email: newPt.email, password: newPt.password,
      cedula: newPt.cedula, phone: newPt.phone, dob: newPt.dob || null
    }});
    setSavingPt(false);
    if (error) {
      let msg = error.message;
      try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch (_) {}
      return showToast('Error: ' + msg);
    }
    if (data?.error) return showToast('Error: ' + data.error);
    setNewPt(null); showToast('✓ Paciente creado'); init();
  }

  function buildDose(ex) {
    if (ex.doseType === 'timer') {
      const s = Number(ex.seconds) || 0;
      const txt = s >= 60 && s % 60 === 0 ? `${s/60} min` : `${s} seg`;
      return `${Number(ex.series) || 1} × ${txt}`;
    }
    return `${Number(ex.series) || 1} × ${Number(ex.reps) || 0} reps`;
  }

  async function addCustomEx() {
    if (!newEx?.name?.trim()) return showToast('El nombre es obligatorio');
    if (newEx.doseType === 'timer' && !(Number(newEx.seconds) > 0)) return showToast('Indica los segundos del temporizador');
    if (newEx.doseType === 'reps' && !(Number(newEx.reps) > 0)) return showToast('Indica las repeticiones');
    const { doseType, series, reps, seconds, stepsTxt, ...rest } = newEx;
    await supabase.from('custom_exercises').insert({ ...rest, sets: buildDose(newEx), fisio_id: user.id,
      steps: (stepsTxt||'').split('\n').filter(Boolean) });
    setNewEx(null); showToast('✓ Ejercicio guardado'); init();
  }

  async function addAppt() {
    if (!newAp.date || !newAp.time) return showToast('Fecha y hora obligatorias');
    const pt = patients.find(p=>p.id===newAp.patient_id);
    await supabase.from('appointments').insert({ ...newAp, patient_id: newAp.patient_id||null,
      patient_name: pt?.name || 'Sin ficha', fisio_id: user.id });
    setNewAp({patient_id:'',date:'',time:'',notes:''}); init();
  }

  async function openPatient(pt) {
    setSelPt(pt); setConfirmClear(false);
    const { data } = await supabase.from('assignments').select('*').eq('patient_id', pt.id).maybeSingle();
    setAssigned(data?.exercises || []);
    setFreq(data?.frequency || '3x/semana');
    const { data: wa } = await supabase.from('week_assignments').select('*').eq('patient_id', pt.id).maybeSingle();
    setWeekAssign(wa || null);
    setSelProgram(wa?.program_id || '');
    const { data: ev } = await supabase.from('evaluations').select('*').eq('patient_id', pt.id).maybeSingle();
    setEvalData(ev?.eval_data || {});
    setDxData(ev?.diagnosis || {});
    setNewSession(null);
    const { data: ss } = await supabase.from('sessions').select('*').eq('patient_id', pt.id).order('date', { ascending: false });
    setSessions(ss || []);
  }

  async function addSession() {
    if (!newSession?.title?.trim() && !newSession?.notes?.trim()) return showToast('Escribe un título o notas de la sesión');
    setSavingSession(true);
    await supabase.from('sessions').insert({
      patient_id: selPt.id, fisio_id: user.id,
      title: newSession.title?.trim() || 'Sesión', date: newSession.date || new Date().toISOString().split('T')[0],
      notes: newSession.notes || '', progress: newSession.progress || ''
    });
    if (selPt.user_id) await supabase.from('notifications').insert({
      user_id: selPt.user_id, title: '📝 Nueva sesión registrada',
      sub: `Tu fisioterapeuta registró una sesión${newSession.title ? ': ' + newSession.title : ''}`, kind: 'general'
    });
    const { data: ss } = await supabase.from('sessions').select('*').eq('patient_id', selPt.id).order('date', { ascending: false });
    setSessions(ss || []);
    setSavingSession(false); setNewSession(null); showToast('✓ Sesión guardada');
  }

  async function saveEvaluation() {
    setSavingEval(true);
    await supabase.from('evaluations').upsert({
      patient_id: selPt.id, eval_data: evalData, diagnosis: dxData, updated_at: new Date().toISOString()
    });
    // reflejar el diagnóstico en la ficha (texto corto de la lista)
    if (dxData.diagnosis) {
      await supabase.from('patients').update({ diagnosis: dxData.diagnosis }).eq('id', selPt.id);
      setSelPt({ ...selPt, diagnosis: dxData.diagnosis });
    }
    if (selPt.user_id) await supabase.from('notifications').insert({
      user_id: selPt.user_id, title: '🩺 Evaluación actualizada',
      sub: 'Tu fisioterapeuta registró tu evaluación y plan', kind: 'general'
    });
    setSavingEval(false); showToast('✓ Evaluación guardada'); init();
  }

  async function assignProgram() {
    if (!selProgram) return showToast('Elige un programa');
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('week_assignments').upsert({
      patient_id: selPt.id, program_id: selProgram, start_date: today, assigned_by: user.id
    });
    if (selPt.user_id) await supabase.from('notifications').insert({
      user_id: selPt.user_id, title: '📆 Programa semanal asignado',
      sub: `Tu fisioterapeuta te asignó el programa "${weekPrograms[selProgram]?.name}"`, kind: 'assignment'
    });
    const { data: wa } = await supabase.from('week_assignments').select('*').eq('patient_id', selPt.id).maybeSingle();
    setWeekAssign(wa || null);
    showToast('✓ Programa asignado');
  }

  async function removeProgram() {
    await supabase.from('week_assignments').delete().eq('patient_id', selPt.id);
    setWeekAssign(null); setSelProgram(''); showToast('Programa quitado');
  }

  function toggleEx(ex, sid) {
    const key = e => `${e.id}_${e.sectionId}`;
    const item = { ...ex, sectionId: sid };
    setAssigned(a => a.some(e => key(e) === key(item)) ? a.filter(e => key(e) !== key(item)) : [...a, item]);
  }

  async function saveAssignment() {
    setSaving(true);
    await supabase.from('assignments').upsert({
      patient_id: selPt.id, exercises: assigned, frequency: freq, assigned_by: user.id
    });
    if (selPt.user_id) await supabase.from('notifications').insert({
      user_id: selPt.user_id, title: '🏋️ Ejercicios actualizados',
      sub: `Tu fisioterapeuta te asignó ${assigned.length} ejercicio(s) · ${freq}`, kind: 'assignment'
    });
    setSaving(false);
    showToast('✓ Guardado');
  }

  async function clearAssignment() {
    await supabase.from('assignments').delete().eq('patient_id', selPt.id);
    setAssigned([]); setConfirmClear(false); showToast('Asignación eliminada');
  }

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.diagnosis||'').toLowerCase().includes(search.toLowerCase()));

  if (!user) return <p style={{padding:40}}>Cargando…</p>;

  return (
    <main style={{maxWidth:900,margin:'0 auto',padding:'32px 20px'}}>
      <Toast msg={toast} />
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
        <div className="logo"><span className="w4">Mom</span><span className="w6">en</span><span className="w7">tum</span></div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <Notifications userId={user.id} />
          <button className="btn-ol" onClick={async()=>{await supabase.auth.signOut();router.push('/')}}>Salir</button>
        </div>
      </header>

      {!selPt ? (
        <>
          <div className="card" style={{marginBottom:14,display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
            <div>
              <strong>{profile?.name}</strong> {profile?.role==='admin' && <span style={{fontSize:'.65rem',color:'var(--ok)'}}>ADMIN</span>}
              <p style={{fontSize:'.75rem',color:'var(--grey)'}}>{user.email}{profile?.phone?` · ${profile.phone}`:''}</p>
            </div>
            <div style={{display:'flex',gap:20,textAlign:'center'}}>
              <div><div style={{fontSize:'1.6rem',fontWeight:700}}>{metrics.pts}</div><div style={{fontSize:'.62rem',color:'var(--grey)',textTransform:'uppercase',letterSpacing:'.1em'}}>Pacientes</div></div>
              <div><div style={{fontSize:'1.6rem',fontWeight:700}}>{metrics.today}</div><div style={{fontSize:'.62rem',color:'var(--grey)',textTransform:'uppercase',letterSpacing:'.1em'}}>Atendidos hoy</div></div>
            </div>
          </div>

          <div className="card" style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <strong style={{fontSize:'.8rem'}}>📅 Próximas citas</strong>
            </div>
            {appts.map(a=>(
              <div key={a.id} style={{display:'flex',justifyContent:'space-between',fontSize:'.8rem',padding:'6px 0',borderTop:'1px solid var(--border)'}}>
                <span>{a.date} {String(a.time).slice(0,5)} — {a.patient_name}</span>
                <button className="btn-ol" style={{padding:'2px 8px',fontSize:'.65rem'}}
                  onClick={async()=>{await supabase.from('appointments').delete().eq('id',a.id);init();}}>✕</button>
              </div>
            ))}
            {!appts.length && <p style={{fontSize:'.75rem',color:'var(--grey)'}}>Sin citas próximas</p>}
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:10}}>
              <select value={newAp.patient_id} onChange={e=>setNewAp({...newAp,patient_id:e.target.value})} style={{flex:2,minWidth:140}}>
                <option value="">Paciente…</option>
                {patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="date" value={newAp.date} onChange={e=>setNewAp({...newAp,date:e.target.value})} style={{flex:1,minWidth:130}} />
              <input type="time" value={newAp.time} onChange={e=>setNewAp({...newAp,time:e.target.value})} style={{flex:1,minWidth:100}} />
              <button className="btn" style={{padding:'8px 14px',fontSize:'.75rem'}} onClick={addAppt}>+ Cita</button>
            </div>
          </div>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}}>
            <h2>Pacientes</h2>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button className="btn-ol" onClick={()=>setNewPt(newPt?null:{name:'',email:'',password:'',cedula:'',phone:'',dob:''})}>➕ Nuevo paciente</button>
              <button className="btn-ol" onClick={()=>setNewEx(newEx?null:{section_id:'hombro',name:'',doseType:'reps',series:3,reps:12,seconds:30,zone:'Fuerza',level:'Básico',intent:'',stepsTxt:''})}>➕ Añadir ejercicio</button>
            </div>
          </div>
          {newPt && (
            <div className="card" style={{marginBottom:14,display:'flex',flexDirection:'column',gap:8}}>
              <strong style={{fontSize:'.85rem'}}>Nuevo paciente</strong>
              <p style={{fontSize:'.72rem',color:'var(--grey)',marginTop:-4}}>Se crea la ficha y una cuenta para que el paciente pueda entrar con su correo y contraseña.</p>
              <input placeholder="Nombre y apellido" value={newPt.name} onChange={e=>setNewPt({...newPt,name:e.target.value})} maxLength={80} />
              <input placeholder="Cédula" value={newPt.cedula} onChange={e=>setNewPt({...newPt,cedula:e.target.value})} maxLength={15} />
              <input type="date" value={newPt.dob} onChange={e=>setNewPt({...newPt,dob:e.target.value})} />
              <input placeholder="Teléfono" value={newPt.phone} onChange={e=>setNewPt({...newPt,phone:e.target.value})} maxLength={20} />
              <input type="email" placeholder="correo@ejemplo.com" value={newPt.email} onChange={e=>setNewPt({...newPt,email:e.target.value})} />
              <input type="text" placeholder="Contraseña para el paciente (mín. 6)" value={newPt.password} onChange={e=>setNewPt({...newPt,password:e.target.value})} />
              <div style={{display:'flex',gap:8}}>
                <button className="btn" onClick={createPatient} disabled={savingPt}>{savingPt?'Creando…':'Crear paciente'}</button>
                <button className="btn-ol" onClick={()=>setNewPt(null)}>Cancelar</button>
              </div>
            </div>
          )}
          {newEx && (
            <div className="card" style={{marginBottom:14,display:'flex',flexDirection:'column',gap:8}}>
              <select value={newEx.section_id} onChange={e=>setNewEx({...newEx,section_id:e.target.value})}>
                {sections.map(s=><option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
              <input placeholder="Nombre del ejercicio" value={newEx.name} onChange={e=>setNewEx({...newEx,name:e.target.value})} />

              <div>
                <p style={{fontSize:'.68rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--grey)',marginBottom:6}}>Tipo de dosis</p>
                <div style={{display:'flex',gap:8,marginBottom:8}}>
                  {[['reps','🔁 Series × reps'],['timer','⏱ Temporizador']].map(([k,l])=>(
                    <button key={k} type="button" onClick={()=>setNewEx({...newEx,doseType:k})}
                      style={{flex:1,padding:'10px',borderRadius:9,fontSize:'.8rem',fontWeight:600,
                        background:newEx.doseType===k?'var(--accent)':'none',color:newEx.doseType===k?'#1a1a1a':'var(--grey)',
                        border:newEx.doseType===k?'none':'1px solid var(--dim)'}}>{l}</button>
                  ))}
                </div>
                {newEx.doseType==='reps' ? (
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <input type="number" min="1" placeholder="Series" value={newEx.series} onChange={e=>setNewEx({...newEx,series:e.target.value})} />
                    <span style={{color:'var(--grey)'}}>×</span>
                    <input type="number" min="1" placeholder="Reps" value={newEx.reps} onChange={e=>setNewEx({...newEx,reps:e.target.value})} />
                    <span style={{color:'var(--grey)',fontSize:'.8rem'}}>reps</span>
                  </div>
                ) : (
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <input type="number" min="1" placeholder="Series" value={newEx.series} onChange={e=>setNewEx({...newEx,series:e.target.value})} />
                    <span style={{color:'var(--grey)'}}>×</span>
                    <input type="number" min="1" placeholder="Segundos" value={newEx.seconds} onChange={e=>setNewEx({...newEx,seconds:e.target.value})} />
                    <span style={{color:'var(--grey)',fontSize:'.8rem'}}>seg</span>
                  </div>
                )}
                <p style={{fontSize:'.72rem',color:'var(--grey)',marginTop:6}}>Dosis: <strong style={{color:'var(--white)'}}>{buildDose(newEx)}</strong></p>
              </div>

              <input placeholder="Intención clínica" value={newEx.intent} onChange={e=>setNewEx({...newEx,intent:e.target.value})} />
              <textarea placeholder="Pasos (uno por línea)" rows={3} value={newEx.stepsTxt} onChange={e=>setNewEx({...newEx,stepsTxt:e.target.value})} />
              <div style={{display:'flex',gap:8}}>
                <button className="btn" onClick={addCustomEx}>Guardar ejercicio</button>
                <button className="btn-ol" onClick={()=>setNewEx(null)}>Cancelar</button>
              </div>
            </div>
          )}
          <input placeholder="🔍 Buscar por nombre o diagnóstico…" value={search}
            onChange={e=>setSearch(e.target.value)} style={{marginBottom:16}} />
          {filtered.map(p => (
            <div key={p.id} className="card" style={{marginBottom:10,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}
              onClick={()=>openPatient(p)}>
              <div>
                <strong>{p.name}</strong>
                <p style={{fontSize:'.78rem',color:'var(--grey)'}}>{p.age ? `${p.age} años · ` : ''}{p.diagnosis}</p>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:12}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>toggleAttendance(p)}
                  className={attToday.includes(p.id) ? 'btn' : 'btn-ol'}
                  style={{padding:'7px 12px',fontSize:'.72rem',...(attToday.includes(p.id)?{}:{color:'var(--ok)',borderColor:'var(--ok)'})}}>
                  {attToday.includes(p.id) ? '✓ Atendido hoy' : '+ Atendí hoy'}
                </button>
                <span style={{color:'var(--grey)'}}>›</span>
              </div>
            </div>
          ))}
          {!filtered.length && <p style={{color:'var(--grey)'}}>No hay pacientes aún. Se crean al registrarse con su correo.</p>}
        </>
      ) : (
        <>
          <button className="btn-ol" onClick={()=>setSelPt(null)} style={{marginBottom:18}}>← Pacientes</button>
          <h2>{selPt.name}</h2>
          <p style={{color:'var(--grey)',fontSize:'.85rem',marginBottom:20}}>{selPt.diagnosis}</p>

          <div className="card" style={{marginBottom:16}}>
            <h3 style={{fontSize:'.75rem',letterSpacing:'.15em',textTransform:'uppercase',color:'var(--grey)',marginBottom:12}}>
              📋 Historia clínica y evaluación
            </h3>

            <details open style={{marginBottom:14}}>
              <summary style={{cursor:'pointer',fontWeight:600,fontSize:'.85rem'}}>
                Anamnesis del paciente {selPt.anamnesis
                  ? <span style={{color:'var(--ok)',fontSize:'.72rem'}}>· ✓ completada</span>
                  : <span style={{color:'var(--danger)',fontSize:'.72rem'}}>· pendiente</span>}
              </summary>
              {selPt.anamnesis ? (
                <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:8}}>
                  {AN_FIELDS.map(([k,label]) => (
                    <div key={k}>
                      <p style={{fontSize:'.66rem',color:'var(--grey)',textTransform:'uppercase',letterSpacing:'.05em'}}>{label}</p>
                      <p style={{fontSize:'.85rem'}}>{selPt.anamnesis[k] ? selPt.anamnesis[k] : <span style={{color:'var(--grey)'}}>—</span>}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{marginTop:8,fontSize:'.8rem',color:'var(--grey)'}}>
                  El paciente aún no completó su anamnesis (la llena desde su panel → Historia clínica).
                </p>
              )}
            </details>

            <div style={{background:'var(--adim)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px',marginBottom:12}}>
              <p style={{fontSize:'.7rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--grey)',marginBottom:8}}>🎤 Reporte por voz</p>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
                <button className="btn-ol" onClick={toggleRecording} style={recording?{color:'var(--danger)',borderColor:'var(--danger)'}:{}}>{recording?'⏹ Detener':'🎤 Dictar'}</button>
                <button className="btn" onClick={parseVoice} disabled={parsing||!voiceText.trim()}>{parsing?'Analizando…':'✨ Rellenar con IA'}</button>
              </div>
              <textarea rows={3} placeholder="Dicta o escribe aquí el reporte de la evaluación; la IA llenará los campos de abajo (revísalos antes de guardar)…" value={voiceText} onChange={e=>setVoiceText(e.target.value)} />
            </div>

            {EVAL_SECTIONS.map(sec => (
              <div key={sec.title} style={{marginBottom:6}}>
                <p style={{fontSize:'.7rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--grey)',margin:'10px 0 8px'}}>{sec.title}</p>
                {sec.fields.map(f => (
                  <div key={f.k} style={{marginBottom:10}}>
                    <label style={{fontSize:'.75rem',color:'var(--grey)'}}>
                      {f.label}{f.type==='range' && <> · <strong style={{color:'var(--white)'}}>{evalData[f.k]??0}</strong>/10</>}
                    </label>
                    {f.type==='range' && (
                      <input type="range" min="0" max="10" value={evalData[f.k]??0}
                        onChange={e=>setEvalData({...evalData,[f.k]:+e.target.value})} style={{padding:0,margin:'6px 0'}} />
                    )}
                    {f.type==='select' && (
                      <select value={evalData[f.k]||''} onChange={e=>setEvalData({...evalData,[f.k]:e.target.value})}>
                        <option value="">—</option>
                        {f.opts.map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                    {f.type==='multi' && (
                      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:4}}>
                        {f.opts.map(o => {
                          const arr = Array.isArray(evalData[f.k]) ? evalData[f.k] : [];
                          const on = arr.includes(o);
                          return (
                            <button key={o} type="button" onClick={()=>setEvalData({...evalData,[f.k]: on ? arr.filter(x=>x!==o) : [...arr,o]})}
                              style={{padding:'5px 10px',borderRadius:14,fontSize:'.72rem',cursor:'pointer',
                                border:'1px solid '+(on?'var(--accent)':'var(--dim)'),background:on?'var(--accent)':'none',color:on?'#1a1a1a':'var(--grey)'}}>{o}</button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
            <div style={{marginBottom:8}}>
              <label style={{fontSize:'.72rem',color:'var(--grey)'}}>Pruebas especiales / notas</label>
              <textarea rows={2} value={evalData.notes||''} onChange={e=>setEvalData({...evalData,notes:e.target.value})} />
            </div>

            <p style={{fontSize:'.7rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--grey)',margin:'12px 0 8px'}}>Diagnóstico, pronóstico y plan</p>
            {DX_FIELDS.map(([k,label]) => (
              <div key={k} style={{marginBottom:8}}>
                <label style={{fontSize:'.72rem',color:'var(--grey)'}}>{label}</label>
                <textarea rows={2} value={dxData[k]||''} onChange={e=>setDxData({...dxData,[k]:e.target.value})} />
              </div>
            ))}

            <button className="btn" onClick={saveEvaluation} disabled={savingEval} style={{marginTop:6}}>
              {savingEval ? 'Guardando…' : '💾 Guardar evaluación'}
            </button>
          </div>

          <div className="card" style={{marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h3 style={{fontSize:'.75rem',letterSpacing:'.15em',textTransform:'uppercase',color:'var(--grey)'}}>
                📝 Sesiones clínicas ({sessions.length})
              </h3>
              <button className="btn-ol" style={{padding:'6px 12px',fontSize:'.72rem'}}
                onClick={()=>setNewSession(newSession?null:{date:new Date().toISOString().split('T')[0],title:'',notes:'',progress:''})}>
                {newSession?'Cancelar':'➕ Nueva sesión'}
              </button>
            </div>

            {newSession && (
              <div style={{background:'var(--adim)',border:'1px solid var(--border)',borderRadius:10,padding:'12px',marginBottom:12,display:'flex',flexDirection:'column',gap:8}}>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <input type="date" value={newSession.date} onChange={e=>setNewSession({...newSession,date:e.target.value})} style={{flex:1,minWidth:140}} />
                  <input placeholder="Título (ej. Sesión 3 — terapia manual)" value={newSession.title} onChange={e=>setNewSession({...newSession,title:e.target.value})} style={{flex:2,minWidth:180}} />
                </div>
                <label style={{fontSize:'.72rem',color:'var(--grey)'}}>Notas de la sesión (puedes dictarlas 🎤)</label>
                <VoiceInput value={newSession.notes} onChange={v=>setNewSession({...newSession,notes:v})} placeholder="Qué se trabajó hoy, hallazgos, respuesta del paciente…" rows={4} />
                <label style={{fontSize:'.72rem',color:'var(--grey)'}}>Progreso / evolución (puedes dictarlo 🎤)</label>
                <VoiceInput value={newSession.progress} onChange={v=>setNewSession({...newSession,progress:v})} placeholder="Cambios respecto a la sesión anterior…" rows={2} />
                <div style={{display:'flex',gap:8}}>
                  <button className="btn" onClick={addSession} disabled={savingSession}>{savingSession?'Guardando…':'Guardar sesión'}</button>
                  <button className="btn-ol" onClick={()=>setNewSession(null)}>Cancelar</button>
                </div>
              </div>
            )}

            {sessions.map(s=>(
              <div key={s.id} style={{padding:'10px 0',borderTop:'1px solid var(--border)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <strong style={{fontSize:'.85rem'}}>{s.title}</strong>
                  <span style={{fontSize:'.7rem',color:'var(--grey)'}}>{s.date}</span>
                </div>
                {s.notes && <p style={{fontSize:'.8rem',color:'var(--grey)',marginTop:4,whiteSpace:'pre-wrap'}}>{s.notes}</p>}
                {s.progress && <p style={{fontSize:'.78rem',marginTop:4}}><span style={{color:'var(--ok)'}}>Progreso:</span> {s.progress}</p>}
              </div>
            ))}
            {!sessions.length && !newSession && <p style={{fontSize:'.8rem',color:'var(--grey)'}}>Sin sesiones registradas. Usa "➕ Nueva sesión".</p>}
          </div>

          <div className="card" style={{marginBottom:16}}>
            <h3 style={{fontSize:'.75rem',letterSpacing:'.15em',textTransform:'uppercase',color:'var(--grey)',marginBottom:12}}>
              Ejercicios asignados ({assigned.length})
            </h3>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:14}}>
              {assigned.map((ex,i) => (
                <span key={i} style={{display:'inline-flex',alignItems:'center',gap:6,background:'var(--adim)',
                  border:'1px solid var(--border)',borderRadius:16,padding:'4px 8px 4px 12px',fontSize:'.72rem'}}>
                  {ex.name}
                  <button onClick={()=>setAssigned(a=>a.filter((_,j)=>j!==i))}
                    style={{background:'none',border:'none',color:'var(--grey)'}}>✕</button>
                </span>
              ))}
              {!assigned.length && <span style={{color:'var(--grey)',fontSize:'.8rem'}}>Ninguno — selecciona abajo</span>}
            </div>
            <select value={freq} onChange={e=>setFreq(e.target.value)} style={{marginBottom:12,maxWidth:220}}>
              {['Diario','3x/semana','4x/semana','5x/semana'].map(x=><option key={x}>{x}</option>)}
            </select>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <button className="btn" onClick={saveAssignment} disabled={saving}>{saving?'Guardando…':'💾 Guardar cambios'}</button>
              {!confirmClear ? (
                <button className="btn-ol" style={{color:'var(--danger)',borderColor:'var(--danger)'}} onClick={()=>setConfirmClear(true)}>🗑 Quitar asignación</button>
              ) : (
                <>
                  <button className="btn-ol" style={{color:'var(--danger)',borderColor:'var(--danger)'}} onClick={clearAssignment}>¿Seguro? Sí, quitar</button>
                  <button className="btn-ol" onClick={()=>setConfirmClear(false)}>Cancelar</button>
                </>
              )}
            </div>
          </div>

          <div className="card" style={{marginBottom:16}}>
            <h3 style={{fontSize:'.75rem',letterSpacing:'.15em',textTransform:'uppercase',color:'var(--grey)',marginBottom:12}}>
              Programa semanal
            </h3>
            {weekAssign ? (
              <p style={{fontSize:'.85rem',marginBottom:12}}>
                {weekPrograms[weekAssign.program_id]?.icon} <strong>{weekPrograms[weekAssign.program_id]?.name}</strong>
                <span style={{color:'var(--grey)'}}> · desde {weekAssign.start_date}</span>
              </p>
            ) : (
              <p style={{fontSize:'.8rem',color:'var(--grey)',marginBottom:12}}>Sin programa asignado</p>
            )}
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <select value={selProgram} onChange={e=>setSelProgram(e.target.value)} style={{maxWidth:260}}>
                <option value="">Elegir programa…</option>
                {Object.entries(weekPrograms).map(([id,p])=>(
                  <option key={id} value={id}>{p.icon} {p.name} ({p.weeks.length} sem)</option>
                ))}
              </select>
              <button className="btn" onClick={assignProgram}>{weekAssign?'Cambiar':'Asignar'}</button>
              {weekAssign && <button className="btn-ol" style={{color:'var(--danger)',borderColor:'var(--danger)'}} onClick={removeProgram}>Quitar</button>}
            </div>
          </div>

          <h3 style={{marginBottom:12}}>Biblioteca</h3>
          {sections.map(sec => (
            <details key={sec.id} className="card" style={{marginBottom:8}}>
              <summary style={{cursor:'pointer',fontWeight:500}}>{sec.icon} {sec.name} ({(exercises[sec.id]||[]).length})</summary>
              <div style={{marginTop:12}}>
                {[...(exercises[sec.id]||[]), ...customs.filter(ce=>ce.section_id===sec.id).map(ce=>({...ce, id: ce.id, custom:true}))].map(ex => {
                  const sel = assigned.some(a=>a.id===ex.id&&a.sectionId===sec.id);
                  return (
                    <div key={ex.id} onClick={()=>toggleEx(ex,sec.id)}
                      style={{display:'flex',justifyContent:'space-between',padding:'10px 4px',cursor:'pointer',
                        borderTop:'1px solid var(--border)',color:sel?'var(--white)':'var(--grey)'}}>
                      <span style={{fontSize:'.85rem'}}>{ex.name} <em style={{fontSize:'.72rem'}}>· {ex.sets}</em></span>
                      <span>{sel?'✓':'+'}</span>
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
        </>
      )}
    </main>
  );
}
