-- =============================================================================
-- 0003_storage_privado.sql — Buckets privados + URLs firmadas
-- =============================================================================
-- Las fotos de "llave / acceso" de los locales estaban en buckets públicos,
-- accesibles por URL sin login. Se cierran y la app pasa a pedir URLs firmadas
-- (1 h). En la base se guarda el *path* dentro del bucket, no la URL.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-photos', 'client-photos', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-photos', 'job-photos', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Políticas: cualquier usuario autenticado (admin u operativo) sube y lee;
-- borra el admin o quien subió el archivo.
drop policy if exists "proto_fotos_select" on storage.objects;
drop policy if exists "proto_fotos_insert" on storage.objects;
drop policy if exists "proto_fotos_delete" on storage.objects;
drop policy if exists "fotos_leer" on storage.objects;
drop policy if exists "fotos_subir" on storage.objects;
drop policy if exists "fotos_borrar" on storage.objects;

create policy "fotos_leer" on storage.objects
  for select to authenticated
  using (bucket_id in ('client-photos', 'job-photos'));

create policy "fotos_subir" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('client-photos', 'job-photos'));

create policy "fotos_borrar" on storage.objects
  for delete to authenticated
  using (bucket_id in ('client-photos', 'job-photos') and (public.is_admin() or owner = auth.uid()));

-- Convertir URLs públicas ya guardadas en paths dentro del bucket.
update public.clients
set "fotosReferencia" = (
  select coalesce(jsonb_agg(
    f || jsonb_build_object('path', regexp_replace(f ->> 'url', '^.*/object/public/client-photos/', ''))
  ), '[]'::jsonb)
  from jsonb_array_elements(coalesce("fotosReferencia", '[]'::jsonb)) f
)
where jsonb_array_length(coalesce("fotosReferencia", '[]'::jsonb)) > 0;

update public.jobs
set fotos = (
  select coalesce(jsonb_agg(regexp_replace(f #>> '{}', '^.*/object/public/job-photos/', '')), '[]'::jsonb)
  from jsonb_array_elements(coalesce(fotos, '[]'::jsonb)) f
)
where jsonb_array_length(coalesce(fotos, '[]'::jsonb)) > 0;

update public.jobs
set incidente = incidente || jsonb_build_object('fotos', (
  select coalesce(jsonb_agg(regexp_replace(f #>> '{}', '^.*/object/public/job-photos/', '')), '[]'::jsonb)
  from jsonb_array_elements(coalesce(incidente -> 'fotos', '[]'::jsonb)) f
))
where incidente is not null;
