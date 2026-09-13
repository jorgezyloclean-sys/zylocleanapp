const LOCALES = { es: "es-AR", en: "en-GB", is: "is-IS" };

export function money(n, moneda = "ISK", lang = "es") {
  const v = Number(n) || 0;
  try {
    return new Intl.NumberFormat(LOCALES[lang] || LOCALES.es, {
      style: "currency", currency: moneda, maximumFractionDigits: moneda === "ISK" ? 0 : 2,
    }).format(v);
  } catch {
    return `${v.toLocaleString()} ${moneda}`;
  }
}

export function num(n, lang = "es", digits = 1) {
  return new Intl.NumberFormat(LOCALES[lang] || LOCALES.es, { maximumFractionDigits: digits }).format(Number(n) || 0);
}

/** 135 → "2h 15m" */
export function minutesLabel(min) {
  const m = Math.round(Number(min) || 0);
  const h = Math.floor(m / 60), r = m % 60;
  if (h && r) return `${h}h ${r}m`;
  if (h) return `${h}h`;
  return `${r}m`;
}

/** horas decimales → "2h 15m" */
export function hoursLabel(h) { return minutesLabel((Number(h) || 0) * 60); }

/** ms → "1h 2m" / "3m 10s" / "12s" (cronómetro) */
export function durationLabel(ms) {
  if (!ms || ms < 0) ms = 0;
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
}

export function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function initials(name = "") {
  return name.split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?";
}

export function formatKennitala(raw = "") {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
}
