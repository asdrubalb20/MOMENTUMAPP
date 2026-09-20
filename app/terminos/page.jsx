export const metadata = { title: 'Términos del Servicio · Momentum' };

export default function Terminos() {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', lineHeight: 1.6 }}>
      <div className="logo" style={{ marginBottom: 8 }}>
        <span className="w4">Mom</span><span className="w6">en</span><span className="w7">tum</span>
      </div>
      <h1 style={{ fontWeight: 700, marginBottom: 6 }}>Términos del Servicio</h1>
      <p style={{ color: 'var(--grey)', fontSize: '.8rem', marginBottom: 28 }}>Última actualización: septiembre de 2026</p>

      <h2 style={{ fontSize: '1.05rem', margin: '22px 0 8px' }}>1. Objeto</h2>
      <p style={{ marginBottom: 16 }}>Momentum es una herramienta de apoyo para la gestión de tratamientos de fisioterapia (pacientes, evaluaciones, ejercicios, sesiones y agenda). Al usarla, aceptas estos términos.</p>

      <h2 style={{ fontSize: '1.05rem', margin: '22px 0 8px' }}>2. Uso profesional</h2>
      <p style={{ marginBottom: 16 }}>La app es una ayuda organizativa y no sustituye el juicio clínico del profesional ni constituye consejo médico. Las decisiones de tratamiento son responsabilidad del fisioterapeuta.</p>

      <h2 style={{ fontSize: '1.05rem', margin: '22px 0 8px' }}>3. Cuentas y datos</h2>
      <p style={{ marginBottom: 16 }}>Eres responsable de la confidencialidad de tu cuenta y de la exactitud de la información que registres. Debes contar con el consentimiento de tus pacientes para tratar sus datos en la app.</p>

      <h2 style={{ fontSize: '1.05rem', margin: '22px 0 8px' }}>4. Disponibilidad</h2>
      <p style={{ marginBottom: 16 }}>El servicio se ofrece "tal cual", sin garantías de disponibilidad ininterrumpida. Procuramos su correcto funcionamiento pero no nos responsabilizamos por pérdidas derivadas de interrupciones o errores.</p>

      <h2 style={{ fontSize: '1.05rem', margin: '22px 0 8px' }}>5. Contacto</h2>
      <p style={{ marginBottom: 16 }}>Consultas: <strong>asdrubalb20@gmail.com</strong>.</p>

      <p style={{ marginTop: 28, fontSize: '.85rem' }}><a href="/" style={{ color: 'var(--white)' }}>← Volver a Momentum</a></p>
    </main>
  );
}
