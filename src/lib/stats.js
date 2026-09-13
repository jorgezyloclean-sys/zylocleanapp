// Cálculos de horas, cumplimiento y rentabilidad. Sin UI.
import { startOfMonth, endOfMonth, addMonths } from "./dates";

export const ESTADOS = ["programado", "en_curso", "finalizado", "no_realizado"];

export function inPeriod(job, from, to) {
  return job.fecha >= from && job.fecha <= to;
}

export function jobsForClient(jobs, clientId) { return jobs.filter((j) => j.clienteId === clientId); }
export function jobsForStaff(jobs, staffId) { return jobs.filter((j) => Array.isArray(j.empleados) && j.empleados.includes(staffId)); }

/** Horas de un registro (fin || ahora). */
export function registroHoras(r, now = Date.now()) {
  if (!r?.inicio) return 0;
  const fin = r.fin ? new Date(r.fin).getTime() : now;
  return Math.max(0, (fin - new Date(r.inicio).getTime()) / 3_600_000);
}

/** Horas reales del trabajo = suma de horas de cada persona (spec §3.5). */
export function jobHoras(job, registros) {
  const mine = registros.filter((r) => r.job_id === job.id && r.fin);
  if (mine.length) return mine.reduce((s, r) => s + registroHoras(r), 0);
  if (job.inicio_real && job.fin_real) {
    // Compatibilidad con trabajos viejos: una duración por persona asignada.
    const h = (new Date(job.fin_real) - new Date(job.inicio_real)) / 3_600_000;
    return h * Math.max(1, (job.empleados || []).length);
  }
  return 0;
}

/** Trabajos cuyo estimado tiene sentido comparar: los que tienen horas reales. */
export function comparables(jobs) { return jobs.filter((j) => j.estado === "finalizado" || j.estado === "en_curso"); }

/** Horas-persona estimadas del trabajo. */
export function jobHorasEstimadas(job, servicio) {
  const min = job.duracion_estimada_min ?? servicio?.duracion_estimada_min;
  if (!min) return 0;
  const personas = Math.max(1, (job.empleados || []).length || servicio?.personas_previstas || 1);
  return (min / 60) * personas;
}

/** % de tareas del checklist cumplidas en un trabajo (spec §3.4). */
export function checklistPct(job, checklist) {
  const total = checklist?.tareas?.length || 0;
  if (!total) return job.estado === "finalizado" ? 100 : 0;
  const done = Object.values(job.tareasCompletadas || {}).filter(Boolean).length;
  return Math.round((done / total) * 100);
}

/** Cumplimiento promedio de checklists sobre un conjunto de trabajos. */
export function avgChecklistPct(jobs, checklists) {
  const evaluables = jobs.filter((j) => j.estado === "finalizado" || j.estado === "en_curso");
  if (!evaluables.length) return null;
  const sum = evaluables.reduce((s, j) => s + checklistPct(j, checklists.find((c) => c.id === j.checklistId)), 0);
  return Math.round(sum / evaluables.length);
}

export function avgRating(jobs) {
  const rated = jobs.filter((j) => typeof j.rating === "number" && j.rating > 0);
  if (!rated.length) return null;
  return Math.round((rated.reduce((s, j) => s + j.rating, 0) / rated.length) * 10) / 10;
}

export function tasaFinalizados(jobs) {
  const cerrados = jobs.filter((j) => j.estado === "finalizado" || j.estado === "no_realizado");
  if (!cerrados.length) return null;
  return Math.round((cerrados.filter((j) => j.estado === "finalizado").length / cerrados.length) * 100);
}

/**
 * Rentabilidad por cliente en un período.
 * Ingresos = servicios mensuales activos × meses del período + montos por trabajo.
 * Horas = registro_horas de trabajos del período. Desvío = real − estimado.
 */
/** Fecha desde la que un servicio cuenta (inicio de frecuencia o alta). */
function servicioDesde(s) { return s.frecuencia?.desde || (s.created_at ? s.created_at.slice(0, 10) : "0000-00-00"); }

/** Suma de fijos mensuales de un cliente para cada mes del rango, solo desde el alta del servicio. */
function ingresosMensuales(svc, from, to) {
  let total = 0;
  let cur = startOfMonth(from);
  while (cur <= to) {
    const finMes = endOfMonth(cur);
    total += svc.filter((s) => s.activo && s.tipo_monto === "mensual" && servicioDesde(s) <= finMes)
      .reduce((sum, s) => sum + Number(s.monto_acordado || 0), 0);
    cur = addMonths(cur, 1);
  }
  return total;
}

export function rentabilidadPorCliente({ clients, servicios, jobs, registros, from, to }) {
  const enPeriodo = jobs.filter((j) => inPeriod(j, from, to));
  return clients.map((c) => {
    const svc = servicios.filter((s) => s.cliente_id === c.id);
    const cj = enPeriodo.filter((j) => j.clienteId === c.id);
    const porTrabajo = cj.filter((j) => j.estado !== "no_realizado").reduce((sum, j) => sum + Number(j.monto || 0), 0);
    const ingresos = ingresosMensuales(svc, from, to) + porTrabajo;
    const horasReales = cj.reduce((s, j) => s + jobHoras(j, registros), 0);
    const horasEst = comparables(cj).reduce((s, j) => s + jobHorasEstimadas(j, svc.find((x) => x.id === j.servicio_id)), 0);
    const finalizados = cj.filter((j) => j.estado === "finalizado").length;
    return {
      cliente: c,
      ingresos,
      moneda: svc[0]?.moneda || "ISK",
      trabajos: cj.length,
      finalizados,
      noRealizados: cj.filter((j) => j.estado === "no_realizado").length,
      horasReales,
      horasEst,
      desvio: horasEst ? horasReales - horasEst : null,
      ingresoPorHora: horasReales > 0 ? ingresos / horasReales : null,
    };
  }).filter((r) => r.trabajos > 0 || r.ingresos > 0);
}

/** Serie mensual (últimos N meses) de ingresos y horas. */
export function serieMensual({ servicios, jobs, registros, meses = 6, hoy }) {
  const out = [];
  let cur = startOfMonth(hoy);
  for (let i = 0; i < meses; i++) {
    const from = cur, to = endOfMonth(cur);
    const enMes = jobs.filter((j) => inPeriod(j, from, to));
    const porTrabajo = enMes.filter((j) => j.estado !== "no_realizado").reduce((sum, j) => sum + Number(j.monto || 0), 0);
    out.unshift({
      mes: from,
      ingresos: ingresosMensuales(servicios, from, to) + porTrabajo,
      horas: enMes.reduce((s, j) => s + jobHoras(j, registros), 0),
      trabajos: enMes.length,
    });
    cur = addMonths(cur, -1);
  }
  return out;
}
