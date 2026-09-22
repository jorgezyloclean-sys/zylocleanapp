// Servicio contratado (spec §3.2): tipo, frecuencia, monto, duración estimada,
// personas previstas, checklist. Base de recurrencia y rentabilidad.
import { useState } from "react";
import { C, Field, Toggle } from "./ui.jsx";
import FrequencyField from "./FrequencyField.jsx";
import { SERVICE_TYPES, serviceTypeLabel } from "./ClientForm.jsx";
import { todayISO } from "../lib/dates";
import { useT } from "../i18n/index.jsx";
import { localizeChecklist } from "../lib/checklist";
import { MOTIVOS, conRecargo, recargosVacios } from "../lib/tarifas";
import { money } from "../lib/format";

export function emptyServicio(client) {
  return {
    cliente_id: client.id, ubicacion_id: client.ubicaciones?.[0]?.id || null,
    tipo_servicio: client.servicio || SERVICE_TYPES[0],
    frecuencia: { tipo: "semanal", dias: [], diaDelMes: "", desde: todayISO(), notas: "" },
    hora: "08:00", monto_acordado: "", tipo_monto: "mensual", moneda: "ISK", recargos: recargosVacios(),
    duracion_estimada_min: 120, personas_previstas: 1, checklist_id: client.checklistId || null, activo: true, notas: "",
  };
}

export default function ServicioForm({ client, initial, checklists, onSave, onCancel, saving }) {
  const { t, lang } = useT();
  const [form, setForm] = useState({ ...emptyServicio(client), ...initial });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.tipo_servicio) errs.tipo_servicio = t("sf.errType");
    if (form.monto_acordado === "" || Number(form.monto_acordado) < 0) errs.monto_acordado = t("sf.errAmount");
    if (!Number(form.duracion_estimada_min)) errs.duracion_estimada_min = t("sf.errDuration");
    if (["diaria", "semanal", "quincenal"].includes(form.frecuencia?.tipo) && form.frecuencia.tipo !== "diaria" && !(form.frecuencia.dias || []).length) errs.frecuencia = t("sf.errDays");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSave({
      ...form,
      monto_acordado: Number(form.monto_acordado) || 0,
      duracion_estimada_min: Number(form.duracion_estimada_min) || 0,
      personas_previstas: Number(form.personas_previstas) || 1,
      checklist_id: form.checklist_id || null,
      ubicacion_id: form.ubicacion_id || null,
      recargos: Object.fromEntries(MOTIVOS.map((m) => [m, Number(form.recargos?.[m]) || 0])),
    });
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }} noValidate>
      <div className="form-grid-2">
        <Field label={t("sf.type")} required error={errors.tipo_servicio}>
          <select className="input-base" value={form.tipo_servicio} onChange={set("tipo_servicio")}>{SERVICE_TYPES.map((s) => <option key={s} value={s}>{serviceTypeLabel(s, t)}</option>)}</select>
        </Field>
        <Field label={t("sf.location")}>
          <select className="input-base" value={form.ubicacion_id || ""} onChange={set("ubicacion_id")}>
            <option value="">{t("sf.locationAll")}</option>
            {(client.ubicaciones || []).map((u, i) => <option key={u.id} value={u.id}>{u.direccion || t("cli.location", { n: i + 1 })}</option>)}
          </select>
        </Field>
      </div>

      <Field label={t("sf.frequency")} required error={errors.frecuencia}>
        <FrequencyField value={form.frecuencia} onChange={(frecuencia) => setForm({ ...form, frecuencia })} />
      </Field>

      <div className="form-grid-3">
        <Field label={t("sf.hour")}><input type="time" className="input-base" value={form.hora} onChange={set("hora")} /></Field>
        <Field label={t("sf.duration")} required error={errors.duracion_estimada_min} hint={t("sf.durationHint")}>
          <input type="number" min={0} step={15} inputMode="numeric" className="input-base" value={form.duracion_estimada_min} onChange={set("duracion_estimada_min")} />
        </Field>
        <Field label={t("sf.people")}>
          <input type="number" min={1} inputMode="numeric" className="input-base" value={form.personas_previstas} onChange={set("personas_previstas")} />
        </Field>
      </div>

      <div style={{ padding: 12, borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface2 }}>
        <div className="form-grid-3">
          <Field label={t("sf.amount")} required error={errors.monto_acordado}>
            <input type="number" min={0} step="any" inputMode="decimal" className="input-base tabular" value={form.monto_acordado} onChange={set("monto_acordado")} placeholder="0" />
          </Field>
          <Field label={t("sf.amountType")} hint={form.tipo_monto === "mensual" ? t("sf.amountMonthlyHint") : t("sf.amountPerJobHint")}>
            <select className="input-base" value={form.tipo_monto} onChange={set("tipo_monto")}>
              <option value="mensual">{t("sf.amountMonthly")}</option><option value="por_trabajo">{t("sf.amountPerJob")}</option>
            </select>
          </Field>
          <Field label={t("sf.currency")}>
            <select className="input-base" value={form.moneda} onChange={set("moneda")}><option>ISK</option><option>EUR</option><option>USD</option></select>
          </Field>
        </div>

        {/* Recargos: solo tienen sentido sobre un monto por trabajo. */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.borderSubtle}` }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{t("sf.surcharges")}</p>
          <p style={{ fontSize: 11.5, color: C.muted, marginTop: 2, marginBottom: 10 }}>
            {form.tipo_monto === "por_trabajo" ? t("sf.surchargesHint") : t("sf.surchargesMonthly")}
          </p>
          {form.tipo_monto === "por_trabajo" && (
            <div className="form-grid-3">
              {MOTIVOS.map((m) => (
                <Field key={m} label={t(`sf.sur.${m}`)} hint={t(`sf.sur.${m}Hint`)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="number" min={0} max={500} step="any" inputMode="decimal" className="input-base tabular" style={{ width: 80 }}
                      value={form.recargos?.[m] ?? 0}
                      onChange={(e) => setForm({ ...form, recargos: { ...recargosVacios(), ...form.recargos, [m]: e.target.value } })} />
                    <span style={{ fontSize: 13, color: C.muted }}>%</span>
                    <span className="tabular" style={{ fontSize: 12, color: Number(form.recargos?.[m]) > 0 ? C.primary : C.muted2, fontWeight: 600 }}>
                      → {money(conRecargo(form.monto_acordado, form.recargos?.[m]), form.moneda, lang)}
                    </span>
                  </div>
                </Field>
              ))}
            </div>
          )}
        </div>
      </div>

      <Field label={t("common.checklist")} hint={t("sf.checklistHint")}>
        <select className="input-base" value={form.checklist_id || ""} onChange={set("checklist_id")}>
          <option value="">{t("sf.checklistClient")}</option>
          {checklists.map((ck) => <option key={ck.id} value={ck.id}>{localizeChecklist(ck, lang).nombre}</option>)}
        </select>
      </Field>
      <Field label={t("common.notes")}><textarea rows={2} className="input-base" value={form.notas || ""} onChange={set("notas")} style={{ resize: "vertical" }} /></Field>
      <Toggle checked={form.activo} onChange={(v) => setForm({ ...form, activo: v })} label={t("sf.active")} />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8, borderTop: `1px solid ${C.borderSubtle}` }}>
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>{t("common.cancel")}</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? t("common.saving") : t("sf.save")}</button>
      </div>
    </form>
  );
}
