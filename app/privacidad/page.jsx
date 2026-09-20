export const metadata = { title: 'Política de Privacidad · Momentum' };

export default function Privacidad() {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', lineHeight: 1.6 }}>
      <div className="logo" style={{ marginBottom: 8 }}>
        <span className="w4">Mom</span><span className="w6">en</span><span className="w7">tum</span>
      </div>
      <h1 style={{ fontWeight: 700, marginBottom: 6 }}>Política de Privacidad</h1>
      <p style={{ color: 'var(--grey)', fontSize: '.8rem', marginBottom: 28 }}>Última actualización: septiembre de 2026</p>

      <p style={{ marginBottom: 16 }}>Momentum es una aplicación para la gestión de tratamientos de fisioterapia. Esta política explica qué datos tratamos y cómo los protegemos.</p>

      <h2 style={{ fontSize: '1.05rem', margin: '22px 0 8px' }}>1. Datos que recopilamos</h2>
      <p style={{ marginBottom: 16 }}>Datos de cuenta (nombre, correo, teléfono, cédula), datos clínicos que el fisioterapeuta y el paciente registran (anamnesis, evaluaciones, sesiones, ejercicios, niveles de dolor) y, si el fisioterapeuta lo autoriza, la lectura de su agenda de Google Calendar para mostrar sus citas del día.</p>

      <h2 style={{ fontSize: '1.05rem', margin: '22px 0 8px' }}>2. Cómo usamos los datos</h2>
      <p style={{ marginBottom: 16 }}>Únicamente para prestar el servicio: gestionar pacientes, evaluaciones, ejercicios, sesiones y agenda. No vendemos ni compartimos datos con terceros con fines publicitarios.</p>

      <h2 style={{ fontSize: '1.05rem', margin: '22px 0 8px' }}>3. Google Calendar</h2>
      <p style={{ marginBottom: 16 }}>Si conectas tu Google Calendar, solicitamos permiso de <strong>solo lectura</strong> para mostrarte tus citas del día dentro de la app. No modificamos tu calendario ni almacenamos el contenido de tus eventos más allá de mostrarlos. El uso de la información de Google se limita a esta función y cumple la Política de Datos de Usuario de los Servicios de API de Google, incluidos sus requisitos de Uso Limitado. Puedes revocar el acceso en cualquier momento desde tu cuenta de Google.</p>

      <h2 style={{ fontSize: '1.05rem', margin: '22px 0 8px' }}>4. Almacenamiento y seguridad</h2>
      <p style={{ marginBottom: 16 }}>Los datos se almacenan en Supabase (infraestructura en la nube) con control de acceso por roles. Cada fisioterapeuta y paciente accede solo a la información que le corresponde.</p>

      <h2 style={{ fontSize: '1.05rem', margin: '22px 0 8px' }}>5. Tus derechos</h2>
      <p style={{ marginBottom: 16 }}>Puedes solicitar acceso, corrección o eliminación de tus datos escribiendo al contacto de abajo.</p>

      <h2 style={{ fontSize: '1.05rem', margin: '22px 0 8px' }}>6. Contacto</h2>
      <p style={{ marginBottom: 16 }}>Para cualquier consulta sobre privacidad: <strong>asdrubalb20@gmail.com</strong>.</p>

      <p style={{ marginTop: 28, fontSize: '.85rem' }}><a href="/" style={{ color: 'var(--white)' }}>← Volver a Momentum</a></p>
    </main>
  );
}
