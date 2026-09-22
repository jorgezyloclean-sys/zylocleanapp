import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Star, Languages, Phone, KeyRound, Download, ShieldOff, UserCheck, UserX, Users, Mail, Wallet, Truck, Wrench } from "lucide-react";
import { Avatar, C, EmptyState, Field, Modal, PageHeader, Pill, ProgressBar, Segmented, StarRating, Toggle, useConfirm, Banner, FONT_MONO } from "../components/ui.jsx";
import { LANGS, useT } from "../i18n/index.jsx";
import { formatKennitala, hoursLabel, money } from "../lib/format";
import { periodPresets } from "../lib/dates";
import { avgChecklistPct, avgRating, costoPersona, jobsForStaff, tasaFinalizados } from "../lib/stats";
import { downloadFile } from "../lib/csv";
import { run, toast } from "../lib/toast";
import * as api from "../data/api";

const TIPO_KEY = { Fijo: "fijo", Temporada: "temporada", "Por hora": "porHora" };
const PAGO_KEY = { "Por hora": "porHora", "Sueldo fijo": "sueldo", "Por trabajo": "porTrabajo" };
const tipoLabel = (v, t) => t(`st.f.tipo.${TIPO_KEY[v] || "fijo"}`);
const pagoLabel = (v, t) => t(`st.f.pago.${PAGO_KEY[v] || "porHora"}`);

const emptyStaff = () => ({ nombre: "", rol: "operativo", tipo: "Fijo", idiomas: [], pago: "Por hora", costo_hora: "", telefono: "", email: "", kennitala: "", destacado: false, estado: "activo", activo: true, idioma: "es", "señal": "buena" });

export default function StaffPage({ staff, jobs, checklists, clients, registros, recursos = [], profile, patch }) {
  const { t } = useT();
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState("activos");
  const [saving, setSaving] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  const list = useMemo(() => staff
    .filter((s) => filter === "todos" || (filter === "activos" ? s.activo !== false : s.activo === false))
    .sort((a, b) => (a.rol === b.rol ? a.nombre.localeCompare(b.nombre) : a.rol === "admin" ? -1 : 1)), [staff, filter]);

  async function save(form) {
    setSaving(true);
    const saved = await run(() => api.upsertStaff({ ...form, id: modal.item?.id }), { ok: modal.item ? t("st.saved") : t("st.added") });
    setSaving(false);
    if (saved) { patch("staff", saved); setModal({ mode: "view", item: saved }); }
  }

  async function remove(s) {
    if (s.id === profile.id) { toast(t("st.selfDelete"), "error"); return; }
    const n = jobsForStaff(jobs, s.id).length;
    const ok = await confirm({ title: t("st.deleteTitle", { name: s.nombre }), danger: true, confirmLabel: t("common.delete"),
      body: n ? t("st.deleteBodyJobs", { n }) : t("st.deleteBody") });
    if (!ok) return;
    if (s.auth_user_id) { if (!(await run(() => api.adminUsers("unlink", { staff_id: s.id }), { err: t("st.deleteUserErr") }))) return; }
    if (await run(() => api.deleteStaff(s.id), { ok: t("st.deleted") })) { patch("staff", s, true); setModal(null); }
  }

  return (
    <div>
      <PageHeader title={t("st.title")} subtitle={t("st.subtitle", { n: staff.filter((s) => s.activo !== false).length })}
        action={<button className="btn-primary" onClick={() => setModal({ mode: "edit", item: null })}><Plus size={15} /> {t("st.add")}</button>} />
      <div style={{ marginBottom: 18 }}><Segmented ariaLabel={t("common.status")} value={filter} onChange={setFilter} options={[{ id: "activos", label: t("common.active") }, { id: "inactivos", label: t("common.inactive") }, { id: "todos", label: t("common.all") }]} /></div>

      {list.length === 0 && <EmptyState icon={Users} title={t("st.empty")} />}
      <div className="clients-grid">
        {list.map((s, i) => {
          const sJobs = jobsForStaff(jobs, s.id);
          const cumpl = avgChecklistPct(sJobs, checklists);
          const horas = registros.filter((r) => r.personal_id === s.id && r.fin).reduce((a, r) => a + (new Date(r.fin) - new Date(r.inicio)) / 3_600_000, 0);
          return (
            <div key={s.id} className="card animate-fadeUp" style={{ animationDelay: `${i * 50}ms`, marginTop: 0, cursor: "pointer" }} onClick={() => setModal({ mode: "view", item: s })} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setModal({ mode: "view", item: s })}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ position: "relative" }}>
                  <Avatar name={s.nombre} size={48} />
                  {s.destacado && <div style={{ position: "absolute", bottom: -4, right: -4, width: 20, height: 20, borderRadius: "50%", background: "var(--amber)", border: `2px solid ${C.surface}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Star size={10} fill="#fff" color="#fff" /></div>}
                </div>
                <div style={{ display: "flex", gap: 2 }} onClick={(e) => e.stopPropagation()}>
                  <button className="icon-btn" aria-label={t("common.edit")} onClick={() => setModal({ mode: "edit", item: s })}><Pencil size={14} /></button>
                  <button className="icon-btn danger" aria-label={t("common.delete")} onClick={() => remove(s)}><Trash2 size={14} /></button>
                </div>
              </div>
              <p style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{s.nombre}</p>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{tipoLabel(s.tipo, t)} · {pagoLabel(s.pago, t)}</p>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <Pill tone={s.rol === "admin" ? "primary" : "neutral"}>{s.rol === "admin" ? t("st.admin") : t("st.operativo")}</Pill>
                {s.auth_user_id ? <Pill tone="success" icon={UserCheck}>{t("st.hasAccess")}</Pill> : <Pill tone="amber" icon={UserX}>{t("st.noAccess")}</Pill>}
                {s.activo === false && <Pill tone="neutral">{t("estado.inactivo")}</Pill>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                <StarRating value={avgRating(sJobs)} empty={t("common.noRatings")} />
                <span style={{ fontSize: 11, color: C.muted2 }}>·</span>
                <span style={{ fontSize: 11, color: C.muted }}>{t("st.jobsHours", { n: sJobs.filter((j) => j.estado === "finalizado").length, h: hoursLabel(horas) })}</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase" }}>{t("st.compliance")}</span>
                  <span className="tabular" style={{ fontSize: 10, color: C.primary, fontWeight: 700 }}>{cumpl === null ? "—" : `${cumpl}%`}</span>
                </div>
                <ProgressBar value={cumpl ?? 0} />
              </div>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, paddingTop: 12, borderTop: `1px solid ${C.borderSubtle}`, fontSize: 12, color: C.muted }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Languages size={13} /> {(s.idiomas || []).join(", ") || "—"} · {t("st.uiLang")}: {LANGS.find((l) => l.id === s.idioma)?.short || "ES"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Phone size={13} /> {s.telefono || "—"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Mail size={13} /> {s.email || "—"}</div>
              </div>
            </div>
          );
        })}
      </div>

      {modal?.mode === "edit" && (
        <Modal title={modal.item ? t("st.editTitle", { name: modal.item.nombre }) : t("st.add")} onClose={() => setModal(modal.item ? { mode: "view", item: modal.item } : null)} gradient>
          <StaffForm initial={modal.item || emptyStaff()} onSave={save} onCancel={() => setModal(modal.item ? { mode: "view", item: modal.item } : null)} saving={saving} isSelf={modal.item?.id === profile.id} />
        </Modal>
      )}
      {modal?.mode === "view" && (
        <StaffDetail item={staff.find((s) => s.id === modal.item.id) || modal.item} jobs={jobs} clients={clients} registros={registros} checklists={checklists} recursos={recursos} profile={profile} patch={patch}
          onClose={() => setModal(null)} onEdit={() => setModal({ mode: "edit", item: modal.item })} onDelete={() => remove(modal.item)} confirm={confirm} />
      )}
      {confirmDialog}
    </div>
  );
}

function StaffForm({ initial, onSave, onCancel, saving, isSelf }) {
  const { t } = useT();
  const [form, setForm] = useState({ ...emptyStaff(), ...initial, idiomasStr: (initial.idiomas || []).join(", ") });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.nombre.trim()) errs.nombre = t("st.errName");
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = t("cf.errEmail");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const { idiomasStr, ...rest } = form;
    onSave({ ...rest, costo_hora: rest.costo_hora === "" || rest.costo_hora == null ? null : Number(rest.costo_hora), idiomas: idiomasStr.split(",").map((s) => s.trim()).filter(Boolean), estado: rest.activo ? "activo" : "inactivo" });
  }
  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }} noValidate>
      <Field label={t("st.f.name")} required error={errors.nombre}><input className="input-base" value={form.nombre} onChange={set("nombre")} autoFocus /></Field>
      <div className="form-grid-2">
        <Field label={t("st.f.role")} hint={isSelf ? t("st.f.roleSelf") : t("st.f.roleHint")}>
          <select className="input-base" value={form.rol} onChange={set("rol")} disabled={isSelf}><option value="operativo">{t("st.operativo")}</option><option value="admin">{t("st.admin")}</option></select>
        </Field>
        <Field label={t("st.f.uiLang")}>
          <select className="input-base" value={form.idioma || "es"} onChange={set("idioma")}>{LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select>
        </Field>
      </div>
      <div className="form-grid-2">
        <Field label={t("st.f.tipo")}><select className="input-base" value={form.tipo} onChange={set("tipo")}>{Object.entries(TIPO_KEY).map(([v, k]) => <option key={v} value={v}>{t(`st.f.tipo.${k}`)}</option>)}</select></Field>
        <Field label={t("st.f.pago")}><select className="input-base" value={form.pago} onChange={set("pago")}>{Object.entries(PAGO_KEY).map(([v, k]) => <option key={v} value={v}>{t(`st.f.pago.${k}`)}</option>)}</select></Field>
        <Field label={t("st.f.costoHora")} hint={t("st.f.costoHoraHint")}>
          <input type="number" min={0} step="any" inputMode="decimal" className="input-base tabular" value={form.costo_hora ?? ""} onChange={set("costo_hora")} placeholder="ISK/h" />
        </Field>
      </div>
      <div className="form-grid-2">
        <Field label={t("st.f.email")} hint={t("st.f.emailHint")} error={errors.email}><input type="email" inputMode="email" className="input-base" value={form.email || ""} onChange={set("email")} placeholder="empleado@ejemplo.com" /></Field>
        <Field label={t("st.f.phone")}><input type="tel" inputMode="tel" className="input-base" value={form.telefono || ""} onChange={set("telefono")} /></Field>
      </div>
      <div className="form-grid-2">
        <Field label={t("st.f.langs")} hint={t("st.f.langsHint")}><input className="input-base" value={form.idiomasStr} onChange={set("idiomasStr")} placeholder={t("st.f.langsPh")} /></Field>
        <Field label={t("cli.f.kennitala")} hint={t("cf.kennitalaHint")}><input className="input-base" value={form.kennitala || ""} onChange={(e) => setForm({ ...form, kennitala: formatKennitala(e.target.value) })} maxLength={11} inputMode="numeric" /></Field>
      </div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        <Toggle checked={form.destacado} onChange={(v) => setForm({ ...form, destacado: v })} label={t("st.f.featured")} />
        <Toggle checked={form.activo !== false} onChange={(v) => setForm({ ...form, activo: v })} label={t("st.f.active")} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8, borderTop: `1px solid ${C.borderSubtle}` }}>
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>{t("common.cancel")}</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? t("common.saving") : t("common.save")}</button>
      </div>
    </form>
  );
}

function StaffDetail({ item: s, jobs, clients, registros, checklists, recursos = [], profile, patch, onClose, onEdit, onDelete, confirm }) {
  const { t, lang } = useT();
  const [periodo, setPeriodo] = useState("mes");
  const presets = periodPresets();
  const rango = presets[periodo] || presets.mes;
  const pago = costoPersona(s, registros, jobs, rango.from, rango.to);
  const [userForm, setUserForm] = useState({ email: s.email || "", password: "" });
  const [busy, setBusy] = useState(false);
  const sJobs = jobsForStaff(jobs, s.id);

  async function crearUsuario() {
    if (!userForm.email || userForm.password.length < 8) { toast(t("st.passErr"), "error"); return; }
    setBusy(true);
    const r = await run(() => api.adminUsers("create", { staff_id: s.id, email: userForm.email, password: userForm.password }), { ok: t("st.userCreated"), err: t("st.userCreateErr") });
    setBusy(false);
    if (r) { patch("staff", { id: s.id, auth_user_id: r.user_id, email: userForm.email }); setUserForm({ ...userForm, password: "" }); }
  }
  async function resetPass() {
    if (userForm.password.length < 8) { toast(t("st.passErr2"), "error"); return; }
    setBusy(true);
    await run(() => api.adminUsers("reset", { staff_id: s.id, password: userForm.password }), { ok: t("st.passChanged"), err: t("st.passChangeErr") });
    setBusy(false); setUserForm({ ...userForm, password: "" });
  }
  async function quitarAcceso() {
    if (!(await confirm({ title: t("st.removeAccessTitle"), body: t("st.removeAccessBody", { name: s.nombre }), danger: true, confirmLabel: t("st.removeAccess") }))) return;
    setBusy(true);
    if (await run(() => api.adminUsers("unlink", { staff_id: s.id }), { ok: t("st.accessRemoved") })) patch("staff", { id: s.id, auth_user_id: null });
    setBusy(false);
  }
  function exportar() {
    const data = api.exportStaffData({ staff: s, jobs, registros, clients });
    downloadFile(`datos_${s.nombre.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), "application/json");
    toast(t("st.exported"));
  }
  async function anonimizar() {
    if (s.id === profile.id) { toast(t("st.anonSelf"), "error"); return; }
    if (!(await confirm({ title: t("st.anonTitle"), danger: true, confirmLabel: t("st.anon"), body: t("st.anonBody") }))) return;
    setBusy(true);
    if (await run(() => api.adminUsers("delete_rgpd", { staff_id: s.id }), { ok: t("st.anonDone") })) {
      patch("staff", { id: s.id, nombre: "Empleado eliminado", telefono: null, email: null, kennitala: null, idiomas: [], auth_user_id: null, activo: false, estado: "inactivo", destacado: false });
      onClose();
    }
    setBusy(false);
  }

  const horas = registros.filter((r) => r.personal_id === s.id && r.fin).reduce((a, r) => a + (new Date(r.fin) - new Date(r.inicio)) / 3_600_000, 0);
  const aCargo = recursos.filter((r) => r.staff_id === s.id);

  return (
    <Modal title={s.nombre} subtitle={`${s.rol === "admin" ? t("st.admin") : t("st.operativo")} · ${tipoLabel(s.tipo, t)} · ${pagoLabel(s.pago, t)}`} onClose={onClose} gradient
      footer={<>
        <button className="btn-ghost" style={{ marginRight: "auto" }} onClick={exportar}><Download size={14} /> {t("st.export")}</button>
        <button className="btn-ghost" style={{ color: C.danger }} onClick={anonimizar} disabled={busy}><ShieldOff size={14} /> {t("st.anon")}</button>
        <button className="btn-ghost" style={{ color: C.danger }} onClick={onDelete} disabled={busy}><Trash2 size={14} /> {t("common.delete")}</button>
        <button className="btn-primary" onClick={onEdit}><Pencil size={14} /> {t("common.edit")}</button>
      </>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 18 }}>
        {[[t("st.stat.jobs"), sJobs.length], [t("st.stat.finished"), `${tasaFinalizados(sJobs) ?? "—"}%`], [t("st.stat.hours"), hoursLabel(horas)], [t("st.stat.checklist"), `${avgChecklistPct(sJobs, checklists) ?? "—"}%`]].map(([l, v]) => (
          <div key={l} style={{ background: C.pale, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
            <p className="tabular" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 16, fontWeight: 600, color: C.primary }}>{v}</p>
            <p style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{l}</p>
          </div>
        ))}
      </div>

      <dl className="dl" style={{ marginBottom: 20 }}>
        {[[t("st.f.email"), s.email], [t("st.f.phone"), s.telefono], [t("cli.f.kennitala"), s.kennitala], [t("st.d.langs"), (s.idiomas || []).join(", ")], [t("st.d.uiLang"), LANGS.find((l) => l.id === s.idioma)?.label]]
          .filter(([, v]) => v).map(([l, v]) => <div key={l}><dt>{l}</dt><dd>{v}</dd></div>)}
      </dl>

      {/* Cuánto pagarle por lo que trabajó. Registro operativo, no liquidación de sueldos. */}
      <h4 className="section-title"><Wallet size={14} /> {t("st.pay.title")}</h4>
      <div style={{ padding: 12, borderRadius: 12, background: C.surface2, border: `1px solid ${C.borderSubtle}`, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <Segmented value={periodo} onChange={setPeriodo} ariaLabel={t("st.pay.period")} options={[
            { id: "mes", label: t("period.month") }, { id: "mes_pasado", label: t("period.lastMonth") }, { id: "semana", label: t("period.week") },
          ]} />
        </div>
        {pago.tarifa > 0 ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span className="tabular" style={{ fontFamily: FONT_MONO, fontSize: 22, fontWeight: 600, color: C.primary }}>{money(pago.aPagar, "ISK", lang)}</span>
            <span style={{ fontSize: 12, color: C.muted }}>{t("st.pay.formula", { h: hoursLabel(pago.horas), tarifa: money(pago.tarifa, "ISK", lang), n: pago.trabajos })}</span>
          </div>
        ) : (
          <p style={{ fontSize: 12.5, color: C.muted }}>{t("st.pay.noRate", { h: hoursLabel(pago.horas), n: pago.trabajos })}</p>
        )}
        <p style={{ fontSize: 11, color: C.muted2, marginTop: 8 }}>{t("st.pay.note")}</p>
      </div>

      {/* Qué vehículo o máquina tiene a cargo esta persona. */}
      <h4 className="section-title"><Truck size={14} /> {t("res.staffTitle")}</h4>
      <div style={{ marginBottom: 20 }}>
        {aCargo.length === 0 ? (
          <p style={{ fontSize: 12.5, color: C.muted }}>{t("res.staffEmpty")}</p>
        ) : (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {aCargo.map((r) => (
              <Pill key={r.id} tone={r.activo === false ? "neutral" : "primary"} icon={r.tipo === "vehiculo" ? Truck : Wrench}>
                {[r.nombre, r.identificador].filter(Boolean).join(" · ")}
              </Pill>
            ))}
          </div>
        )}
      </div>

      <h4 className="section-title"><KeyRound size={14} /> {t("st.access")}</h4>
      {s.auth_user_id ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Banner tone="info" icon={UserCheck}>{t("st.accessHas", { email: s.email })}</Banner>
          <Field label={t("st.newPass")} hint={t("st.passHint")}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input type="text" autoComplete="new-password" className="input-base" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} style={{ flex: "1 1 200px", maxWidth: 280 }} />
              <button className="btn-ghost" onClick={resetPass} disabled={busy}>{t("st.changePass")}</button>
            </div>
          </Field>
          {s.id !== profile.id && <button className="btn-ghost" style={{ color: C.danger, alignSelf: "flex-start" }} onClick={quitarAcceso} disabled={busy}><UserX size={14} /> {t("st.removeAccess")}</button>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Banner tone="warn" icon={UserX}>{t("st.noAccessBanner")}</Banner>
          <div className="form-grid-2">
            <Field label={t("st.accessEmail")}><input type="email" className="input-base" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></Field>
            <Field label={t("st.initialPass")} hint={t("st.passHint")}><input type="text" autoComplete="new-password" className="input-base" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} /></Field>
          </div>
          <button className="btn-primary btn-sm" style={{ alignSelf: "flex-start" }} onClick={crearUsuario} disabled={busy}><KeyRound size={13} /> {t("st.createUser")}</button>
        </div>
      )}
    </Modal>
  );
}
