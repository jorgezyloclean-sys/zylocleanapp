-- =============================================================================
-- preparar_produccion.sql — Convertir el staging en el proyecto oficial.
-- Borra SOLO los datos de prueba (el esquema, las políticas y las funciones
-- quedan) y activa realtime en las tablas base. Correr UNA vez, antes de cargar
-- clientes reales. Después: crear el primer admin (ver README).
-- =============================================================================

-- 1. Vaciar datos de prueba (orden por claves foráneas)
delete from public.solicitudes;
delete from public.portal_tokens;
delete from public.registro_horas;
delete from public.jobs;
delete from public.servicios_contratados;
delete from public.clients;
delete from public.checklists;
delete from public.staff;
delete from storage.objects where bucket_id in ('client-photos', 'job-photos');

-- 2. Usuarios de Auth de prueba (los reales se crean después)
delete from auth.users where email in ('admin@zyloclean.test', 'ana@zyloclean.test');

-- 3. Realtime en todas las tablas (idempotente)
do $$ begin alter publication supabase_realtime add table public.clients; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.staff; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.checklists; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.jobs; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.servicios_contratados; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.registro_horas; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.solicitudes; exception when duplicate_object then null; end $$;

-- 4. Verificación
select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1;
select (select count(*) from public.clients) as clientes, (select count(*) from public.staff) as personal, (select count(*) from public.jobs) as trabajos;
