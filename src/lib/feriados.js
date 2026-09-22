// Feriados de Islandia. Se calculan, no se cargan a mano: los móviles dependen de Pascua.
// Fuente: días festivos oficiales (lög um 40 stunda vinnuviku og helgidagar).
// Medio día (Aðfangadagur y Gamlársdagur desde las 13:00) NO se cuenta como feriado completo.

import { toISO } from "./dates";

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher). */
export function pascua(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, mes - 1, dia);
}

const masDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/** Primer <weekday> (0=Dom…6=Sáb) a partir de la fecha dada, inclusive. */
function primerDiaDesde(year, month, day, weekday) {
  const d = new Date(year, month, day);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  return d;
}

/** Feriados de un año, como { 'YYYY-MM-DD': 'nombre' }. */
export function feriadosDe(year) {
  const p = pascua(year);
  const out = {};
  const add = (d, nombre) => { out[toISO(d)] = nombre; };

  add(new Date(year, 0, 1), "Nýársdagur");
  add(masDias(p, -3), "Skírdagur");                       // Jueves Santo
  add(masDias(p, -2), "Föstudagurinn langi");             // Viernes Santo
  add(p, "Páskadagur");
  add(masDias(p, 1), "Annar í páskum");
  add(primerDiaDesde(year, 3, 19, 4), "Sumardagurinn fyrsti"); // 1er jueves desde el 19/4
  add(new Date(year, 4, 1), "Verkalýðsdagurinn");
  add(masDias(p, 39), "Uppstigningardagur");
  add(masDias(p, 49), "Hvítasunnudagur");
  add(masDias(p, 50), "Annar í hvítasunnu");
  add(new Date(year, 5, 17), "Þjóðhátíðardagurinn");
  add(primerDiaDesde(year, 7, 1, 1), "Frídagur verslunarmanna"); // 1er lunes de agosto
  add(new Date(year, 11, 25), "Jóladagur");
  add(new Date(year, 11, 26), "Annar í jólum");
  return out;
}

const cache = new Map();
function tabla(year) {
  if (!cache.has(year)) cache.set(year, feriadosDe(year));
  return cache.get(year);
}

/** Nombre del feriado si `iso` lo es, o null. */
export function feriado(iso) {
  if (!iso) return null;
  return tabla(Number(iso.slice(0, 4)))[iso] || null;
}

export const esFeriado = (iso) => !!feriado(iso);
