-- =============================================================================
-- 0001_baseline.sql — Estado REAL de la base al 10/09/2026
-- =============================================================================
-- Reproduce lo que existe hoy en el proyecto Supabase (verificado por REST),
-- incluidas las columnas que se agregaron a mano desde el panel y que el
-- `supabase_schema.sql` original no tenía. Sirve para levantar una base desde
-- cero. Si la base ya existe, este archivo es idempotente (IF NOT EXISTS).
--
-- Las migraciones siguientes (0002, 0003) transforman este esquema al modelo v2.
-- =============================================================================

create table if not exists public.clients (
  id text primary key,
  nombre text not null,
  rubro text,
  servicio text,
  frecuencia jsonb,
  ubicaciones jsonb default '[]'::jsonb,
  "contactoHabitual" text,
  "contactoEmergencia" text,
  acceso text,
  productos text,
  discrecion text,
  wifi text,
  m2 text,
  estado text default 'activo',
  formal boolean default true,
  "checklistId" text,
  "addonChecklist" text,
  notas text,
  rating integer default 0,
  "totalVisitas" integer default 0,
  "proximaVisita" text,
  "fotosReferencia" jsonb default '[]'::jsonb,
  kennitala text,
  email text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.staff (
  id text primary key,
  nombre text not null,
  tipo text default 'Fijo',
  rol text,
  idiomas jsonb default '[]'::jsonb,
  pago text default 'Por hora',
  telefono text,
  "señal" text default 'buena',
  destacado boolean default false,
  "trabajosEsteMes" integer default 0,
  cumplimiento integer default 100,
  estado text default 'activo',
  usuario text,
  password text,
  kennitala text,
  email text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.checklists (
  id text primary key,
  nombre text not null,
  tareas jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.jobs (
  id text primary key,
  "clienteId" text references public.clients(id) on delete cascade,
  empleados jsonb not null default '[]'::jsonb,
  fecha text not null,
  hora text not null,
  estado text default 'pendiente',
  "checklistId" text references public.checklists(id) on delete set null,
  "tareasCompletadas" jsonb default '{}'::jsonb,
  notas text,
  motivo text,
  rating integer,
  comentario text,
  fotos jsonb default '[]'::jsonb,
  "horaInicio" text,
  "horaFin" text,
  fotosincidente jsonb default '[]'::jsonb,
  "ubicacionId" text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.clients enable row level security;
alter table public.staff enable row level security;
alter table public.checklists enable row level security;
alter table public.jobs enable row level security;

-- Políticas del prototipo: abiertas a todo el mundo. La 0002 las elimina.
do $$ begin
  create policy "Allow all on clients" on public.clients for all using (true) with check (true);
  create policy "Allow all on staff" on public.staff for all using (true) with check (true);
  create policy "Allow all on checklists" on public.checklists for all using (true) with check (true);
  create policy "Allow all on jobs" on public.jobs for all using (true) with check (true);
exception when duplicate_object then null; end $$;

-- Realtime (el prototipo lo tenía activo en las 4 tablas)
do $$ begin alter publication supabase_realtime add table public.clients; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.staff; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.checklists; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.jobs; exception when duplicate_object then null; end $$;

-- Buckets de fotos (hoy públicos; 0003 los cierra)
insert into storage.buckets (id, name, public) values ('client-photos', 'client-photos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('job-photos', 'job-photos', true)
  on conflict (id) do nothing;

-- Subida/lectura abierta en los buckets (así estaba). La 0003 lo cierra.
do $$ begin
  create policy "proto_fotos_select" on storage.objects for select using (bucket_id in ('client-photos','job-photos'));
  create policy "proto_fotos_insert" on storage.objects for insert with check (bucket_id in ('client-photos','job-photos'));
  create policy "proto_fotos_delete" on storage.objects for delete using (bucket_id in ('client-photos','job-photos'));
exception when duplicate_object then null; end $$;
