-- ============================================================================
-- Vaciado de datos de prueba — ZyloClean
-- ============================================================================
-- Deja la base limpia para que Jorge empiece a cargar datos reales.
-- NO toca la estructura: tablas, políticas, funciones y vistas quedan igual.
-- Solo borra filas.
--
-- Cómo correrlo: Supabase → SQL Editor → New query → pegar todo → Run.
--
-- ANTES DE CORRERLO:
--   1. Revisá el paso 1: ahí decidís qué usuarios se conservan.
--   2. Si querés conservar las checklists ya cargadas, comentá el paso 3.
--   3. Esto no se puede deshacer. Si querés una copia previa:
--      Supabase → Database → Backups → Download.
-- ============================================================================

begin;

-- ---------------------------------------------------------------- paso 1
-- Quién sobrevive. Poné acá los correos de las personas que NO hay que borrar
-- (como mínimo, el de Jorge: es con el que entra al sistema).
-- Si borrás su fila por error, se queda afuera de su propia aplicación.
create temporary table _conservar (email text) on commit drop;
insert into _conservar (email) values
  ('jorgezyloclean@gmail.com');   -- <<< VERIFICAR que sea el correo con el que entra

-- ---------------------------------------------------------------- paso 2
-- Operación: mensajes, horas fichadas, trabajos, servicios, portales, solicitudes
-- y clientes. El orden respeta las claves foráneas.
delete from public.mensajes;
delete from public.registro_horas;
delete from public.jobs;
delete from public.servicios_contratados;
delete from public.portal_tokens;
delete from public.solicitudes;
delete from public.clients;

-- ---------------------------------------------------------------- paso 3
-- Catálogos de prueba: vehículos/máquinas y checklists.
-- Si las checklists que cargaste son reales y las querés conservar,
-- comentá la línea de checklists (poniéndole -- adelante).
delete from public.recursos;
delete from public.checklists;

-- ---------------------------------------------------------------- paso 4
-- Personal de prueba. Se conservan solo los correos del paso 1.
delete from public.staff s
 where lower(coalesce(s.email, '')) not in (select lower(email) from _conservar);

-- ---------------------------------------------------------------- paso 5
-- Usuarios de Auth que quedaron sin ficha de personal (los que podían entrar
-- a la app con los datos de prueba). Solo borra los que ya no están enlazados.
delete from auth.users u
 where lower(coalesce(u.email, '')) not in (select lower(email) from _conservar)
   and not exists (select 1 from public.staff s where s.auth_user_id = u.id);

commit;

-- ---------------------------------------------------------------- control
-- Todo debería dar 0, salvo `staff` y `auth_users`, que quedan en la
-- cantidad de personas que conservaste en el paso 1.
select 'clients'    as tabla, count(*) from public.clients
union all select 'servicios', count(*) from public.servicios_contratados
union all select 'jobs',      count(*) from public.jobs
union all select 'registro_horas', count(*) from public.registro_horas
union all select 'mensajes',  count(*) from public.mensajes
union all select 'solicitudes', count(*) from public.solicitudes
union all select 'portal_tokens', count(*) from public.portal_tokens
union all select 'checklists', count(*) from public.checklists
union all select 'recursos',  count(*) from public.recursos
union all select 'staff',     count(*) from public.staff
union all select 'auth_users', count(*) from auth.users
order by tabla;
