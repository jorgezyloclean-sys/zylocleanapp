-- =============================================================================
-- reset_staging.sql — SOLO PARA EL PROYECTO DE STAGING. Borra todo lo de la app.
-- Nunca correr en el proyecto real (ucraygtmvmdftiteqfgq).
-- =============================================================================
drop table if exists public.solicitudes cascade;
drop table if exists public.portal_tokens cascade;
drop table if exists public.registro_horas cascade;
drop table if exists public.jobs cascade;
drop table if exists public.servicios_contratados cascade;
drop table if exists public.checklists cascade;
drop table if exists public.staff cascade;
drop table if exists public.clients cascade;

drop function if exists public.portal_get(text);
drop function if exists public.portal_rate(text, text, int, text);
drop function if exists public.portal_request(text, text, date, text);
drop function if exists public.portal_cliente_id(text);
drop function if exists public.rgpd_anonimizar_staff(text);
drop function if exists public.rgpd_anonimizar_cliente(text);
drop function if exists public.jobs_protect_cols();
drop function if exists public.set_my_idioma(text);
drop function if exists public.is_admin();
drop function if exists public.my_staff_id();

drop policy if exists "fotos_leer" on storage.objects;
drop policy if exists "fotos_subir" on storage.objects;
drop policy if exists "fotos_borrar" on storage.objects;
drop policy if exists "proto_fotos_select" on storage.objects;
drop policy if exists "proto_fotos_insert" on storage.objects;
drop policy if exists "proto_fotos_delete" on storage.objects;
delete from storage.objects where bucket_id in ('client-photos', 'job-photos');
delete from storage.buckets where id in ('client-photos', 'job-photos');

notify pgrst, 'reload schema';
