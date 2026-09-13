// Frecuencia de un servicio contratado (spec §3.2): diaria, semanal, quincenal,
// mensual, a demanda. Alimenta la generación automática de trabajos.
import { RefreshCw } from "lucide-react";
import { C, Field, Pill } from "./ui.jsx";
import { DIAS_KEYS, weekdayShort } from "../lib/dates";
import { useT } from "../i18n/index.jsx";

export const FRECUENCIA_TIPOS = ["diaria", "semanal", "quincenal", "mensual", "a_demanda"];

export function frecuenciaLabel(f, t) {
  if (!f || typeof f !== "object") return t("freq.a_demanda");
  const { tipo, dias = [], diaDelMes, notas } = f;
  const name = t(`freq.${tipo}`);
  if (tipo === "a_demanda") return notas ? `${name} — ${notas}` : name;
  if (tipo === "mensual") return diaDelMes ? t("freq.lbl.monthlyDay", { d: diaDelMes }) : name;
  if (tipo === "diaria") return dias.length ? `${name} — ${dias.join(", ")}` : t("freq.lbl.dailyDefault");
  if (tipo === "semanal" || tipo === "quincenal") return dias.length ? `${name} — ${dias.join(", ")}` : `${name} ${t("freq.lbl.noDays")}`;
  return "—";
}

export function FrequencyBadge({ frecuencia }) {
  const { t } = useT();
  if (!frecuencia || frecuencia.tipo === "a_demanda") return <Pill tone="neutral">{t("freq.a_demanda")}</Pill>;
  return <Pill icon={RefreshCw}>{frecuenciaLabel(frecuencia, t)}</Pill>;
}

export default function FrequencyField({ value, onChange }) {
  const { t, lang } = useT();
  const v = { tipo: "semanal", dias: [], diaDelMes: "", desde: "", notas: "", ...(value || {}) };
  const set = (patch) => onChange({ ...v, ...patch });
  const toggleDia = (dia) => set({ dias: v.dias.includes(dia) ? v.dias.filter((d) => d !== dia) : [...v.dias, dia] });
  const usaDias = ["diaria", "semanal", "quincenal"].includes(v.tipo);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12, borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface2 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} role="radiogroup" aria-label={t("freq.type")}>
        {FRECUENCIA_TIPOS.map((id) => (
          <button key={id} type="button" role="radio" aria-checked={v.tipo === id} className={`chip ${v.tipo === id ? "active" : ""}`} onClick={() => set({ tipo: id })}>{t(`freq.${id}`)}</button>
        ))}
      </div>
      {usaDias && (
        <div>
          <p style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{t("freq.days")} {v.tipo === "quincenal" ? t("freq.daysQuincenal") : v.tipo === "diaria" ? t("freq.daysDiaria") : ""}</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {DIAS_KEYS.map((dia, i) => (
              <button key={dia} type="button" aria-pressed={v.dias.includes(dia)} className={`chip ${v.dias.includes(dia) ? "active" : ""}`} onClick={() => toggleDia(dia)} style={{ minWidth: 48, justifyContent: "center", padding: "6px 8px" }}>{weekdayShort(i, lang)}</button>
            ))}
          </div>
        </div>
      )}
      {v.tipo === "mensual" && (
        <Field label={t("freq.dayOfMonth")} hint={t("freq.dayOfMonthHint")}>
          <input type="number" min={1} max={31} className="input-base" value={v.diaDelMes} onChange={(e) => set({ diaDelMes: e.target.value })} placeholder="15" style={{ maxWidth: 140 }} />
        </Field>
      )}
      {v.tipo !== "a_demanda" && (
        <Field label={t("freq.since")} hint={t("freq.sinceHint")}>
          <input type="date" className="input-base" value={v.desde || ""} onChange={(e) => set({ desde: e.target.value })} style={{ maxWidth: 200 }} />
        </Field>
      )}
      {v.tipo === "a_demanda" && (
        <Field label={t("freq.notes")}>
          <input className="input-base" value={v.notas || ""} onChange={(e) => set({ notas: e.target.value })} placeholder={t("freq.notesPh")} />
        </Field>
      )}
      <div style={{ fontSize: 11.5, color: C.primary, fontWeight: 600 }}>{frecuenciaLabel(v, t)}</div>
    </div>
  );
}
