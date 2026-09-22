-- 0008 — Pedidos de la capacitación del 18/09:
--   a) recargos por fin de semana / feriado / nocturno con recálculo automático
--   b) costo por hora de cada persona (registro operativo, NO liquidación de sueldos)
--   c) asignación de vehículos y maquinaria a los trabajos

-- a) Recargos del servicio contratado. Porcentajes sobre `monto_acordado`:
--    {"finde": 25, "feriado": 25, "nocturno": 0}. Solo aplican a tipo_monto = 'por_trabajo'
--    (un monto mensual no se recalcula por día).
alter table public.servicios_contratados
  add column if not exists recargos jsonb not null default '{}'::jsonb;

comment on column public.servicios_contratados.recargos is
  'Porcentajes de recargo: {finde, feriado, nocturno}. Se aplican al monto por trabajo, no al mensual.';

-- El trabajo guarda qué recargo se le aplicó, para que el monto sea auditable
-- aunque después cambie la regla del servicio.
alter table public.jobs
  add column if not exists recargo jsonb;

comment on column public.jobs.recargo is
  'Recargo aplicado al calcular el monto: {motivo: finde|feriado|nocturno, pct, base}. Informativo.';

-- b) Costo por hora de cada persona. Sirve para saber cuánto pagarle por las horas
--    registradas; no calcula impuestos, aportes ni recibos (fuera de alcance, spec §6).
alter table public.staff
  add column if not exists costo_hora numeric(12,2);

comment on column public.staff.costo_hora is
  'Lo que cuesta la hora de esta persona. Registro operativo para estimar pagos y rentabilidad.';

-- c) Vehículos y maquinaria
create table if not exists public.recursos (
  id text primary key default ('rc' || replace(gen_random_uuid()::text, '-', '')),
  nombre text not null,
  tipo text not null default 'maquina' check (tipo in ('vehiculo', 'maquina')),
  identificador text,                       -- patente, número de serie
  activo boolean not null default true,
  notas text,
  created_at timestamptz not null default now()
);
alter table public.recursos enable row level security;

-- Admin administra; el personal solo lee (necesita ver qué se lleva).
drop policy if exists recursos_admin_all on public.recursos;
create policy recursos_admin_all on public.recursos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists recursos_leer on public.recursos;
create policy recursos_leer on public.recursos
  for select to authenticated using (true);

-- Qué se llevó cada trabajo: ids de `recursos`.
alter table public.jobs
  add column if not exists recursos jsonb not null default '[]'::jsonb;

comment on column public.jobs.recursos is 'Ids de public.recursos asignados a este trabajo.';

do $$ begin alter publication supabase_realtime add table public.recursos; exception when duplicate_object then null; end $$;
