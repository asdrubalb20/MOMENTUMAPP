'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { exercises, weekPrograms } from '@/lib/data';
import Toast from '@/components/Toast';
import Notifications from '@/components/Notifications';
import Timer from '@/components/Timer';

const today = () => new Date().toISOString().split('T')[0];

// detecta dosis por tiempo (ej. "3 × 45 seg", "2 × 2 min") → { rounds, seconds }
function parseTimer(sets) {
  const s = String(sets || '');
  const m = s.match(/(\d+)\s*[×x]\s*(\d+)\s*(seg|min|s)\b/i);
  if (m) {
    const unit = m[3].toLowerCase();
    return { rounds: Number(m[1]), seconds: unit === 'min' ? Number(m[2]) * 60 : Number(m[2]) };
  }
  const m2 = s.match(/(\d+)\s*(seg|min)\b/i);
  if (m2) {
    const unit = m2[2].toLowerCase();
    return { rounds: 1, seconds: unit === 'min' ? Number(m2[1]) * 60 : Number(m2[1]) };
  }
  return null;
}

export default function Paciente() {
  const [pt, setPt] = useState(null);
  const [assigned, setAssigned] = useState(null);
  const [logs, setLogs] = useState([]);
  const [openEx, setOpenEx] = useState(null);
  const [pain, setPain] = useState(0);
  const [note, setNote] = useState('');
  const [anam, setAnam] = useState(null);
  const [tab, setTab] = useState('ejercicios');
  const [toast, setToast] = useState('');
  const [weekProg, setWeekProg] = useState(null);
  const [weekLogs, setWeekLogs] = useState([]);
  const [openWeek, setOpenWeek] = useState(0);
  const router = useRouter();
  const showToast = m => { setToast(m); setTimeout(() => setToast(''), 2800); };

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/');
    let { data: p } = await supabase.from('patients').select('*').eq('user_id', user.id).maybeSingle();
    if (!p) {
      // auto-crear ficha enlazada al primer fisio disponible
      const { data: prof } = await supabase.from('profiles').select('name,phone,dob').eq('id', user.id).maybeSingle();
      const { data: fisios } = await supabase.from('profiles').select('id').eq('role','fisio').limit(1);
      if (fisios?.length) {
        const { data: created } = await supabase.from('patients').insert({
          user_id: user.id, fisio_id: fisios[0].id, name: prof?.name || user.email,
          phone: prof?.phone || '', email: user.email,
          age: prof?.dob ? Math.floor((Date.now()-new Date(prof.dob))/31557600000) : null
        }).select().single();
        p = created;
      }
    }
    if (!p) return;
    setPt(p);
    const { data: a } = await supabase.from('assignments').select('*').eq('patient_id', p.id).maybeSingle();
    setAssigned(a);
    const { data: l } = await supabase.from('completion_logs').select('*').eq('patient_id', p.id);
    setLogs(l || []);
    const { data: wa } = await supabase.from('week_assignments').select('*').eq('patient_id', p.id).maybeSingle();
    setWeekProg(wa || null);
    if (wa) {
      const { data: wl } = await supabase.from('week_logs').select('*').eq('patient_id', p.id).eq('program_id', wa.program_id);
      setWeekLogs(wl || []);
    } else setWeekLogs([]);
  }

  const workoutDone = (w, wo) => weekLogs.some(l => l.week===w && l.workout_idx===wo);

  async function toggleWorkout(w, wo) {
    if (workoutDone(w, wo)) {
      await supabase.from('week_logs').delete()
        .eq('patient_id', pt.id).eq('program_id', weekProg.program_id).eq('week', w).eq('workout_idx', wo);
    } else {
      await supabase.from('week_logs').insert({
        patient_id: pt.id, program_id: weekProg.program_id, week: w, workout_idx: wo, date: today()
      });
      await supabase.from('notifications').insert({
        user_id: pt.fisio_id, title: '📆 Entrenamiento completado',
        sub: `${pt.name} completó un entrenamiento de "${weekPrograms[weekProg.program_id]?.name}"`, kind: 'completion'
      });
    }
    const { data: wl } = await supabase.from('week_logs').select('*').eq('patient_id', pt.id).eq('program_id', weekProg.program_id);
    setWeekLogs(wl || []);
  }

  async function markDone(ex) {
    await supabase.from('completion_logs').insert({
      patient_id: pt.id, ex_id: ex.id, section_id: ex.sectionId,
      date: today(), pain, note, feeling: ''
    });
    await supabase.from('notifications').insert({
      user_id: pt.fisio_id, title: '💪 Ejercicio completado',
      sub: `${pt.name} completó: ${ex.name}${pain>0?` · Dolor ${pain}/10`:''}`, kind: 'completion'
    });
    setOpenEx(null); setPain(0); setNote('');
    init();
  }

  async function saveAnam() {
    await supabase.from('patients').update({ anamnesis: anam }).eq('id', pt.id);
    await supabase.from('notifications').insert({ user_id: pt.fisio_id,
      title: '📋 Anamnesis completada', sub: `${pt.name} completó su anamnesis`, kind: 'general' });
    setPt({ ...pt, anamnesis: anam }); setAnam(null);
    showToast('✓ Anamnesis enviada a tu fisioterapeuta');
  }

  const AN_FIELDS = [
    ['reason','¿Qué te trae a consulta? (motivo principal)'],
    ['since','¿Desde cuándo tienes las molestias?'],
    ['origin','¿Cómo comenzó? (golpe, gradual, cirugía…)'],
    ['painMov','Del 0 al 10, ¿cuánto duele al moverte?'],
    ['aggrav','¿Qué lo empeora?'],
    ['relief','¿Qué lo alivia?'],
    ['history','Enfermedades, cirugías o medicamentos relevantes'],
    ['activity','¿Qué actividad física o trabajo realizas?'],
  ];

  const doneToday = ex => logs.some(l => l.ex_id===ex.id && l.section_id===ex.sectionId && l.date===today());
  const exs = assigned?.exercises || [];
  const doneCount = exs.filter(doneToday).length;

  if (!pt) return <p style={{padding:40}}>Cargando… (si no avanza, tu fisioterapeuta aún no creó tu ficha)</p>;

  return (
    <main style={{maxWidth:600,margin:'0 auto',padding:'32px 20px'}}>
      <Toast msg={toast} />
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div className="logo" style={{fontSize:'1.3rem'}}><span className="w4">Mom</span><span className="w6">en</span><span className="w7">tum</span></div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <Notifications userId={pt.user_id} />
          <button className="btn-ol" onClick={async()=>{await supabase.auth.signOut();router.push('/')}}>Salir</button>
        </div>
      </header>

      <h2 style={{marginBottom:14}}>Hola, {pt.name.split(' ')[0]}</h2>

      <div style={{display:'flex',gap:8,marginBottom:18}}>
        {[['ejercicios','🏋️ Ejercicios'],['programa','📆 Programa'],['historia','📋 Historia']].map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)}
            style={{flex:1,padding:'11px',borderRadius:9,fontSize:'.82rem',fontWeight:600,
              background:tab===k?'var(--accent)':'none',color:tab===k?'#1a1a1a':'var(--grey)',
              border:tab===k?'none':'1px solid var(--dim)'}}>{l}</button>
        ))}
      </div>

      {tab==='historia' && <>

      {!pt.anamnesis && !anam && (
        <div className="card" style={{margin:'14px 0',borderColor:'var(--accent)'}}>
          <strong>📋 Completa tu anamnesis</strong>
          <p style={{fontSize:'.78rem',color:'var(--grey)',margin:'6px 0 12px'}}>
            Cuéntanos sobre tu lesión antes de tu primera sesión — tu fisioterapeuta llegará preparado.</p>
          <button className="btn" onClick={()=>setAnam({})}>Comenzar</button>
        </div>
      )}
      {pt.anamnesis && !anam && (
        <p style={{fontSize:'.75rem',color:'var(--ok)',margin:'10px 0'}}>✓ Anamnesis enviada
          <a style={{color:'var(--grey)',marginLeft:10,cursor:'pointer'}}
            onClick={()=>setAnam(pt.anamnesis)}>Editar</a></p>
      )}
      {anam && (
        <div className="card" style={{margin:'14px 0',display:'flex',flexDirection:'column',gap:10}}>
          <strong>Mi anamnesis</strong>
          {AN_FIELDS.map(([k,label]) => (
            <div key={k}>
              <label style={{fontSize:'.72rem',color:'var(--grey)'}}>{label}</label>
              <textarea rows={2} value={anam[k]||''} maxLength={300}
                onChange={e=>setAnam({...anam,[k]:e.target.value})} />
            </div>
          ))}
          <div style={{display:'flex',gap:8}}>
            <button className="btn" onClick={saveAnam}>Enviar a mi fisioterapeuta</button>
            <button className="btn-ol" onClick={()=>setAnam(null)}>Cancelar</button>
          </div>
        </div>
      )}
      </>}

      {tab==='ejercicios' && <>
      <h3 style={{marginBottom:12,fontSize:'.8rem',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--grey)'}}>Ejercicios asignados</h3>
      {exs.length > 0 && (
        <div className="card" style={{margin:'16px 0'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
            <strong>Hoy</strong><span>{doneCount}/{exs.length}</span>
          </div>
          <div style={{height:6,background:'#111',borderRadius:3}}>
            <div style={{width:`${exs.length?Math.round(doneCount/exs.length*100):0}%`,height:'100%',background:'var(--ok)',borderRadius:3}} />
          </div>
        </div>
      )}

      {exs.map((ex,i) => {
        const done = doneToday(ex);
        const full = (exercises[ex.sectionId]||[]).find(e=>e.id===ex.id) || ex;
        return (
          <div key={i} className="card" style={{marginBottom:10,opacity:done?.65:1}}>
            {ex.fisioNote && <p style={{fontSize:'.75rem',color:'var(--accent)',background:'var(--adim)',
              padding:'8px 12px',borderRadius:8,marginBottom:10}}>📌 {ex.fisioNote}</p>}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <strong>{full.name}</strong>
                <p style={{fontSize:'.75rem',color:'var(--grey)'}}>{full.sets} · {full.level}</p>
              </div>
              {done ? <span style={{color:'var(--ok)'}}>✓ Hoy</span> :
                <button className="btn" style={{padding:'8px 14px',fontSize:'.75rem'}}
                  onClick={()=>setOpenEx({...full,sectionId:ex.sectionId})}>Marcar</button>}
            </div>
            {openEx?.id===ex.id && openEx?.sectionId===ex.sectionId && (
              <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid var(--border)'}}>
                <ol style={{paddingLeft:18,fontSize:'.82rem',color:'var(--grey)',marginBottom:14}}>
                  {(full.steps||[]).map((s,j)=><li key={j} style={{marginBottom:4}}>{s}</li>)}
                </ol>
                {(() => { const t = parseTimer(full.sets); return t ? <Timer seconds={t.seconds} rounds={t.rounds} /> : null; })()}
                <label style={{fontSize:'.75rem',color:'var(--grey)'}}>Dolor durante el ejercicio: <strong style={{color:'var(--white)'}}>{pain}</strong>/10</label>
                <input type="range" min="0" max="10" value={pain} onChange={e=>setPain(+e.target.value)} style={{padding:0,margin:'8px 0'}} />
                <input placeholder="Nota (opcional)" value={note} onChange={e=>setNote(e.target.value)} maxLength={200} style={{marginBottom:10}} />
                <div style={{display:'flex',gap:8}}>
                  <button className="btn" onClick={()=>markDone(openEx)}>✓ Confirmar</button>
                  <button className="btn-ol" onClick={()=>setOpenEx(null)}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {!exs.length && <p style={{color:'var(--grey)'}}>Tu fisioterapeuta aún no te ha asignado ejercicios.</p>}
      </>}

      {tab==='programa' && <>
      {!weekProg ? (
        <p style={{color:'var(--grey)'}}>Tu fisioterapeuta aún no te asignó un programa semanal.</p>
      ) : (() => {
        const prog = weekPrograms[weekProg.program_id];
        if (!prog) return <p style={{color:'var(--grey)'}}>Programa no encontrado.</p>;
        const totalWo = prog.weeks.reduce((n,wk)=>n+wk.length,0);
        const doneWo = weekLogs.length;
        const week = prog.weeks[openWeek] || [];
        return (
          <>
            <div className="card" style={{margin:'16px 0'}}>
              <strong style={{fontSize:'1.05rem'}}>{prog.icon} {prog.name}</strong>
              <p style={{fontSize:'.78rem',color:'var(--grey)',margin:'6px 0 12px'}}>{prog.desc}</p>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:'.8rem'}}>
                <span>Progreso total</span><span>{doneWo}/{totalWo}</span>
              </div>
              <div style={{height:6,background:'#111',borderRadius:3}}>
                <div style={{width:`${totalWo?Math.round(doneWo/totalWo*100):0}%`,height:'100%',background:'var(--ok)',borderRadius:3}} />
              </div>
            </div>

            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
              {prog.weeks.map((_,wi)=>(
                <button key={wi} onClick={()=>setOpenWeek(wi)}
                  style={{padding:'7px 12px',borderRadius:8,fontSize:'.75rem',fontWeight:600,
                    background:openWeek===wi?'var(--accent)':'none',color:openWeek===wi?'#1a1a1a':'var(--grey)',
                    border:openWeek===wi?'none':'1px solid var(--dim)'}}>Sem {wi+1}</button>
              ))}
            </div>

            {week.map((wo,woi)=>{
              const done = workoutDone(openWeek, woi);
              return (
                <div key={woi} className="card" style={{marginBottom:10,opacity:done?.7:1}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <strong>{wo.t}</strong>
                    <button className="btn-ol" style={{padding:'6px 12px',fontSize:'.72rem',
                      ...(done?{color:'var(--ok)',borderColor:'var(--ok)'}:{})}}
                      onClick={()=>toggleWorkout(openWeek, woi)}>{done?'✓ Hecho':'Marcar'}</button>
                  </div>
                  {wo.w?.length>0 && <>
                    <p style={{fontSize:'.68rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--grey)',margin:'6px 0 4px'}}>Calentamiento</p>
                    <ul style={{paddingLeft:16,fontSize:'.8rem',color:'var(--grey)'}}>
                      {wo.w.map((s,j)=><li key={j} style={{marginBottom:3}}>{s}</li>)}
                    </ul>
                  </>}
                  <p style={{fontSize:'.68rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--grey)',margin:'8px 0 4px'}}>Principal</p>
                  <ul style={{paddingLeft:16,fontSize:'.8rem'}}>
                    {wo.m.map((s,j)=><li key={j} style={{marginBottom:3}}>{s}</li>)}
                  </ul>
                </div>
              );
            })}
          </>
        );
      })()}
      </>}
    </main>
  );
}
