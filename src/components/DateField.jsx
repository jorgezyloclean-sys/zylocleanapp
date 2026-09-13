// Selector de fecha. Guarda SIEMPRE 'YYYY-MM-DD' (nunca "Hoy"/"Mañana" como texto).
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronRight } from "lucide-react";
import { C, FONT_DISPLAY } from "./ui.jsx";
import { useT } from "../i18n/index.jsx";
import { DIAS_KEYS, addDays, formatFecha, formatMes, fromISO, sameDay, toISO, todayISO, weekdayShort } from "../lib/dates";

export default function DateField({ value, onChange, min }) {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => { const d = fromISO(value) || new Date(); d.setDate(1); return d; });
  const wrapRef = useRef(null);
  const hoy = todayISO();
  const selected = useMemo(() => fromISO(value), [value]);

  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const celdas = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first); start.setDate(start.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [cursor]);

  function pick(iso) { onChange(iso); setOpen(false); }
  const label = value ? (value === hoy ? `${t("common.today")} · ${formatFecha(value, lang)}` : value === addDays(hoy, 1) ? `${t("common.tomorrow")} · ${formatFecha(value, lang)}` : formatFecha(value, lang)) : "";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="input-base" aria-haspopup="dialog" aria-expanded={open}
        style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "left", cursor: "pointer", color: value ? C.ink : C.muted }}>
        <CalendarDays size={15} color="var(--muted)" style={{ flexShrink: 0 }} />
        {label || "—"}
      </button>
      {/* Fallback nativo accesible (móvil) */}
      <input type="date" value={value || ""} min={min} onChange={(e) => e.target.value && pick(e.target.value)} aria-label={t("common.date")}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }} tabIndex={-1} />

      {open && (
        <div role="dialog" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 60, width: 300, background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: "var(--shadow-lg)", padding: 14 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <button type="button" onClick={() => pick(hoy)} className="btn-ghost btn-sm" style={{ flex: 1, justifyContent: "center" }}>{t("common.today")}</button>
            <button type="button" onClick={() => pick(addDays(hoy, 1))} className="btn-ghost btn-sm" style={{ flex: 1, justifyContent: "center" }}>{t("common.tomorrow")}</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button type="button" className="icon-btn" aria-label={t("common.prevMonth")} onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}><ChevronRight size={14} style={{ transform: "rotate(180deg)" }} /></button>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, textTransform: "capitalize", fontFamily: FONT_DISPLAY }}>{formatMes(toISO(cursor), lang)}</span>
            <button type="button" className="icon-btn" aria-label={t("common.nextMonth")} onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}><ChevronRight size={14} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
            {DIAS_KEYS.map((d, i) => <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: C.muted }}>{weekdayShort(i, lang).slice(0, 2)}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
            {celdas.map((d) => {
              const iso = toISO(d);
              const enMes = d.getMonth() === cursor.getMonth();
              const esHoy = iso === hoy, sel = selected && sameDay(d, selected);
              const disabled = min && iso < min;
              return (
                <button key={iso} type="button" onClick={() => !disabled && pick(iso)} disabled={disabled} aria-label={iso}
                  style={{
                    width: "100%", aspectRatio: "1", border: "none", cursor: disabled ? "not-allowed" : "pointer", borderRadius: 8, fontSize: 12,
                    fontWeight: sel ? 700 : 500, background: sel ? C.primary : "transparent",
                    color: sel ? C.onPrimary : disabled ? C.border : !enMes ? C.muted2 : esHoy ? C.primary : C.ink,
                    outline: esHoy && !sel ? `1.5px solid ${C.primary}` : "none", outlineOffset: -1.5,
                  }}>{d.getDate()}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
