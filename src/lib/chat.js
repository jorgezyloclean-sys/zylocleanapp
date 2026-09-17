// Helpers del chat por trabajo.
import { toISO } from "./dates";

export const mensajesDeJob = (mensajes, jobId) =>
  (mensajes || []).filter((m) => m.job_id === jobId).sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));

// No leídos para `staffId`: escritos por otro y sin su id en leido_por.
export const noLeidos = (mensajes, staffId, jobId = null) =>
  (mensajes || []).filter((m) => (jobId == null || m.job_id === jobId) && m.autor_id !== staffId && !(m.leido_por || []).includes(staffId));

export const noLeidosPorJob = (mensajes, staffId) => {
  const m = {};
  noLeidos(mensajes, staffId).forEach((x) => { m[x.job_id] = (m[x.job_id] || 0) + 1; });
  return m;
};

// Agrupa por día local (created_at viene en UTC) para los separadores de fecha.
export function agruparPorDia(lista) {
  const out = [];
  lista.forEach((m) => {
    const dia = m.created_at ? toISO(new Date(m.created_at)) : "";
    const last = out[out.length - 1];
    if (last && last.dia === dia) last.items.push(m); else out.push({ dia, items: [m] });
  });
  return out;
}
