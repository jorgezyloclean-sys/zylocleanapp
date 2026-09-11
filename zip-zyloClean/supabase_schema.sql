-- Supabase Schema for ZyloClean v2

-- 1. Create table for Clients
CREATE TABLE public.clients (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  rubro text,
  servicio text,
  frecuencia text,
  ubicaciones integer DEFAULT 1,
  "contactoHabitual" text,
  "contactoEmergencia" text,
  acceso text,
  productos text,
  discrecion text,
  wifi text,
  m2 text,
  estado text DEFAULT 'activo',
  formal boolean DEFAULT true,
  "checklistId" text,
  "addonChecklist" text,
  notas text,
  rating integer DEFAULT 0,
  "totalVisitas" integer DEFAULT 0,
  "proximaVisita" text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create table for Staff
CREATE TABLE public.staff (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  rol text NOT NULL,
  tipo text DEFAULT 'Fijo',
  idiomas jsonb DEFAULT '[]'::jsonb,
  pago text DEFAULT 'Por hora',
  telefono text,
  señal text DEFAULT 'buena',
  destacado boolean DEFAULT false,
  trabajosEsteMes integer DEFAULT 0,
  cumplimiento integer DEFAULT 100,
  estado text DEFAULT 'activo',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create table for Checklists
CREATE TABLE public.checklists (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  tareas jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create table for Jobs
CREATE TABLE public.jobs (
  id text PRIMARY KEY,
  "clienteId" text REFERENCES public.clients(id) ON DELETE CASCADE,
  empleados jsonb NOT NULL DEFAULT '[]'::jsonb,
  fecha text NOT NULL,
  hora text NOT NULL,
  estado text DEFAULT 'pendiente',
  "checklistId" text REFERENCES public.checklists(id) ON DELETE SET NULL,
  "tareasCompletadas" jsonb DEFAULT '{}'::jsonb,
  notas text,
  motivo text,
  rating integer,
  "ubicacionId" text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Enable Row Level Security (RLS) but allow ALL for demo purposes
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on clients" ON public.clients FOR ALL USING (true);
CREATE POLICY "Allow all on staff" ON public.staff FOR ALL USING (true);
CREATE POLICY "Allow all on checklists" ON public.checklists FOR ALL USING (true);
CREATE POLICY "Allow all on jobs" ON public.jobs FOR ALL USING (true);

-- Enable realtime for all tables
alter publication supabase_realtime add table public.clients;
alter publication supabase_realtime add table public.staff;
alter publication supabase_realtime add table public.checklists;
alter publication supabase_realtime add table public.jobs;
