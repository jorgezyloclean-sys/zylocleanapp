-- 0009 — Responsable fijo de cada vehículo o máquina.
-- Pedido del 22/09: poder elegir a qué persona del personal queda asignado un recurso,
-- y que esa persona lo vea en su app. No reemplaza la asignación por trabajo
-- (`jobs.recursos`): esto es "de quién es la camioneta", aquello es "qué se llevó hoy".

alter table public.recursos
  add column if not exists staff_id text references public.staff(id) on delete set null;

comment on column public.recursos.staff_id is
  'Persona a cargo del recurso de forma permanente. Null = sin responsable fijo.';

create index if not exists recursos_staff_id_idx on public.recursos (staff_id);
