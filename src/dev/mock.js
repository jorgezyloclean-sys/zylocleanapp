// Modo demo: VITE_MOCK=1 (ver .env.example). Datos en memoria, sin Supabase.
// Sirve para mostrar la UI sin backend y para el smoke test. NO va a producción.
import { todayISO, addDays, weekdayIndex } from "../lib/dates";
import { newId } from "../lib/ids";

export const MOCK = import.meta.env.VITE_MOCK === "1";

const hoy = todayISO();
const now = Date.now();
const iso = (d) => new Date(d).toISOString();

const store = {
  clients: [
    { id: "c1", nombre: "Fly Over Iceland", idioma: "es", tipo: "empresa", rubro: "Entretenimiento", servicio: "Limpieza comercial / oficinas", estado: "activo", formal: true, email: "ops@flyover.is", telefono: "+354 555 0101", kennitala: "520199-2340", m2: "800", acceso: "Recepción", wifi: "FOI-Guest / island2026", productos: "Solo ecológicos", discrecion: "Sala VIP cerrada", notas: "Cliente principal.", checklistId: "t1",
      ubicaciones: [{ id: "u1", direccion: "Fiskislóð 43, 101 Reykjavík", mapsLink: "https://maps.app.goo.gl/x", contacto: "Anna · 555 0102", acceso: "Código puerta 4471, llave en caja", notas: "Vitrina de cristal en el hall: no apoyar nada." }], fotosReferencia: [] },
    { id: "c2", nombre: "Kaffi Vínyl", idioma: "is", tipo: "local", rubro: "Gastronomía", servicio: "Limpieza de locales / retail", estado: "activo", formal: true, email: "", telefono: "", kennitala: "", m2: "120", acceso: "Llave", checklistId: "t2",
      ubicaciones: [{ id: "u2", direccion: "Hverfisgata 76, 101 Reykjavík", mapsLink: "", contacto: "Jón · 555 0201", acceso: "Llave en ZyloClean", notas: "Cerrar el gas de la cocina al salir." }], fotosReferencia: [] },
    { id: "c3", nombre: "Apartamentos Laugavegur", idioma: "en", tipo: "domicilio", rubro: "Alquiler temporario", servicio: "Renta de corta estancia (Airbnb)", estado: "activo", formal: false, email: "host@lauga.is", checklistId: "t3", m2: "60",
      ubicaciones: [{ id: "u3", direccion: "Laugavegur 12, 2B", mapsLink: "", contacto: "Host", acceso: "Lockbox 1990", notas: "Cambiar sábanas; toallas en el armario." }, { id: "u4", direccion: "Laugavegur 12, 3A", mapsLink: "", contacto: "Host", acceso: "Lockbox 1991", notas: "" }], fotosReferencia: [] },
  ],
  staff: [
    { id: "e1", nombre: "Jorge Ojeda", rol: "admin", tipo: "Fijo", pago: "Sueldo fijo", idiomas: ["Español", "Inglés"], activo: true, estado: "activo", idioma: "es", auth_user_id: "auth-1", email: "jorgezyloclean@gmail.com", telefono: "+354 555 0001", destacado: false },
    { id: "e2", nombre: "Ana Torres", costo_hora: 2500, rol: "operativo", tipo: "Fijo", pago: "Por hora", idiomas: ["Español"], activo: true, estado: "activo", idioma: "es", auth_user_id: "auth-2", email: "ana@example.com", telefono: "+354 555 0002", destacado: true, kennitala: "010190-1234" },
    { id: "e3", nombre: "Tomasz Nowak", costo_hora: 2500, rol: "operativo", tipo: "Temporada", pago: "Por hora", idiomas: ["Polaco", "Inglés"], activo: true, estado: "activo", idioma: "en", auth_user_id: null, email: null, telefono: "", destacado: false },
    { id: "e4", nombre: "Sigrún Ólafsdóttir", costo_hora: 2800, rol: "operativo", tipo: "Por hora", pago: "Por trabajo", idiomas: ["Islandés", "Inglés"], activo: true, estado: "activo", idioma: "is", auth_user_id: "auth-4", email: "sigrun@example.is", telefono: "", destacado: false },
  ],
  checklists: [
    { id: "t1", nombre: "Oficinas — estándar", tareas: ["Vaciar papeleras", "Aspirar alfombras", "Limpiar escritorios", "Baños completos", "Cocina y microondas", "Cristales interiores"],
      traducciones: {
        en: { nombre: "Offices — standard", tareas: ["Empty bins", "Vacuum carpets", "Clean desks", "Full bathrooms", "Kitchen and microwave", "Interior glass"] },
        is: { nombre: "Skrifstofur — staðall", tareas: ["Tæma ruslafötur", "Ryksuga teppi", "Þrífa skrifborð", "Salerni að fullu", "Eldhús og örbylgjuofn", ""] },
      } },
    { id: "t2", nombre: "Local gastronómico", tareas: ["Desengrasar cocina", "Pisos con desinfectante", "Baños", "Mesas y sillas", "Sacar basura y reciclaje"],
      traducciones: {
        en: { nombre: "Restaurant", tareas: ["Degrease kitchen", "Floors with disinfectant", "Bathrooms", "Tables and chairs", "Take out trash and recycling"] },
        is: { nombre: "Veitingastaður", tareas: ["Fituhreinsa eldhús", "Gólf með sótthreinsiefni", "Salerni", "Borð og stólar", "Fara út með rusl og endurvinnslu"] },
      } },
    { id: "t3", nombre: "Airbnb — cambio de huésped", tareas: ["Cambiar sábanas", "Toallas limpias", "Baño completo", "Cocina y heladera", "Reponer amenities", "Foto final de cada ambiente"] },
  ],
  servicios_contratados: [
    { id: "s1", cliente_id: "c1", ubicacion_id: "u1", tipo_servicio: "Limpieza comercial / oficinas", frecuencia: { tipo: "semanal", dias: ["Lun", "Mié", "Vie"], desde: "2026-08-01" }, hora: "07:00", monto_acordado: 380000, tipo_monto: "mensual", moneda: "ISK", recargos: {}, duracion_estimada_min: 150, personas_previstas: 2, checklist_id: "t1", activo: true, created_at: "2026-08-01T00:00:00Z" },
    { id: "s2", cliente_id: "c2", ubicacion_id: "u2", tipo_servicio: "Limpieza de locales / retail", frecuencia: { tipo: "diaria", dias: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"], desde: "2026-08-15" }, hora: "06:00", monto_acordado: 290000, tipo_monto: "mensual", moneda: "ISK", recargos: {}, duracion_estimada_min: 90, personas_previstas: 1, checklist_id: "t2", activo: true, created_at: "2026-08-15T00:00:00Z" },
    { id: "s3", cliente_id: "c3", ubicacion_id: null, tipo_servicio: "Renta de corta estancia (Airbnb)", frecuencia: { tipo: "a_demanda", notas: "Cuando avisa el host" }, hora: "11:00", monto_acordado: 18000, tipo_monto: "por_trabajo", moneda: "ISK", recargos: { finde: 65, feriado: 65, nocturno: 15 }, duracion_estimada_min: 120, personas_previstas: 1, checklist_id: "t3", activo: true, created_at: "2026-08-20T00:00:00Z" },
  ],
  jobs: [],
  registro_horas: [],
  solicitudes: [{ id: "q1", cliente_id: "c3", tipo: "Limpieza profunda antes de temporada", fecha: addDays(hoy, 5), notas: "Los dos apartamentos, si puede ser el mismo día.", estado: "nueva", created_at: iso(now) }],
  portal_tokens: [{ token: "demo-token-fly-over", cliente_id: "c1", activo: true, created_at: "2026-09-01T00:00:00Z" }],
  mensajes: [],
  recursos: [
    { id: "rc1", nombre: "Kangoo blanca", tipo: "vehiculo", identificador: "AB-123", staff_id: "e2", activo: true, notas: "" },
    { id: "rc2", nombre: "Hidrolavadora Kärcher", tipo: "maquina", identificador: "K5-8812", staff_id: "e4", activo: true, notas: "Revisar manguera" },
    { id: "rc3", nombre: "Pulidora industrial", tipo: "maquina", identificador: "", staff_id: null, activo: true, notas: "" },
    { id: "rc4", nombre: "Dacia Dokker", tipo: "vehiculo", identificador: "KL-904", staff_id: null, activo: false, notas: "En el taller" },
  ],
};

// Historial de trabajos: 3 semanas hacia atrás + hoy + mañana
function seedJobs() {
  let n = 0;
  const mk = (p) => ({ id: `j${++n}`, tareasCompletadas: {}, tareas_no_hechas: {}, fotos: [], monto: null, incidente: null, recargo: null, recursos: [], ...p });
  for (let d = -21; d <= 2; d++) {
    const fecha = addDays(hoy, d);
    const wd = weekdayIndex(fecha);
    if ([0, 2, 4].includes(wd)) {
      const past = d < 0; const real = 150 + (d % 3) * 25;
      store.jobs.push(mk({ clienteId: "c1", servicio_id: "s1", ubicacionId: "u1", empleados: ["e2", "e3"], fecha, hora: "07:00", checklistId: "t1", duracion_estimada_min: 150, recurrente_key: `s1|${fecha}`,
        estado: past ? "finalizado" : d === 0 ? "en_curso" : "programado", tareasCompletadas: past ? { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 } : d === 0 ? { 0: 1, 1: 1 } : {},
        rating: past && d % 2 ? 5 : past ? 4 : null, comentario: past && d === -7 ? "Impecable, gracias" : null,
        inicio_real: past ? iso(new Date(`${fecha}T07:05:00`)) : d === 0 ? iso(now - 50 * 60000) : null, fin_real: past ? iso(new Date(`${fecha}T07:05:00`).getTime() + real * 60000) : null, created_at: iso(new Date(`${fecha}T00:00:00`)) }));
      const j = store.jobs[store.jobs.length - 1];
      if (past) { store.registro_horas.push({ id: newId("r"), job_id: j.id, personal_id: "e2", inicio: j.inicio_real, fin: j.fin_real }, { id: newId("r"), job_id: j.id, personal_id: "e3", inicio: j.inicio_real, fin: iso(new Date(j.fin_real).getTime() - 10 * 60000) }); }
      if (d === 0) store.registro_horas.push({ id: newId("r"), job_id: j.id, personal_id: "e2", inicio: j.inicio_real, fin: null });
    }
    if (wd <= 5) {
      const past = d < 0; const real = 90 + ((d + 21) % 4) * 15;
      store.jobs.push(mk({ clienteId: "c2", servicio_id: "s2", ubicacionId: "u2", empleados: ["e4"], fecha, hora: "06:00", checklistId: "t2", duracion_estimada_min: 90, recurrente_key: `s2|${fecha}`,
        estado: past ? (d === -4 ? "no_realizado" : "finalizado") : "programado", motivo_no_realizado: d === -4 ? "Local cerrado por evento privado" : null,
        tareasCompletadas: past && d !== -4 ? { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 } : {}, rating: past && d !== -4 && d % 3 === 0 ? 4 : null,
        inicio_real: past && d !== -4 ? iso(new Date(`${fecha}T06:02:00`)) : null, fin_real: past && d !== -4 ? iso(new Date(`${fecha}T06:02:00`).getTime() + real * 60000) : null, created_at: iso(new Date(`${fecha}T00:00:00`)) }));
      const j = store.jobs[store.jobs.length - 1];
      if (j.inicio_real) store.registro_horas.push({ id: newId("r"), job_id: j.id, personal_id: "e4", inicio: j.inicio_real, fin: j.fin_real });
    }
  }
  store.jobs.push(mk({ clienteId: "c3", servicio_id: "s3", ubicacionId: "u3", empleados: ["e2"], fecha: addDays(hoy, -2), hora: "11:00", checklistId: "t3", duracion_estimada_min: 120, monto: 18000, estado: "finalizado", tareasCompletadas: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 }, tareas_no_hechas: { 5: "Sin batería en el teléfono" }, rating: 3, comentario: "Faltaron fotos", inicio_real: iso(new Date(`${addDays(hoy, -2)}T11:00:00`)), fin_real: iso(new Date(`${addDays(hoy, -2)}T13:40:00`)), created_at: iso(now - 3 * 86400000), incidente: { texto: "Se rompió un vaso al limpiar la cocina.", fotos: [], fecha: iso(now - 2 * 86400000), resuelto: false } }));
  const j = store.jobs[store.jobs.length - 1];
  store.registro_horas.push({ id: newId("r"), job_id: j.id, personal_id: "e2", inicio: j.inicio_real, fin: j.fin_real });
  store.jobs.push(mk({ clienteId: "c3", servicio_id: "s3", ubicacionId: "u4", empleados: ["e2"], fecha: hoy, hora: "15:00", checklistId: "t3", duracion_estimada_min: 120, monto: 18000, estado: "programado", notas: "El host deja las toallas nuevas en la entrada.", created_at: iso(now) }));
}
seedJobs();
// Mensajes de ejemplo en el trabajo de hoy de Fly Over Iceland (Ana + Sigrún)
(() => {
  const j = store.jobs.find((x) => x.fecha === hoy && x.clienteId === "c1");
  if (!j) return;
  store.mensajes.push(
    { id: "m1", job_id: j.id, autor_id: "e1", texto: "Hoy el cliente pidió que se haga primero la sala de reuniones, tienen visita a las 9.", adjunto: null, leido_por: ["e2"], created_at: iso(now - 3 * 3600000) },
    { id: "m2", job_id: j.id, autor_id: "e2", texto: "Perfecto, empezamos por ahí.", adjunto: null, leido_por: ["e1"], created_at: iso(now - 170 * 60000) },
    { id: "m3", job_id: j.id, autor_id: "e1", texto: "Cuando terminen, foto de la cocina por favor.", adjunto: null, leido_por: [], created_at: iso(now - 40 * 60000) },
  );
})();

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach((fn) => fn(snapshot())); }
export function snapshot() { return { ...Object.fromEntries(Object.entries(store).map(([k, v]) => [k, [...v]])), staff_nombres: store.staff.map(({ id, nombre, rol, activo }) => ({ id, nombre, rol, activo })) }; }

const PK = { portal_tokens: "token" };
export const mockApi = {
  upsert(table, row) {
    const pk = PK[table] || "id"; const rows = store[table]; const i = rows.findIndex((r) => r[pk] === row[pk]);
    if (i >= 0) rows[i] = { ...rows[i], ...row }; else rows.push({ created_at: iso(Date.now()), ...row });
    emit(); return rows.find((r) => r[pk] === row[pk]);
  },
  update(table, id, patch) {
    const pk = PK[table] || "id"; const r = store[table].find((x) => x[pk] === id);
    if (!r) throw new Error("No encontrado"); Object.assign(r, patch); emit(); return { ...r };
  },
  remove(table, id) { const pk = PK[table] || "id"; store[table] = store[table].filter((x) => x[pk] !== id); emit(); },
  find(table, pred) { return store[table].find(pred); },
  filter(table, pred) { return store[table].filter(pred); },
  profile: () => ({ ...store.staff[0] }),
  portalGet(token) {
    const t = store.portal_tokens.find((x) => x.token === token && x.activo); if (!t) return null;
    const c = store.clients.find((x) => x.id === t.cliente_id);
    return {
      client: { id: c.id, nombre: c.nombre, idioma: c.idioma || "es", ubicaciones: c.ubicaciones.map((u) => ({ id: u.id, direccion: u.direccion })) },
      jobs: store.jobs.filter((j) => j.clienteId === c.id).sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora)).map((j) => ({ ...j, incidente: j.incidente ? { texto: j.incidente.texto } : null, empleados: j.empleados.map((e) => { const s = store.staff.find((x) => x.id === e); return { id: e, nombre: s?.nombre || "?", idiomas: s?.idiomas || [] }; }) })),
      checklists: store.checklists,
    };
  },
};
