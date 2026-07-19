# Momentum v3.0 — Next.js + Supabase

App de fisioterapia con base de datos real, autenticación y multi-dispositivo.

## 🚀 Configuración paso a paso

### 1. Crear el proyecto en Supabase (gratis)
1. Entra a **supabase.com** → "Start your project" → crea cuenta
2. **New project** → nombre: `momentum` → elige contraseña de BD (guárdala) → región: South America (São Paulo)
3. Espera ~2 min a que el proyecto se cree

### 2. Crear las tablas
1. En el panel de Supabase: menú lateral → **SQL Editor**
2. Abre el archivo `supabase/schema.sql` de este proyecto, copia TODO su contenido
3. Pégalo en el editor → botón **Run**
4. Debe decir "Success. No rows returned" ✓

### 3. Configurar autenticación
1. Menú lateral → **Authentication → Providers**
2. Verifica que **Email** esté habilitado
3. En **Authentication → Settings**: desactiva "Confirm email" si quieres
   que los usuarios entren sin verificar correo (recomendado para empezar)

### 4. Obtener las claves
1. Menú lateral → **Settings → API**
2. Copia: **Project URL** y **anon public key**

### 5. Configurar el proyecto local
```bash
# requisitos: Node.js 18+ (nodejs.org)
cd momentum-next
cp .env.local.example .env.local
# edita .env.local y pega tu URL y anon key
npm install
npm run dev
```
Abre http://localhost:3000 ✓

### 6. Primer uso
1. **Regístrate como fisioterapeuta** (código: MOMENTUM2025)
2. Luego los pacientes se registran con su correo y quedan
   enlazados automáticamente a tu cuenta
3. Asigna ejercicios desde tu panel

### 7. Publicar en internet (Vercel, gratis)
1. Sube el proyecto a GitHub (crea repo → sube archivos)
2. Entra a **vercel.com** → "Import Project" → selecciona tu repo
3. En "Environment Variables" agrega las 3 variables de `.env.local`
4. **Deploy** → te da una URL pública tipo `momentum.vercel.app` ✓

## 📁 Estructura
```
app/page.jsx          → Login
app/registro/         → Registro (fisio con código / paciente)
app/fisio/            → Panel fisio: pacientes, buscar, asignar/quitar ejercicios
app/paciente/         → Panel paciente: ejercicios de hoy, marcar con EVA
lib/data.js           → Biblioteca clínica completa (120 ejercicios + 4 programas semanales)
lib/supabase.js       → Cliente de conexión
supabase/schema.sql   → Todas las tablas + seguridad RLS
```

## 🔒 Seguridad incluida
- Contraseñas con hash (Supabase Auth)
- Row Level Security: cada fisio solo ve SUS pacientes;
  cada paciente solo ve SUS datos
- Código de registro para fisioterapeutas

## 🔜 Por portar desde la v2 (HTML)
La v3 arranca con el flujo central (auth, pacientes, asignar, registrar con EVA).
Pendientes de portar: evaluación fisioterapéutica completa, sesiones clínicas,
programas semanales UI, cuestionarios PSFS, gráfico de dolor, notificaciones UI,
videos (usar Supabase Storage, bucket "videos"). Los datos ya están en lib/data.js.
