-- =============================================================================
-- 0002_v2_modelo_y_seguridad.sql — Modelo v2 + autenticación + RLS real
-- =============================================================================
-- Cubre: spec §3.1 (ubicaciones), §3.2 (servicios contratados), §3.3 (estados,
-- recurrencia), §3.4 (tareas no hechas con motivo), §3.5 (horas por persona),
-- §5 (RGPD: acceso por rol, idioma, exportar/eliminar), portal con token.
--
-- Se ejecuta UNA vez sobre 0001. Es destructivo en lo que debe serlo:
-- elimina contraseñas en claro y campos ficticios.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. STAFF: vínculo con Supabase Auth, rol, idioma. Fuera contraseñas en claro.
-- -----------------------------------------------------------------------------
alter table public.staff
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null,
  add column if not exists idioma text not null default 'es',
  add column if not exists activo boolean not null default true;

update public.staff set rol = 'operativo' where rol is null or rol not in ('admin', 'operativo');
alter table public.staff alter column rol set default 'operativo';
alter table public.staff alter column rol set not null;
alter table public.staff drop constraint if exists staff_rol_chk;
alter table public.staff add constraint staff_rol_chk check (rol in ('admin', 'operativo'));
alter table public.staff drop constraint if exists staff_idioma_chk;
alter table public.staff add constraint staff_idioma_chk check (idioma in ('es', 'en', 'is'));

alter table public.staff drop column if exists password;
alter table public.staff drop column if exists usuario;
-- Campos ficticios del prototipo (se inicializaban y nunca se actualizaban)
alter table public.staff drop column if exists "trabajosEsteMes";
alter table public.staff drop column if exists trabajosestemes;
alter table public.staff drop column if exists cumplimiento;

-- -----------------------------------------------------------------------------
-- 2. CLIENTS: tipo según spec, sin campos ficticios. La frecuencia pasa a
--    servicios_contratados (ver §3). `ubicaciones` sigue siendo jsonb con
--    [{id, direccion, mapsLink, contacto, acceso, notas}] (spec §3.1).
-- -----------------------------------------------------------------------------
alter table public.clients
  add column if not exists tipo text not null default 'empresa',
  add column if not exists telefono text;
alter table public.clients drop constraint if exists clients_tipo_chk;
alter table public.clients add constraint clients_tipo_chk check (tipo in ('empresa', 'local', 'domicilio'));
alter table public.clients drop column if exists rating;
alter table public.clients drop column if exists "totalVisitas";
alter table public.clients drop column if exists "proximaVisita";
alter table public.clients drop column if exists "addonChecklist";

-- -----------------------------------------------------------------------------
-- 3. SERVICIOS CONTRATADOS (spec §3.2) — base de recurrencia y rentabilidad
-- -----------------------------------------------------------------------------
create table if not exists public.servicios_contratados (
  id text primary key default ('s' || replace(gen_random_uuid()::text, '-', '')),
  cliente_id text not null references public.clients(id) on delete cascade,
  ubicacion_id text,
  tipo_servicio text not null,
  -- {tipo: diaria|semanal|quincenal|mensual|a_demanda, dias:[Lun..Dom], diaDelMes, desde:'YYYY-MM-DD', notas}
  frecuencia jsonb not null default '{"tipo":"semanal","dias":[]}'::jsonb,
  hora text not null default '08:00',
  monto_acordado numeric(12,2) not null default 0,
  tipo_monto text not null default 'mensual' check (tipo_monto in ('mensual', 'por_trabajo')),
  moneda text not null default 'ISK',
  duracion_estimada_min integer not null default 120,
  personas_previstas integer not null default 1,
  checklist_id text references public.checklists(id) on delete set null,
  activo boolean not null default true,
  notas text,
  created_at timestamptz not null default now()
);
create index if not exists idx_servicios_cliente on public.servicios_contratados(cliente_id);
alter table public.servicios_contratados enable row level security;

-- Migrar la frecuencia que vivía en el cliente a un servicio contratado.
insert into public.servicios_contratados (cliente_id, ubicacion_id, tipo_servicio, frecuencia, checklist_id, notas)
select
  c.id,
  c.ubicaciones -> 0 ->> 'id',
  coalesce(nullif(c.servicio, ''), 'Limpieza'),
  jsonb_build_object(
    'tipo', case c.frecuencia ->> 'tipo' when 'personalizado' then 'a_demanda' else coalesce(c.frecuencia ->> 'tipo', 'semanal') end,
    'dias', coalesce(c.frecuencia -> 'dias', '[]'::jsonb),
    'diaDelMes', c.frecuencia ->> 'diaDelMes',
    'desde', to_char(c.created_at, 'YYYY-MM-DD'),
    'notas', c.frecuencia ->> 'notas'
  ),
  (select ch.id from public.checklists ch where ch.id = c."checklistId"),
  'Migrado desde la ficha del cliente. Completar monto y duración estimada.'
from public.clients c
where c.frecuencia is not null
  and jsonb_typeof(c.frecuencia) = 'object'
  and coalesce((c.frecuencia ->> 'activa')::boolean, false)
  and not exists (select 1 from public.servicios_contratados s where s.cliente_id = c.id);

alter table public.clients drop column if exists frecuencia;

-- -----------------------------------------------------------------------------
-- 4. JOBS: fecha real, estados de la spec, estimado, monto, motivos, incidente,
--    clave de recurrencia.
-- -----------------------------------------------------------------------------
alter table public.jobs add column if not exists fecha_iso date;
update public.jobs set fecha_iso = case
    when lower(trim(fecha)) = 'hoy'                     then (created_at at time zone 'Atlantic/Reykjavik')::date
    when lower(trim(fecha)) in ('mañana', 'manana')     then (created_at at time zone 'Atlantic/Reykjavik')::date + 1
    when fecha ~ '^\d{1,2}/\d{1,2}/\d{4}$'              then to_date(fecha, 'DD/MM/YYYY')
    when fecha ~ '^\d{1,2}/\d{1,2}/\d{2}$'              then to_date(fecha, 'DD/MM/YY')
    when fecha ~ '^\d{1,2}/\d{1,2}$'                    then to_date(fecha || '/' || extract(year from created_at)::int, 'DD/MM/YYYY')
    when fecha ~ '^\d{4}-\d{2}-\d{2}$'                  then fecha::date
    else (created_at at time zone 'Atlantic/Reykjavik')::date
  end
where fecha_iso is null;
alter table public.jobs drop column fecha;
alter table public.jobs rename column fecha_iso to fecha;
alter table public.jobs alter column fecha set not null;

update public.jobs set estado = case estado
  when 'pendiente' then 'programado'
  when 'completo'  then 'finalizado'
  when 'incidente' then 'en_curso'
  else estado end;
alter table public.jobs alter column estado set default 'programado';
alter table public.jobs alter column estado set not null;
alter table public.jobs drop constraint if exists jobs_estado_chk;
alter table public.jobs add constraint jobs_estado_chk
  check (estado in ('programado', 'en_curso', 'finalizado', 'no_realizado'));

alter table public.jobs
  add column if not exists servicio_id text references public.servicios_contratados(id) on delete set null,
  add column if not exists duracion_estimada_min integer,
  add column if not exists monto numeric(12,2),
  add column if not exists motivo_no_realizado text,
  add column if not exists tareas_no_hechas jsonb not null default '{}'::jsonb,   -- {"idx": "motivo"}
  add column if not exists incidente jsonb,                                        -- {texto, fotos:[path], fecha}
  add column if not exists recurrente_key text unique;                             -- servicio_id|YYYY-MM-DD

-- Timestamps reales para inicio/fin a nivel trabajo (primer inicio / último fin)
alter table public.jobs add column if not exists inicio_real timestamptz;
alter table public.jobs add column if not exists fin_real timestamptz;
update public.jobs set
  inicio_real = nullif("horaInicio", '')::timestamptz,
  fin_real    = nullif("horaFin", '')::timestamptz
where "horaInicio" is not null;

update public.jobs
set incidente = jsonb_build_object(
  'texto', coalesce(motivo, ''),
  'fotos', coalesce(fotosincidente, '[]'::jsonb),
  'fecha', created_at)
where (motivo is not null and motivo <> '')
   or jsonb_array_length(coalesce(fotosincidente, '[]'::jsonb)) > 0;

alter table public.jobs drop column if exists motivo;
alter table public.jobs drop column if exists fotosincidente;
alter table public.jobs drop column if exists "horaInicio";
alter table public.jobs drop column if exists "horaFin";

create index if not exists idx_jobs_fecha on public.jobs(fecha);
create index if not exists idx_jobs_cliente on public.jobs("clienteId");
create index if not exists idx_jobs_empleados on public.jobs using gin (empleados);

-- -----------------------------------------------------------------------------
-- 5. REGISTRO DE HORAS por persona (spec §3.5)
-- -----------------------------------------------------------------------------
create table if not exists public.registro_horas (
  id uuid primary key default gen_random_uuid(),
  job_id text not null references public.jobs(id) on delete cascade,
  personal_id text not null references public.staff(id) on delete cascade,
  inicio timestamptz not null default now(),
  fin timestamptz,
  created_at timestamptz not null default now(),
  unique (job_id, personal_id)
);
create index if not exists idx_registro_horas_personal on public.registro_horas(personal_id);
alter table public.registro_horas enable row level security;

-- Las horas que estaban a nivel trabajo se reparten a cada persona asignada.
insert into public.registro_horas (job_id, personal_id, inicio, fin)
select j.id, e.value #>> '{}', j.inicio_real, j.fin_real
from public.jobs j, jsonb_array_elements(j.empleados) e
where j.inicio_real is not null
  and exists (select 1 from public.staff s where s.id = e.value #>> '{}')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 6. PORTAL con token revocable + SOLICITUDES del cliente
-- -----------------------------------------------------------------------------
create table if not exists public.portal_tokens (
  token text primary key default encode(gen_random_bytes(24), 'hex'),
  cliente_id text not null references public.clients(id) on delete cascade,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists idx_portal_tokens_cliente on public.portal_tokens(cliente_id);
alter table public.portal_tokens enable row level security;

create table if not exists public.solicitudes (
  id uuid primary key default gen_random_uuid(),
  cliente_id text not null references public.clients(id) on delete cascade,
  tipo text,
  fecha date,
  notas text,
  estado text not null default 'nueva' check (estado in ('nueva', 'vista', 'programada', 'descartada')),
  created_at timestamptz not null default now()
);
alter table public.solicitudes enable row level security;

-- -----------------------------------------------------------------------------
-- 7. HELPERS DE ROL (security definer: no disparan RLS al consultar staff)
-- -----------------------------------------------------------------------------
create or replace function public.my_staff_id() returns text
language sql stable security definer set search_path = public as $$
  select id from public.staff where auth_user_id = auth.uid() limit 1
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff
    where auth_user_id = auth.uid() and rol = 'admin' and activo
  )
$$;

create or replace function public.set_my_idioma(p_idioma text) returns void
language sql security definer set search_path = public as $$
  update public.staff set idioma = p_idioma
  where auth_user_id = auth.uid() and p_idioma in ('es', 'en', 'is')
$$;
grant execute on function public.set_my_idioma(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 8. RLS — fuera el "Allow all". Admin: todo. Operativo: solo lo suyo.
-- -----------------------------------------------------------------------------
drop policy if exists "Allow all on clients" on public.clients;
drop policy if exists "Allow all on staff" on public.staff;
drop policy if exists "Allow all on checklists" on public.checklists;
drop policy if exists "Allow all on jobs" on public.jobs;

-- clients
create policy clients_admin_all on public.clients
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy clients_operativo_read on public.clients
  for select to authenticated
  using (exists (select 1 from public.jobs j where j."clienteId" = clients.id and j.empleados ? public.my_staff_id()));

-- staff (el operativo solo se ve a sí mismo; cambia idioma vía set_my_idioma)
create policy staff_admin_all on public.staff
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy staff_self_read on public.staff
  for select to authenticated using (id = public.my_staff_id());

-- checklists
create policy checklists_admin_all on public.checklists
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy checklists_read on public.checklists
  for select to authenticated using (true);

-- jobs
create policy jobs_admin_all on public.jobs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy jobs_operativo_read on public.jobs
  for select to authenticated using (empleados ? public.my_staff_id());
create policy jobs_operativo_update on public.jobs
  for update to authenticated
  using (empleados ? public.my_staff_id()) with check (empleados ? public.my_staff_id());

-- El operativo puede avanzar el trabajo, no reasignarlo ni cambiar lo económico.
create or replace function public.jobs_protect_cols() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if new."clienteId" is distinct from old."clienteId"
     or new.empleados is distinct from old.empleados
     or new.fecha is distinct from old.fecha
     or new.hora is distinct from old.hora
     or new.servicio_id is distinct from old.servicio_id
     or new.duracion_estimada_min is distinct from old.duracion_estimada_min
     or new.monto is distinct from old.monto
     or new.recurrente_key is distinct from old.recurrente_key
     or new."checklistId" is distinct from old."checklistId"
     or new.rating is distinct from old.rating
     or new.comentario is distinct from old.comentario then
    raise exception 'Solo administración puede modificar esos campos del trabajo';
  end if;
  return new;
end $$;
drop trigger if exists trg_jobs_protect_cols on public.jobs;
create trigger trg_jobs_protect_cols before update on public.jobs
  for each row execute function public.jobs_protect_cols();

-- servicios_contratados: solo admin
create policy servicios_admin_all on public.servicios_contratados
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- registro_horas: admin todo; operativo lo propio
create policy horas_admin_all on public.registro_horas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy horas_self_all on public.registro_horas
  for all to authenticated
  using (personal_id = public.my_staff_id()) with check (personal_id = public.my_staff_id());

-- portal_tokens / solicitudes: solo admin (el portal entra por RPC)
create policy portal_tokens_admin_all on public.portal_tokens
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy solicitudes_admin_all on public.solicitudes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 9. PORTAL DEL CLIENTE — RPCs con token (anon). Sin datos de otros clientes,
--    sin datos personales del personal más allá del nombre.
-- -----------------------------------------------------------------------------
create or replace function public.portal_cliente_id(p_token text) returns text
language sql stable security definer set search_path = public as $$
  select cliente_id from public.portal_tokens
  where token = p_token and activo and (expires_at is null or expires_at > now())
$$;

create or replace function public.portal_get(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_cid text := public.portal_cliente_id(p_token);
  v jsonb;
begin
  if v_cid is null then return null; end if;
  select jsonb_build_object(
    'client', (
      select jsonb_build_object(
        'id', c.id, 'nombre', c.nombre,
        'ubicaciones', coalesce((
          select jsonb_agg(jsonb_build_object('id', u ->> 'id', 'direccion', u ->> 'direccion'))
          from jsonb_array_elements(coalesce(c.ubicaciones, '[]'::jsonb)) u), '[]'::jsonb))
      from public.clients c where c.id = v_cid),
    'jobs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', j.id, 'fecha', j.fecha, 'hora', j.hora, 'estado', j.estado,
        'checklistId', j."checklistId", 'tareasCompletadas', j."tareasCompletadas",
        'inicio_real', j.inicio_real, 'fin_real', j.fin_real,
        'rating', j.rating, 'comentario', j.comentario, 'ubicacionId', j."ubicacionId",
        'incidente', case when j.incidente is null then null
                          else jsonb_build_object('texto', j.incidente ->> 'texto') end,
        'empleados', (
          select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'nombre', s.nombre, 'idiomas', s.idiomas)), '[]'::jsonb)
          from public.staff s where j.empleados ? s.id),
        'created_at', j.created_at
      ) order by j.fecha desc, j.hora desc)
      from public.jobs j where j."clienteId" = v_cid), '[]'::jsonb),
    'checklists', coalesce((
      select jsonb_agg(jsonb_build_object('id', ch.id, 'nombre', ch.nombre, 'tareas', ch.tareas))
      from public.checklists ch
      where ch.id in (select "checklistId" from public.jobs where "clienteId" = v_cid)), '[]'::jsonb)
  ) into v;
  return v;
end $$;
grant execute on function public.portal_get(text) to anon, authenticated;

create or replace function public.portal_rate(p_token text, p_job_id text, p_rating int, p_comentario text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_cid text := public.portal_cliente_id(p_token);
begin
  if v_cid is null or p_rating < 1 or p_rating > 5 then return false; end if;
  update public.jobs set rating = p_rating, comentario = left(coalesce(p_comentario, ''), 1000)
  where id = p_job_id and "clienteId" = v_cid and estado = 'finalizado';
  return found;
end $$;
grant execute on function public.portal_rate(text, text, int, text) to anon, authenticated;

create or replace function public.portal_request(p_token text, p_tipo text, p_fecha date, p_notas text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_cid text := public.portal_cliente_id(p_token);
begin
  if v_cid is null then return false; end if;
  insert into public.solicitudes (cliente_id, tipo, fecha, notas)
  values (v_cid, left(coalesce(p_tipo, ''), 120), p_fecha, left(coalesce(p_notas, ''), 2000));
  return true;
end $$;
grant execute on function public.portal_request(text, text, date, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 10. RGPD — anonimizar a pedido (spec §5). El borrado del usuario de Auth lo
--     hace la edge function `admin-users` (necesita service role).
-- -----------------------------------------------------------------------------
create or replace function public.rgpd_anonimizar_staff(p_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo administración'; end if;
  update public.staff set
    nombre = 'Empleado eliminado', telefono = null, email = null, kennitala = null,
    idiomas = '[]'::jsonb, auth_user_id = null, activo = false, estado = 'inactivo', destacado = false
  where id = p_id;
end $$;
grant execute on function public.rgpd_anonimizar_staff(text) to authenticated;

create or replace function public.rgpd_anonimizar_cliente(p_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo administración'; end if;
  update public.clients set
    nombre = 'Cliente eliminado', "contactoHabitual" = null, "contactoEmergencia" = null,
    email = null, telefono = null, kennitala = null, acceso = null, wifi = null, notas = null,
    "fotosReferencia" = '[]'::jsonb,
    ubicaciones = (select coalesce(jsonb_agg(jsonb_build_object('id', u ->> 'id', 'direccion', 'Dirección eliminada')), '[]'::jsonb)
                   from jsonb_array_elements(coalesce(ubicaciones, '[]'::jsonb)) u),
    estado = 'inactivo'
  where id = p_id;
  update public.portal_tokens set activo = false where cliente_id = p_id;
  update public.jobs set notas = null, comentario = null, fotos = '[]'::jsonb where "clienteId" = p_id;
end $$;
grant execute on function public.rgpd_anonimizar_cliente(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 11. Realtime para las tablas nuevas
-- -----------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.servicios_contratados;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.registro_horas;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.solicitudes;
exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
