-- 0006 — Nombres del personal visibles para todo el personal autenticado.
-- Un operativo solo lee su propia fila de `staff` (RLS). Para mostrar quién escribió
-- un mensaje necesita el nombre de los demás. Esta vista expone SOLO id, nombre, rol y
-- activo (nada de teléfono, correo, kennitala). Corre con permisos del dueño, a propósito.

create or replace view public.staff_nombres
with (security_invoker = false) as
  select id, nombre, rol, activo from public.staff;

grant select on public.staff_nombres to authenticated;
revoke all on public.staff_nombres from anon;

-- Realtime: asegurar que todas las tablas estén publicadas (staging arrancó con una
-- baseline vieja sin este bloque; en un proyecto nuevo no hace nada).
do $$ begin alter publication supabase_realtime add table public.clients; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.staff; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.checklists; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.jobs; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.servicios_contratados; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.registro_horas; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.solicitudes; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.portal_tokens; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.mensajes; exception when duplicate_object then null; end $$;

-- Verificación: tiene que listar las 9 tablas.
select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1;
