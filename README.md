# ZyloClean — Gestión operativa (v2)

Web app mobile-first para la operación de ZyloClean ehf. (Reykjavík): clientes y
ubicaciones, servicios contratados, programación de trabajos (manual y recurrente),
checklists, control de horas por persona, reportes por período, rentabilidad y portal
del cliente. Tres roles: administración, personal operativo y cliente (portal).

Stack: React 19 + Vite 8 + Supabase (Postgres, Auth, Storage, Edge Functions).
Idiomas: español, inglés, islandés. Modo claro / oscuro.

---

## Correr en local

```bash
npm install
npm run demo        # UI con datos en memoria, sin Supabase → http://localhost:5173
```

`npm run demo` usa `.env.demo` (`VITE_MOCK=1`). Cualquier correo entra; el correo
elige la persona (`ana@example.com` abre la vista del personal; el resto, admin).

Contra una base real:

```bash
cp .env.example .env    # completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

Otros comandos: `npm run build`, `npm run lint`, `npm run smoke` (renderiza todas
las páginas en los tres idiomas con datos de prueba y falla si alguna rompe).

---

## Estructura

```
src/
  App.jsx                 raíz: auth, carga de datos, ruteo por rol
  pages/                  una página por sección (Dashboard, Clients, Staff, Schedule,
                          Checklists, Reports, Profitability, Employee, Portal, Login)
  components/             UI compartida (ui.jsx), formularios, JobDetailModal, DateField
  data/                   useAuth (sesión + perfil), useAppData (carga + realtime), api (escrituras)
  lib/                    dates, format, stats (horas, cumplimiento, rentabilidad), recurrencia,
                          csv, storage (URLs firmadas), theme, toast
  i18n/                   es.js / en.js / is.js — GENERADOS por scripts/i18n_build.py
  email/templates.js      correos (personal y cliente)
  dev/mock.js             datos en memoria para el modo demo
supabase/
  migrations/             0001 baseline (estado del prototipo) → 0002 modelo v2 + auth + RLS → 0003 storage privado
                          → 0004 traducciones de checklists → 0005 mensajes por trabajo (chat beta)
  functions/send-email    correo por SMTP de Gmail (solo usuarios autenticados, sin contraseña en el código)
  functions/admin-users   crea / resetea / elimina usuarios de Auth del personal (solo admin)
  dev/                    reset_staging.sql y seed_staging.sql (solo para un proyecto de prueba)
scripts/
  i18n_build.py           tabla única (clave, es, en, is) → diccionarios. Editar acá, no en src/i18n
  smoke.jsx               smoke test SSR
```

---

## Modelo de datos (resumen)

| Tabla | Qué es |
|---|---|
| `clients` | Cliente + `ubicaciones` (jsonb: dirección, contacto en sitio, acceso, notas) + fotos de referencia |
| `servicios_contratados` | Lo contratado: tipo, frecuencia, hora, monto (mensual o por trabajo), duración estimada, personas, checklist |
| `jobs` | Trabajo: `fecha` (date), hora, estado (`programado` → `en_curso` → `finalizado` / `no_realizado` + motivo), checklist marcado, tareas no hechas con motivo, fotos, incidente (jsonb con resolución), `recurrente_key` |
| `registro_horas` | Inicio/fin **por persona y trabajo** |
| `staff` | Personal: rol (`admin` / `operativo`), idioma, `auth_user_id` (vínculo con Supabase Auth) |
| `checklists` | Plantillas editables. `traducciones` = `{ en: { nombre, tareas[] }, is: {...} }`: el admin carga en español y traduce por pestaña; el personal y el portal ven su idioma (lo no traducido cae al español) |
| `portal_tokens` | Enlaces secretos del portal por cliente, revocables |
| `solicitudes` | Pedidos que el cliente manda desde el portal |
| `mensajes` | **Beta.** Hilo de mensajes por trabajo (admin ↔ personal asignado): texto, foto adjunta (bucket `job-photos`, `chat/<job>/…`), `leido_por`. No se edita; se borra (autor o admin). El portal no lo ve |

Roles: `is_admin()` / `my_staff_id()` (funciones SQL) sobre `staff.auth_user_id = auth.uid()`.
RLS: admin todo; operativo solo sus trabajos, los clientes de esos trabajos, su propia
fila de `staff` y sus registros de horas. El portal entra solo por RPC (`portal_get`,
`portal_rate`, `portal_request`) con token. Un trigger impide que un operativo cambie
campos económicos o de asignación del trabajo.

---

## Poner en marcha un proyecto Supabase

1. **SQL Editor**, en orden: `0001_baseline.sql` → `0002_v2_modelo_y_seguridad.sql` →
   `0003_storage_privado.sql` → `0004_checklists_traducciones.sql` → `0005_mensajes.sql`. Sobre una base con datos del prototipo, la 0002 migra
   (fechas `"Hoy"`/`"Mañana"` a `date`, frecuencia del cliente a servicio, horas a
   `registro_horas`, contraseñas en claro eliminadas).
2. **Primer admin**: Authentication → Users → *Add user* (auto confirm). Luego:
   ```sql
   insert into public.staff (id, nombre, rol, activo, idioma, auth_user_id)
   values ('e_admin', 'Nombre', 'admin', true, 'es', (select id from auth.users where email = 'correo@dominio'));
   ```
   Los demás usuarios se crean desde **Personal → ficha → Crear usuario** (requiere la función `admin-users`).
3. **Edge functions** (CLI de Supabase):
   ```bash
   supabase login
   supabase link --project-ref <ref>
   supabase functions deploy admin-users
   supabase functions deploy send-email
   supabase secrets set GMAIL_USER=jorgezyloclean@gmail.com GMAIL_APP_PASS='xxxx xxxx xxxx xxxx'
   ```
   La contraseña de aplicación de Gmail vive **solo** en secrets. Si Jorge cambia la
   contraseña de la cuenta, Google la revoca y las alertas dejan de salir.
4. `.env` del front con URL y anon key del proyecto. Deploy estático de `dist/`.

---

## De staging a producción

Si el proyecto de prueba se convierte en el oficial: correr `supabase/dev/preparar_produccion.sql`
(borra los datos de prueba, conserva el esquema, activa realtime), crear el primer admin
(paso 2 de arriba), desplegar las funciones y el secret (paso 3), y en Authentication → URL
Configuration poner la URL pública como *Site URL*.

## Qué cambió respecto del prototipo

- Autenticación real (Supabase Auth) y RLS por rol. Fuera `usuario`/`password` de `staff`.
- Buckets de fotos privados, URLs firmadas. Al borrar una foto se borra el archivo.
- `jobs.fecha` es `date`; antes era texto y se guardaba `"Mañana"` literal.
- Servicios contratados → generación de recurrentes (Programación → *Generar recurrentes*, idempotente) y rentabilidad.
- Horas por persona; estimado vs. real; reportes por período con CSV; tareas no hechas con motivo; `no_realizado`.
- Incidentes como sub-registro del trabajo, con resolución (quién, cuándo, nota) e historial.
- Portal por token revocable; "solicitar servicio" ahora guarda de verdad.
- Notificación al personal al asignar/modificar un trabajo (spec §3.3), además del aviso al cliente.
- Cada escritura revisa el error de Supabase; nunca "guardado" sin guardar.
- i18n es/en/is, modo oscuro, código partido en módulos, smoke test.
- **Chat por trabajo (beta, nivel A):** pestaña *Mensajes* en el detalle del trabajo (admin) y botón *Mensajes* en la tarjeta (personal). Badge de no leídos en la tarjeta y en *Programación*. Sin notificaciones push: si la app está cerrada, no avisa.

---

## Pendientes / a tener en cuenta

- **Auth y RLS: revisar y cerrar antes de la entrega** (a cargo de Samuel). Lo de `0002` es
  una base de trabajo. Cosas a mirar: políticas de `storage.objects`, que `verify_jwt` siga
  activo en las funciones, rotación de la anon key si se filtró, `expires_at` en tokens de portal.
- El islandés lo tradujo Crevy: **necesita revisión de un nativo** antes de que lo use el personal.
- Los tipos de servicio (`SERVICE_TYPES` en `ClientForm.jsx`) se guardan en español y se muestran traducidos (`svc.type.N`). Si se agrega un tipo, agregar su clave en `scripts/i18n_build.py`.
- Chat: sin push ni canal general (nivel A). Si se quiere aviso con la app cerrada → PWA + Web Push (nivel C del plan). RLS del chat (`puede_ver_job`) a revisar por Samuel junto con el resto.
- Checklists: la traducción es manual (pestañas EN / IS en Checklists). Traducción automática sería un paso más (API externa, costo por carácter) — no está hecha.
- El portal no muestra fotos (los buckets son privados y el portal es anónimo). Si se quiere, va por una edge function que firme URLs contra el token.
- Recurrencia: se genera con un botón, no con cron. Si se prefiere automático, un cron de Supabase que llame a la misma lógica.
- Rentabilidad: el "costo por hora de referencia" es local al navegador, a propósito (no hay liquidación de sueldos en el alcance).
