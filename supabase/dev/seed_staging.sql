-- =============================================================================
-- seed_staging.sql — Datos inventados para el STAGING (2026-09-12)
-- Requisito previo: crear en Authentication → Users los usuarios
--   admin@zyloclean.test  (administración)  y  ana@zyloclean.test (operativa)
-- con 'Auto confirm user' activado. Nunca correr en el proyecto real.
-- =============================================================================

insert into public.checklists (id, nombre, tareas) values
  ('t_oficinas', 'Oficinas — estándar', '["Vaciar papeleras", "Aspirar alfombras", "Limpiar escritorios", "Baños completos", "Cocina y microondas", "Cristales interiores"]'::jsonb),
  ('t_gastro', 'Local gastronómico', '["Desengrasar cocina", "Pisos con desinfectante", "Baños", "Mesas y sillas", "Sacar basura y reciclaje"]'::jsonb),
  ('t_airbnb', 'Airbnb — cambio de huésped', '["Cambiar sábanas", "Toallas limpias", "Baño completo", "Cocina y heladera", "Reponer amenities", "Foto final de cada ambiente"]'::jsonb)
on conflict do nothing;

insert into public.clients (id, nombre, tipo, rubro, servicio, estado, formal, email, telefono, kennitala, m2, acceso, wifi, productos, discrecion, notas, "checklistId", ubicaciones, "fotosReferencia") values
  ('c_flyover', 'Fly Over Iceland', 'empresa', 'Entretenimiento', 'Limpieza comercial / oficinas', 'activo', true, 'ops@flyover.test', '+354 555 0101', '520199-2340', '800', 'Recepción', 'FOI-Guest / island2026', 'Solo ecológicos', 'Sala VIP cerrada', 'Cliente principal. Cobra fijo mensual.', 't_oficinas', '[{"id": "u_foi", "direccion": "Fiskislóð 43, 101 Reykjavík", "mapsLink": "https://maps.app.goo.gl/foi", "contacto": "Anna · 555 0102", "acceso": "Código puerta 4471, llave en caja", "notas": "Vitrina de cristal en el hall: no apoyar nada."}]'::jsonb, '[]'::jsonb),
  ('c_kaffi', 'Kaffi Vínyl', 'local', 'Gastronomía', 'Limpieza de locales / retail', 'activo', true, '', '+354 555 0201', '', '120', 'Llave', null, null, null, null, 't_gastro', '[{"id": "u_kaffi", "direccion": "Hverfisgata 76, 101 Reykjavík", "mapsLink": "", "contacto": "Jón · 555 0201", "acceso": "Llave en ZyloClean", "notas": "Cerrar el gas de la cocina al salir."}]'::jsonb, '[]'::jsonb),
  ('c_lauga', 'Apartamentos Laugavegur', 'domicilio', 'Alquiler temporario', 'Renta de corta estancia (Airbnb)', 'activo', false, 'host@lauga.test', '', '', '60', null, null, null, null, null, 't_airbnb', '[{"id": "u_l2b", "direccion": "Laugavegur 12, 2B", "mapsLink": "", "contacto": "Host", "acceso": "Lockbox 1990", "notas": "Cambiar sábanas; toallas en el armario."}, {"id": "u_l3a", "direccion": "Laugavegur 12, 3A", "mapsLink": "", "contacto": "Host", "acceso": "Lockbox 1991", "notas": ""}]'::jsonb, '[]'::jsonb)
on conflict do nothing;

insert into public.staff (id, nombre, rol, tipo, pago, idiomas, activo, estado, idioma, email, telefono, destacado, kennitala) values
  ('e_jorge', 'Jorge Ojeda', 'admin', 'Fijo', 'Sueldo fijo', '["Español", "Inglés"]'::jsonb, true, 'activo', 'es', 'admin@zyloclean.test', '+354 555 0001', false, null),
  ('e_ana', 'Ana Torres', 'operativo', 'Fijo', 'Por hora', '["Español"]'::jsonb, true, 'activo', 'es', 'ana@zyloclean.test', '+354 555 0002', true, '010190-1234'),
  ('e_tomasz', 'Tomasz Nowak', 'operativo', 'Temporada', 'Por hora', '["Polaco", "Inglés"]'::jsonb, true, 'activo', 'en', 'tomasz@zyloclean.test', '', false, null),
  ('e_sigrun', 'Sigrún Ólafsdóttir', 'operativo', 'Por hora', 'Por trabajo', '["Islandés", "Inglés"]'::jsonb, true, 'activo', 'is', 'sigrun@zyloclean.test', '', false, null)
on conflict do nothing;

insert into public.servicios_contratados (id, cliente_id, ubicacion_id, tipo_servicio, frecuencia, hora, monto_acordado, tipo_monto, moneda, duracion_estimada_min, personas_previstas, checklist_id, activo, created_at) values
  ('s_foi', 'c_flyover', 'u_foi', 'Limpieza comercial / oficinas', '{"tipo": "semanal", "dias": ["Lun", "Mié", "Vie"], "desde": "2026-08-01"}'::jsonb, '07:00', 380000, 'mensual', 'ISK', 150, 2, 't_oficinas', true, '2026-08-01T00:00:00+00:00'),
  ('s_kaffi', 'c_kaffi', 'u_kaffi', 'Limpieza de locales / retail', '{"tipo": "diaria", "dias": ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"], "desde": "2026-08-15"}'::jsonb, '06:00', 290000, 'mensual', 'ISK', 90, 1, 't_gastro', true, '2026-08-15T00:00:00+00:00'),
  ('s_lauga', 'c_lauga', null, 'Renta de corta estancia (Airbnb)', '{"tipo": "a_demanda", "notas": "Cuando avisa el host"}'::jsonb, '11:00', 18000, 'por_trabajo', 'ISK', 120, 1, 't_airbnb', true, '2026-08-20T00:00:00+00:00')
on conflict do nothing;

insert into public.jobs (id, "clienteId", servicio_id, "ubicacionId", empleados, fecha, hora, estado, "checklistId", "tareasCompletadas", tareas_no_hechas, fotos, duracion_estimada_min, monto, notas, motivo_no_realizado, rating, comentario, inicio_real, fin_real, recurrente_key, incidente, created_at) values
  ('j_001', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-08-22', '06:00', 'finalizado', 't_gastro', '{"0": true, "1": true, "2": true, "3": true, "4": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, null, 4, null, '2026-08-22T06:02:00+00:00', '2026-08-22T07:52:00+00:00', 's_kaffi|2026-08-22', null, '2026-08-21T18:00:00+00:00'),
  ('j_002', 'c_flyover', 's_foi', 'u_foi', '["e_ana", "e_tomasz"]'::jsonb, '2026-08-24', '07:00', 'finalizado', 't_oficinas', '{"0": true, "1": true, "2": true, "3": true, "4": true, "5": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 150, null, null, null, 5, null, '2026-08-24T07:05:00+00:00', '2026-08-24T09:35:00+00:00', 's_foi|2026-08-24', null, '2026-08-23T18:00:00+00:00'),
  ('j_003', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-08-24', '06:00', 'finalizado', 't_gastro', '{"0": true, "1": true, "2": true, "3": true, "4": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, null, null, null, '2026-08-24T06:02:00+00:00', '2026-08-24T08:07:00+00:00', 's_kaffi|2026-08-24', null, '2026-08-23T18:00:00+00:00'),
  ('j_004', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-08-25', '06:00', 'finalizado', 't_gastro', '{"0": true, "1": true, "2": true, "3": true, "4": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, null, 4, null, '2026-08-25T06:02:00+00:00', '2026-08-25T07:32:00+00:00', 's_kaffi|2026-08-25', null, '2026-08-24T18:00:00+00:00'),
  ('j_005', 'c_flyover', 's_foi', 'u_foi', '["e_ana", "e_tomasz"]'::jsonb, '2026-08-26', '07:00', 'finalizado', 't_oficinas', '{"0": true, "1": true, "2": true, "3": true, "4": true, "5": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 150, null, null, null, 5, null, '2026-08-26T07:05:00+00:00', '2026-08-26T09:25:00+00:00', 's_foi|2026-08-26', null, '2026-08-25T18:00:00+00:00'),
  ('j_006', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-08-26', '06:00', 'finalizado', 't_gastro', '{"0": true, "1": true, "2": true, "3": true, "4": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, null, null, null, '2026-08-26T06:02:00+00:00', '2026-08-26T07:32:00+00:00', 's_kaffi|2026-08-26', null, '2026-08-25T18:00:00+00:00'),
  ('j_007', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-08-27', '06:00', 'finalizado', 't_gastro', '{"0": true, "1": true, "2": true, "3": true, "4": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, null, null, null, '2026-08-27T06:02:00+00:00', '2026-08-27T07:52:00+00:00', 's_kaffi|2026-08-27', null, '2026-08-26T18:00:00+00:00'),
  ('j_008', 'c_flyover', 's_foi', 'u_foi', '["e_ana", "e_tomasz"]'::jsonb, '2026-08-28', '07:00', 'finalizado', 't_oficinas', '{"0": true, "1": true, "2": true, "3": true, "4": true, "5": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 150, null, null, null, 5, null, '2026-08-28T07:05:00+00:00', '2026-08-28T10:15:00+00:00', 's_foi|2026-08-28', null, '2026-08-27T18:00:00+00:00'),
  ('j_009', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-08-28', '06:00', 'finalizado', 't_gastro', '{"0": true, "1": true, "2": true, "3": true, "4": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, null, 4, null, '2026-08-28T06:02:00+00:00', '2026-08-28T07:32:00+00:00', 's_kaffi|2026-08-28', null, '2026-08-27T18:00:00+00:00'),
  ('j_010', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-08-29', '06:00', 'finalizado', 't_gastro', '{"0": true, "1": true, "2": true, "3": true, "4": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, null, null, null, '2026-08-29T06:02:00+00:00', '2026-08-29T07:42:00+00:00', 's_kaffi|2026-08-29', null, '2026-08-28T18:00:00+00:00'),
  ('j_011', 'c_flyover', 's_foi', 'u_foi', '["e_ana", "e_tomasz"]'::jsonb, '2026-08-31', '07:00', 'finalizado', 't_oficinas', '{"0": true, "1": true, "2": true, "3": true, "4": true, "5": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 150, null, null, null, 4, null, '2026-08-31T07:05:00+00:00', '2026-08-31T09:25:00+00:00', 's_foi|2026-08-31', null, '2026-08-30T18:00:00+00:00'),
  ('j_012', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-08-31', '06:00', 'finalizado', 't_gastro', '{"0": true, "1": true, "2": true, "3": true, "4": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, null, 4, null, '2026-08-31T06:02:00+00:00', '2026-08-31T07:32:00+00:00', 's_kaffi|2026-08-31', null, '2026-08-30T18:00:00+00:00'),
  ('j_013', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-09-01', '06:00', 'finalizado', 't_gastro', '{"0": true, "1": true, "2": true, "3": true, "4": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, null, null, null, '2026-09-01T06:02:00+00:00', '2026-09-01T08:07:00+00:00', 's_kaffi|2026-09-01', null, '2026-08-31T18:00:00+00:00'),
  ('j_014', 'c_flyover', 's_foi', 'u_foi', '["e_ana", "e_tomasz"]'::jsonb, '2026-09-02', '07:00', 'finalizado', 't_oficinas', '{"0": true, "1": true, "2": true, "3": true, "4": true, "5": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 150, null, null, null, 4, null, '2026-09-02T07:05:00+00:00', '2026-09-02T10:00:00+00:00', 's_foi|2026-09-02', null, '2026-09-01T18:00:00+00:00'),
  ('j_015', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-09-02', '06:00', 'finalizado', 't_gastro', '{"0": true, "1": true, "2": true, "3": true, "4": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, null, null, null, '2026-09-02T06:02:00+00:00', '2026-09-02T07:32:00+00:00', 's_kaffi|2026-09-02', null, '2026-09-01T18:00:00+00:00'),
  ('j_016', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-09-03', '06:00', 'finalizado', 't_gastro', '{"0": true, "1": true, "2": true, "3": true, "4": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, null, 4, null, '2026-09-03T06:02:00+00:00', '2026-09-03T07:42:00+00:00', 's_kaffi|2026-09-03', null, '2026-09-02T18:00:00+00:00'),
  ('j_017', 'c_flyover', 's_foi', 'u_foi', '["e_ana", "e_tomasz"]'::jsonb, '2026-09-04', '07:00', 'finalizado', 't_oficinas', '{"0": true, "1": true, "2": true, "3": true, "4": true, "5": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 150, null, null, null, 4, null, '2026-09-04T07:05:00+00:00', '2026-09-04T09:25:00+00:00', 's_foi|2026-09-04', null, '2026-09-03T18:00:00+00:00'),
  ('j_018', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-09-04', '06:00', 'finalizado', 't_gastro', '{"0": true, "1": true, "2": true, "3": true, "4": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, null, null, null, '2026-09-04T06:02:00+00:00', '2026-09-04T08:07:00+00:00', 's_kaffi|2026-09-04', null, '2026-09-03T18:00:00+00:00'),
  ('j_019', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-09-05', '06:00', 'finalizado', 't_gastro', '{"0": true, "1": true, "2": true, "3": true, "4": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, null, null, null, '2026-09-05T06:02:00+00:00', '2026-09-05T07:32:00+00:00', 's_kaffi|2026-09-05', null, '2026-09-04T18:00:00+00:00'),
  ('j_020', 'c_flyover', 's_foi', 'u_foi', '["e_ana", "e_tomasz"]'::jsonb, '2026-09-07', '07:00', 'finalizado', 't_oficinas', '{"0": true, "1": true, "2": true, "3": true, "4": true, "5": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 150, null, null, null, 5, null, '2026-09-07T07:05:00+00:00', '2026-09-07T10:15:00+00:00', 's_foi|2026-09-07', null, '2026-09-06T18:00:00+00:00'),
  ('j_021', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-09-07', '06:00', 'finalizado', 't_gastro', '{"0": true, "1": true, "2": true, "3": true, "4": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, null, null, null, '2026-09-07T06:02:00+00:00', '2026-09-07T07:32:00+00:00', 's_kaffi|2026-09-07', null, '2026-09-06T18:00:00+00:00'),
  ('j_022', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-09-08', '06:00', 'no_realizado', 't_gastro', '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, 'Local cerrado por evento privado', null, null, null, null, 's_kaffi|2026-09-08', null, '2026-09-07T18:00:00+00:00'),
  ('j_023', 'c_flyover', 's_foi', 'u_foi', '["e_ana", "e_tomasz"]'::jsonb, '2026-09-09', '07:00', 'finalizado', 't_oficinas', '{"0": true, "1": true, "2": true, "3": true, "4": true, "5": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 150, null, null, null, 5, null, '2026-09-09T07:05:00+00:00', '2026-09-09T09:35:00+00:00', 's_foi|2026-09-09', null, '2026-09-08T18:00:00+00:00'),
  ('j_024', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-09-09', '06:00', 'finalizado', 't_gastro', '{"0": true, "1": true, "2": true, "3": true, "4": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, null, 4, null, '2026-09-09T06:02:00+00:00', '2026-09-09T07:32:00+00:00', 's_kaffi|2026-09-09', null, '2026-09-08T18:00:00+00:00'),
  ('j_025', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-09-10', '06:00', 'finalizado', 't_gastro', '{"0": true, "1": true, "2": true, "3": true, "4": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, null, null, null, '2026-09-10T06:02:00+00:00', '2026-09-10T08:07:00+00:00', 's_kaffi|2026-09-10', null, '2026-09-09T18:00:00+00:00'),
  ('j_026', 'c_flyover', 's_foi', 'u_foi', '["e_ana", "e_tomasz"]'::jsonb, '2026-09-11', '07:00', 'finalizado', 't_oficinas', '{"0": true, "1": true, "2": true, "3": true, "4": true, "5": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 150, null, null, null, 5, null, '2026-09-11T07:05:00+00:00', '2026-09-11T09:25:00+00:00', 's_foi|2026-09-11', null, '2026-09-10T18:00:00+00:00'),
  ('j_027', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-09-11', '06:00', 'finalizado', 't_gastro', '{"0": true, "1": true, "2": true, "3": true, "4": true}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, null, null, null, '2026-09-11T06:02:00+00:00', '2026-09-11T07:42:00+00:00', 's_kaffi|2026-09-11', null, '2026-09-10T18:00:00+00:00'),
  ('j_028', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-09-12', '06:00', 'programado', 't_gastro', '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, null, null, null, null, null, 's_kaffi|2026-09-12', null, '2026-09-11T18:00:00+00:00'),
  ('j_029', 'c_flyover', 's_foi', 'u_foi', '["e_ana", "e_tomasz"]'::jsonb, '2026-09-14', '07:00', 'programado', 't_oficinas', '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, 150, null, null, null, null, null, null, null, 's_foi|2026-09-14', null, '2026-09-13T18:00:00+00:00'),
  ('j_030', 'c_kaffi', 's_kaffi', 'u_kaffi', '["e_sigrun"]'::jsonb, '2026-09-14', '06:00', 'programado', 't_gastro', '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, 90, null, null, null, null, null, null, null, 's_kaffi|2026-09-14', null, '2026-09-13T18:00:00+00:00'),
  ('j_031', 'c_lauga', 's_lauga', 'u_l2b', '["e_ana"]'::jsonb, '2026-09-10', '11:00', 'finalizado', 't_airbnb', '{"0": true, "1": true, "2": true, "3": true, "4": true}'::jsonb, '{"5": "Sin batería en el teléfono"}'::jsonb, '[]'::jsonb, 120, 18000, null, null, 3, 'Faltaron las fotos finales', '2026-09-10T11:00:00+00:00', '2026-09-10T13:40:00+00:00', null, '{"texto": "Se rompió un vaso al limpiar la cocina.", "fotos": [], "fecha": "2026-09-10T12:30:00+00:00", "resuelto": false}'::jsonb, '2026-09-09T10:00:00+00:00'),
  ('j_032', 'c_lauga', 's_lauga', 'u_l3a', '["e_ana"]'::jsonb, '2026-09-12', '15:00', 'programado', 't_airbnb', '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, 120, 18000, 'El host deja las toallas nuevas en la entrada.', null, null, null, null, null, null, null, '2026-09-12T08:00:00+00:00')
on conflict do nothing;

insert into public.registro_horas (job_id, personal_id, inicio, fin) values
  ('j_001', 'e_sigrun', '2026-08-22T06:02:00+00:00', '2026-08-22T07:52:00+00:00'),
  ('j_002', 'e_ana', '2026-08-24T07:05:00+00:00', '2026-08-24T09:35:00+00:00'),
  ('j_002', 'e_tomasz', '2026-08-24T07:05:00+00:00', '2026-08-24T09:25:00+00:00'),
  ('j_003', 'e_sigrun', '2026-08-24T06:02:00+00:00', '2026-08-24T08:07:00+00:00'),
  ('j_004', 'e_sigrun', '2026-08-25T06:02:00+00:00', '2026-08-25T07:32:00+00:00'),
  ('j_005', 'e_ana', '2026-08-26T07:05:00+00:00', '2026-08-26T09:25:00+00:00'),
  ('j_005', 'e_tomasz', '2026-08-26T07:05:00+00:00', '2026-08-26T09:15:00+00:00'),
  ('j_006', 'e_sigrun', '2026-08-26T06:02:00+00:00', '2026-08-26T07:32:00+00:00'),
  ('j_007', 'e_sigrun', '2026-08-27T06:02:00+00:00', '2026-08-27T07:52:00+00:00'),
  ('j_008', 'e_ana', '2026-08-28T07:05:00+00:00', '2026-08-28T10:15:00+00:00'),
  ('j_008', 'e_tomasz', '2026-08-28T07:05:00+00:00', '2026-08-28T10:05:00+00:00'),
  ('j_009', 'e_sigrun', '2026-08-28T06:02:00+00:00', '2026-08-28T07:32:00+00:00'),
  ('j_010', 'e_sigrun', '2026-08-29T06:02:00+00:00', '2026-08-29T07:42:00+00:00'),
  ('j_011', 'e_ana', '2026-08-31T07:05:00+00:00', '2026-08-31T09:25:00+00:00'),
  ('j_011', 'e_tomasz', '2026-08-31T07:05:00+00:00', '2026-08-31T09:15:00+00:00'),
  ('j_012', 'e_sigrun', '2026-08-31T06:02:00+00:00', '2026-08-31T07:32:00+00:00'),
  ('j_013', 'e_sigrun', '2026-09-01T06:02:00+00:00', '2026-09-01T08:07:00+00:00'),
  ('j_014', 'e_ana', '2026-09-02T07:05:00+00:00', '2026-09-02T10:00:00+00:00'),
  ('j_014', 'e_tomasz', '2026-09-02T07:05:00+00:00', '2026-09-02T09:50:00+00:00'),
  ('j_015', 'e_sigrun', '2026-09-02T06:02:00+00:00', '2026-09-02T07:32:00+00:00'),
  ('j_016', 'e_sigrun', '2026-09-03T06:02:00+00:00', '2026-09-03T07:42:00+00:00'),
  ('j_017', 'e_ana', '2026-09-04T07:05:00+00:00', '2026-09-04T09:25:00+00:00'),
  ('j_017', 'e_tomasz', '2026-09-04T07:05:00+00:00', '2026-09-04T09:15:00+00:00'),
  ('j_018', 'e_sigrun', '2026-09-04T06:02:00+00:00', '2026-09-04T08:07:00+00:00'),
  ('j_019', 'e_sigrun', '2026-09-05T06:02:00+00:00', '2026-09-05T07:32:00+00:00'),
  ('j_020', 'e_ana', '2026-09-07T07:05:00+00:00', '2026-09-07T10:15:00+00:00'),
  ('j_020', 'e_tomasz', '2026-09-07T07:05:00+00:00', '2026-09-07T10:05:00+00:00'),
  ('j_021', 'e_sigrun', '2026-09-07T06:02:00+00:00', '2026-09-07T07:32:00+00:00'),
  ('j_023', 'e_ana', '2026-09-09T07:05:00+00:00', '2026-09-09T09:35:00+00:00'),
  ('j_023', 'e_tomasz', '2026-09-09T07:05:00+00:00', '2026-09-09T09:25:00+00:00'),
  ('j_024', 'e_sigrun', '2026-09-09T06:02:00+00:00', '2026-09-09T07:32:00+00:00'),
  ('j_025', 'e_sigrun', '2026-09-10T06:02:00+00:00', '2026-09-10T08:07:00+00:00'),
  ('j_026', 'e_ana', '2026-09-11T07:05:00+00:00', '2026-09-11T09:25:00+00:00'),
  ('j_026', 'e_tomasz', '2026-09-11T07:05:00+00:00', '2026-09-11T09:15:00+00:00'),
  ('j_027', 'e_sigrun', '2026-09-11T06:02:00+00:00', '2026-09-11T07:42:00+00:00'),
  ('j_031', 'e_ana', '2026-09-10T11:00:00+00:00', '2026-09-10T13:40:00+00:00')
on conflict do nothing;

insert into public.solicitudes (cliente_id, tipo, fecha, notas, estado) values
  ('c_lauga', 'Limpieza profunda antes de temporada', '2026-09-17', 'Los dos apartamentos, si puede ser el mismo día.', 'nueva')
on conflict do nothing;

insert into public.portal_tokens (token, cliente_id, activo) values
  ('demo-flyover-3f9a1c7e2b', 'c_flyover', true)
on conflict do nothing;


-- Vincular usuarios de Auth con el personal (si ya existen; si no, queda null y se
-- puede repetir este bloque después de crearlos).
update public.staff set auth_user_id = (select id from auth.users where email = 'admin@zyloclean.test' limit 1) where id = 'e_jorge';
update public.staff set auth_user_id = (select id from auth.users where email = 'ana@zyloclean.test'   limit 1) where id = 'e_ana';

select id, nombre, rol, auth_user_id is not null as con_acceso from public.staff order by rol, nombre;
