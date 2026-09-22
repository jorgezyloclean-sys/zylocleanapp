// Recargos por día y horario (pedido de Jorge, 18/09: fin de semana y feriado se cobran
// más, y hay horario nocturno). Los porcentajes viven en el servicio contratado y se
// aplican al monto POR TRABAJO; un monto mensual no se recalcula por día.
//
// Un trabajo toma UN solo recargo, el más caro de los que apliquen: si un feriado cae
// domingo no se suman los dos.
import { weekdayIndex } from "./dates";
import { feriado } from "./feriados";

/** Nocturno: desde las 18:00 hasta las 07:00 (lo que dijo Jorge en la llamada). */
export const NOCTURNO_DESDE = 18;
export const NOCTURNO_HASTA = 7;

export const MOTIVOS = ["feriado", "finde", "nocturno"];
export const recargosVacios = () => ({ finde: 0, feriado: 0, nocturno: 0 });

export const esFinde = (iso) => weekdayIndex(iso) >= 5;          // 5 = Sáb, 6 = Dom
export function esNocturno(hora) {
  const h = Number(String(hora || "").slice(0, 2));
  if (Number.isNaN(h)) return false;
  return h >= NOCTURNO_DESDE || h < NOCTURNO_HASTA;
}

/** Motivos que aplican a una fecha/hora, de mayor a menor prioridad. */
export function motivosDe(fecha, hora) {
  const out = [];
  if (feriado(fecha)) out.push("feriado");
  if (esFinde(fecha)) out.push("finde");
  if (esNocturno(hora)) out.push("nocturno");
  return out;
}

/**
 * Recargo a aplicar. Devuelve null si no hay ninguno con porcentaje > 0.
 * @returns {{motivo: string, pct: number, nombre?: string}|null}
 */
export function recargoDe(fecha, hora, recargos) {
  if (!recargos || !fecha) return null;
  const candidatos = motivosDe(fecha, hora)
    .map((motivo) => ({ motivo, pct: Number(recargos[motivo]) || 0 }))
    .filter((c) => c.pct > 0);
  if (!candidatos.length) return null;
  const mejor = candidatos.reduce((a, b) => (b.pct > a.pct ? b : a));
  return mejor.motivo === "feriado" ? { ...mejor, nombre: feriado(fecha) } : mejor;
}

/** Monto final de un trabajo del servicio, con el recargo que corresponda. */
export function montoDeTrabajo(servicio, fecha, hora) {
  if (!servicio || servicio.tipo_monto !== "por_trabajo") return { monto: null, recargo: null };
  const base = Number(servicio.monto_acordado) || 0;
  const r = recargoDe(fecha, hora, servicio.recargos);
  if (!r) return { monto: base, recargo: null };
  return {
    monto: Math.round(base * (1 + r.pct / 100)),
    recargo: { motivo: r.motivo, pct: r.pct, base, ...(r.nombre ? { nombre: r.nombre } : {}) },
  };
}

/** Para la vista previa del formulario: cuánto queda un monto con cada recargo. */
export const conRecargo = (base, pct) => Math.round((Number(base) || 0) * (1 + (Number(pct) || 0) / 100));
