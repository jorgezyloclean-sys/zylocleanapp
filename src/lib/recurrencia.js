// Generación de trabajos recurrentes a partir de la frecuencia de un servicio
// contratado (spec §3.3). Idempotente vía `recurrente_key` = servicio_id|fecha.
import { DIAS_KEYS, eachDay, fromISO, weekdayIndex } from "./dates";

export const FRECUENCIA_TIPOS = ["diaria", "semanal", "quincenal", "mensual", "a_demanda"];

/** Devuelve las fechas ISO en [from, to] en que corresponde el servicio. */
export function ocurrencias(servicio, fromIso, toIso) {
  const f = servicio?.frecuencia || {};
  const tipo = f.tipo || "a_demanda";
  if (tipo === "a_demanda") return [];

  const dias = Array.isArray(f.dias) && f.dias.length
    ? f.dias.map((d) => DIAS_KEYS.indexOf(d)).filter((i) => i >= 0)
    : tipo === "diaria" ? [0, 1, 2, 3, 4] : [];

  // Ancla para "cada 2 semanas": la semana de `desde` (o del alta del servicio).
  const desde = f.desde || (servicio.created_at ? servicio.created_at.slice(0, 10) : fromIso);
  const anclaLunes = fromISO(desde);
  anclaLunes.setDate(anclaLunes.getDate() - weekdayIndex(desde));

  const out = [];
  for (const iso of eachDay(fromIso, toIso)) {
    if (iso < desde) continue;
    const d = fromISO(iso);
    if (tipo === "mensual") {
      const dia = Number(f.diaDelMes) || 1;
      const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      if (d.getDate() === Math.min(dia, ultimo)) out.push(iso);
      continue;
    }
    const wd = weekdayIndex(iso);
    if (!dias.includes(wd)) continue;
    if (tipo === "quincenal") {
      const semanas = Math.floor((d - anclaLunes) / (7 * 86400000));
      if (semanas % 2 !== 0) continue;
    }
    out.push(iso);
  }
  return out;
}

export function recurrenteKey(servicioId, iso) { return `${servicioId}|${iso}`; }

/** Arma los trabajos a insertar para un conjunto de servicios en un rango. */
export function planificar(servicios, jobsExistentes, fromIso, toIso) {
  const existentes = new Set(jobsExistentes.map((j) => j.recurrente_key).filter(Boolean));
  const nuevos = [];
  for (const s of servicios) {
    if (!s.activo) continue;
    for (const fecha of ocurrencias(s, fromIso, toIso)) {
      const key = recurrenteKey(s.id, fecha);
      if (existentes.has(key)) continue;
      nuevos.push({ servicio: s, fecha, key });
    }
  }
  return nuevos;
}
