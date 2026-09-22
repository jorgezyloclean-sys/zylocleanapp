-- 0007 — Idioma del cliente.
-- Los correos al cliente y su portal salen en el idioma que se le cargó en la ficha
-- (pedido de Jorge en la capacitación del 18/09). El personal ya tenía `staff.idioma`.

alter table public.clients
  add column if not exists idioma text not null default 'es';

alter table public.clients drop constraint if exists clients_idioma_chk;
alter table public.clients add constraint clients_idioma_chk check (idioma in ('es', 'en', 'is'));

comment on column public.clients.idioma is 'Idioma de los correos y del portal de este cliente (es/en/is).';

-- El portal necesita el idioma para abrirse en el idioma del cliente sin pedirlo.
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
        'id', c.id, 'nombre', c.nombre, 'idioma', c.idioma,
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
      select jsonb_agg(jsonb_build_object('id', ch.id, 'nombre', ch.nombre, 'tareas', ch.tareas, 'traducciones', ch.traducciones))
      from public.checklists ch
      where ch.id in (select "checklistId" from public.jobs where "clienteId" = v_cid)), '[]'::jsonb)
  ) into v;
  return v;
end $$;
grant execute on function public.portal_get(text) to anon, authenticated;
