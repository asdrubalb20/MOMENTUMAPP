'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { sections, exercises, weekPrograms } from '@/lib/data';
import Toast from '@/components/Toast';
import Notifications from '@/components/Notifications';

export default function Fisio() {
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [selPt, setSelPt] = useState(null);
  const [assigned, setAssigned] = useState([]);
  const [freq, setFreq] = useState('3x/semana');
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [metrics, setMetrics] = useState({pts:0,sess:0});
  const [customs, setCustoms] = useState([]);
  const [appts, setAppts] = useState([]);
  const [newEx, setNewEx] = useState(null);
  const [newAp, setNewAp] = useState({patient_id:'',date:'',time:'',notes:''});
  const [toast, setToast] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [weekAssign, setWeekAssign] = useState(null);
  const [selProgram, setSelProgram] = useState('');
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
    const q = supabase.from('patients').select('*').order('created_at');
    const { data } = isAdmin ? await q : await q.eq('fisio_id', user.id);
    setPatients(data || []);
    // métricas del mes
    const first = new Date(); first.setDate(1);
    const iso = first.toISOString().split('T')[0];
    const sq = supabase.from('sessions').select('id',{count:'exact',head:true}).gte('date', iso);
    const { count } = isAdmin ? await sq : await sq.eq('fisio_id', user.id);
    setMetrics({ pts: (data||[]).length, sess: count||0 });
    const { data: ce } = await supabase.from('custom_exercises').select('*');
    setCustoms(ce || []);
    const aq = supabase.from('appointments').select('*').gte('date', new Date().toISOString().split('T')[0]).order('date').order('time').limit(10);
    const { data: ap } = isAdmin ? await aq : await aq.eq('fisio_id', user.id);
    setAppts(ap || []);
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
              <div><div style={{fontSize:'1.6rem',fontWeight:700}}>{metrics.sess}</div><div style={{fontSize:'.62rem',color:'var(--grey)',textTransform:'uppercase',letterSpacing:'.1em'}}>Sesiones/mes</div></div>
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

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <h2>Pacientes</h2>
            <button className="btn-ol" onClick={()=>setNewEx(newEx?null:{section_id:'hombro',name:'',doseType:'reps',series:3,reps:12,seconds:30,zone:'Fuerza',level:'Básico',intent:'',stepsTxt:''})}>➕ Añadir ejercicio</button>
          </div>
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
              <span style={{color:'var(--grey)'}}>›</span>
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
