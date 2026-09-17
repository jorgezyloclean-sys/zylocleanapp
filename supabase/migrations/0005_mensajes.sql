-- 0005 — Mensajes por trabajo (chat nivel A, beta).
-- Un hilo de mensajes por trabajo entre administración y el personal asignado.
-- Sin canal general ni notificaciones push: el aviso es el badge de no leídos dentro de la app.
-- Adjuntos: bucket privado `job-photos` (ya existe, políticas fotos_*), path chat/<job_id>/...
-- El portal del cliente NO ve los mensajes (portal_get no los expone).

create table if not exists public.mensajes (
  id text primary key default ('m_' || replace(gen_random_uuid()::text, '-', '')),
  job_id text not null references public.jobs(id) on delete cascade,
  autor_id text not null references public.staff(id),
  texto text not null default '',
  adjunto text,                                   -- path en job-photos, o null
  leido_por jsonb not null default '[]'::jsonb,   -- ids de staff que ya lo leyeron
  created_at timestamptz not null default now(),
  constraint mensajes_con_contenido check (length(trim(texto)) > 0 or adjunto is not null)
);
create index if not exists mensajes_job_idx on public.mensajes (job_id, created_at);

comment on table public.mensajes is 'Hilo de mensajes por trabajo (admin ↔ personal asignado). RGPD: se anonimiza el autor al anonimizar al empleado.';

alter table public.mensajes enable row level security;

-- Quién puede ver un hilo: admin, o personal asignado al trabajo.
create or replace function public.puede_ver_job(p_job_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.jobs j where j.id = p_job_id and j.empleados ? public.my_staff_id()
  );
$$;

drop policy if exists mensajes_leer on public.mensajes;
create policy mensajes_leer on public.mensajes for select to authenticated
  using (public.puede_ver_job(job_id));

drop policy if exists mensajes_escribir on public.mensajes;
create policy mensajes_escribir on public.mensajes for insert to authenticated
  with check (public.puede_ver_job(job_id) and autor_id = public.my_staff_id());

-- Solo se puede actualizar `leido_por` (marcar leído); el texto no se edita.
drop policy if exists mensajes_marcar on public.mensajes;
create policy mensajes_marcar on public.mensajes for update to authenticated
  using (public.puede_ver_job(job_id)) with check (public.puede_ver_job(job_id));

create or replace function public.mensajes_protect_cols() returns trigger
language plpgsql as $$
begin
  -- La anonimización RGPD (función security definer) es la única que puede vaciar el texto.
  if current_setting('zylo.anonimizando', true) = '1' then return new; end if;
  if new.texto is distinct from old.texto or new.adjunto is distinct from old.adjunto
     or new.autor_id is distinct from old.autor_id or new.job_id is distinct from old.job_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Un mensaje no se edita; solo se marca como leído';
  end if;
  return new;
end $$;
drop trigger if exists mensajes_protect on public.mensajes;
create trigger mensajes_protect before update on public.mensajes
  for each row execute function public.mensajes_protect_cols();

-- Borrar: admin, o el autor.
drop policy if exists mensajes_borrar on public.mensajes;
create policy mensajes_borrar on public.mensajes for delete to authenticated
  using (public.is_admin() or autor_id = public.my_staff_id());

-- Realtime
do $$ begin alter publication supabase_realtime add table public.mensajes; exception when duplicate_object then null; end $$;

-- RGPD: al anonimizar un empleado, sus mensajes quedan sin texto.
create or replace function public.rgpd_anonimizar_staff(p_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo administración'; end if;
  update public.staff set
    nombre = 'Empleado eliminado', telefono = null, email = null, kennitala = null,
    idiomas = '[]'::jsonb, auth_user_id = null, activo = false, estado = 'inactivo', destacado = false
  where id = p_id;
  perform set_config('zylo.anonimizando', '1', true);
  update public.mensajes set texto = '[mensaje eliminado]', adjunto = null where autor_id = p_id;
  perform set_config('zylo.anonimizando', '0', true);
end $$;
