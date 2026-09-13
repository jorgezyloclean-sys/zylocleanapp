// Fechas: en la base viven como 'YYYY-MM-DD' (columna date). Islandia es UTC+0
// sin horario de verano, así que la fecha local del navegador alcanza.

export const DIAS_KEYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function pad2(n) { return String(n).padStart(2, "0"); }

export function toISO(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function fromISO(iso) {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function todayISO() { return toISO(new Date()); }

export function addDays(iso, n) {
  const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d);
}

export function startOfMonth(iso) { return iso.slice(0, 7) + "-01"; }
export function endOfMonth(iso) {
  const d = fromISO(iso); return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}
export function addMonths(iso, n) {
  const d = fromISO(iso); return toISO(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

export function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Índice Lun=0..Dom=6 */
export function weekdayIndex(iso) { return (fromISO(iso).getDay() + 6) % 7; }

/** Lista de 'YYYY-MM-DD' entre dos fechas (inclusive). */
export function eachDay(fromIso, toIso) {
  const out = []; let cur = fromIso;
  while (cur <= toIso) { out.push(cur); cur = addDays(cur, 1); }
  return out;
}

/** Cantidad de meses calendario que toca un rango (para montos mensuales). */
export function monthsInRange(fromIso, toIso) {
  const a = fromISO(fromIso), b = fromISO(toIso);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
}

/** Presets de período para reportes. */
export function periodPresets(today = todayISO()) {
  const thisStart = startOfMonth(today);
  const lastStart = addMonths(thisStart, -1);
  return {
    hoy:        { from: today, to: today },
    semana:     { from: addDays(today, -weekdayIndex(today)), to: addDays(today, 6 - weekdayIndex(today)) },
    mes:        { from: thisStart, to: endOfMonth(today) },
    mes_pasado: { from: lastStart, to: endOfMonth(lastStart) },
    trimestre:  { from: addMonths(thisStart, -2), to: endOfMonth(today) },
  };
}

const LOCALES = { es: "es-AR", en: "en-GB", is: "is-IS" };

export function formatFecha(iso, lang = "es", opts = {}) {
  const d = fromISO(iso);
  if (!d) return "—";
  return d.toLocaleDateString(LOCALES[lang] || LOCALES.es, { day: "2-digit", month: "2-digit", year: "numeric", ...opts });
}

export function formatFechaLarga(iso, lang = "es") {
  const d = fromISO(iso);
  if (!d) return "—";
  return d.toLocaleDateString(LOCALES[lang] || LOCALES.es, { weekday: "long", day: "numeric", month: "long" });
}

export function formatMes(iso, lang = "es") {
  const d = fromISO(iso);
  return d.toLocaleDateString(LOCALES[lang] || LOCALES.es, { month: "long", year: "numeric" });
}

/** Lun..Dom (índice 0..6) abreviado en el idioma dado. */
export function weekdayShort(i, lang = "es") {
  const d = new Date(2024, 0, 1 + i); // 1/1/2024 fue lunes
  const s = d.toLocaleDateString(LOCALES[lang] || LOCALES.es, { weekday: "short" }).replace(".", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatHoraTs(ts, lang = "es") {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString(LOCALES[lang] || LOCALES.es, { hour: "2-digit", minute: "2-digit" });
}
