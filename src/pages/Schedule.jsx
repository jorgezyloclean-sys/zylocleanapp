import { useMemo, useState } from "react";
import { Plus, FileText, CalendarDays, Pencil, Trash2, ClipboardCheck, MapPin, RefreshCw, ChevronRight, AlertTriangle, MessageSquare, Briefcase, Truck, Wrench } from "lucide-react";
import { noLeidosPorJob } from "../lib/chat";
import { Avatar, C, EmptyState, Field, Modal, PageHeader, Pill, Segmented, StarRating, StatusBadge, LiveTimer, PeriodPicker, useConfirm, Banner, FONT_DISPLAY } from "../components/ui.jsx";
import DateField from "../components/DateField.jsx";
import JobDetailModal from "../components/JobDetailModal.jsx";
import { useT } from "../i18n/index.jsx";
import { DIAS_KEYS, addDays, endOfMonth, formatFecha, formatFechaLarga, formatMes, fromISO, periodPresets, startOfMonth, toISO, todayISO, weekdayShort } from "../lib/dates";
import { hoursLabel, minutesLabel, money } from "../lib/format";
import { inPeriod, jobHoras, registroHoras } from "../lib/stats";
import { planificar } from "../lib/recurrencia";
import { run, toast } from "../lib/toast";
import * as api from "../data/api";
import { emailJobToStaff, emailJobAssignedToClient } from "../email/templates";
import { localizeChecklist } from "../lib/checklist";
import { montoDeTrabajo, recargoDe } from "../lib/tarifas";
import { serviceTypeLabel } from "../components/ClientForm.jsx";

const emptyForm = (checklists) => ({ clienteId: "", servicio_id: "", ubicacionId: "", empleados: [], fecha: todayISO(), hora: "08:00", checklistId: checklists[0]?.id || "", duracion_estimada_min: "", monto: "", recargo: null, recursos: [], notas: "" });

export default function SchedulePage({ clients, staff, jobs, checklists, servicios, registros, mensajes = [], portalTokens = [], recursos = [], patch, profile }) {
  const sinLeer = noLeidosPorJob(mensajes, profile.id);
  // Enlace del portal para que el correo al cliente lleve el botón de seguimiento.
  const tokenDe = (clienteId) => portalTokens.find((tk) => tk.cliente_id === clienteId && tk.activo)?.token || null;
  const { t, lang } = useT();
  const [view, setView] = useState("lista");
  const [period, setPeriod] = useState(() => periodPresets().semana);
  const [filtroStaff, setFiltroStaff] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [dispatch, setDispatch] = useState(null); // {form, editId}
  const [detailId, setDetailId] = useState(null); // id, o { id, tab }
  const [genModal, setGenModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  const operativos = staff.filter((s) => s.activo !== false);
  const visibles = useMemo(() => jobs
    .filter((j) => inPeriod(j, period.from, period.to))
    .filter((j) => !filtroStaff || (j.empleados || []).includes(filtroStaff))
    .filter((j) => !filtroCliente || j.clienteId === filtroCliente)
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)), [jobs, period, filtroStaff, filtroCliente]);

  async function saveJob(form) {
    if (!form.clienteId || !form.empleados.length || !form.checklistId || !form.fecha) { toast(t("sch.f.required"), "error"); return; }
    setSaving(true);
    const row = {
      clienteId: form.clienteId, servicio_id: form.servicio_id || null, ubicacionId: form.ubicacionId || null,
      empleados: form.empleados, fecha: form.fecha, hora: form.hora, checklistId: form.checklistId,
      duracion_estimada_min: form.duracion_estimada_min === "" ? null : Number(form.duracion_estimada_min),
      monto: form.monto === "" ? null : Number(form.monto), notas: form.notas || null,
      // Qué recargo justifica el monto, para que quede auditable aunque cambie la regla.
      recargo: form.recargo || null,
      recursos: form.recursos || [],
    };
    const client = clients.find((c) => c.id === form.clienteId);
    const assigned = form.empleados.map((id) => staff.find((s) => s.id === id)).filter(Boolean);
    const ubic = client?.ubicaciones?.find((u) => u.id === form.ubicacionId);
    const saved = dispatch.editId
      ? await run(() => api.updateJob(dispatch.editId, row), { ok: t("sch.updated") })
      : await run(() => api.insertJob(row), { ok: t("sch.dispatched") });
    setSaving(false);
    if (!saved) return;
    patch("jobs", saved);
    setDispatch(null);
    emailJobToStaff({ client, job: saved, assignedStaff: assigned, ubicacion: ubic, modificado: !!dispatch.editId })
      .then(({ sent, total }) => { if (total) toast(t("sch.notified", { a: sent, b: total }), sent === total ? "info" : "error"); })
      .catch((e) => toast(t("sch.notifyErr", { e: e.message }), "error"));
    if (!dispatch.editId && client?.email) emailJobAssignedToClient({ client, job: saved, assignedStaff: assigned, portalToken: tokenDe(client.id) }).catch(() => {});
  }

  async function deleteJob(job) {
    const c = clients.find((x) => x.id === job.clienteId);
    if (!(await confirm({ title: t("sch.deleteTitle", { name: c?.nombre || t("sch.thisClient") }), body: t("sch.deleteBody", { when: `${formatFecha(job.fecha, lang)} · ${job.hora}` }), danger: true, confirmLabel: t("common.delete") }))) return;
    if (await run(() => api.deleteJob(job.id), { ok: t("sch.deleted") })) { patch("jobs", job, true); setDetailId(null); }
  }

  function startEdit(job) {
    setDetailId(null);
    setDispatch({ editId: job.id, form: { clienteId: job.clienteId, servicio_id: job.servicio_id || "", ubicacionId: job.ubicacionId || "", empleados: job.empleados || [], fecha: job.fecha, hora: job.hora, checklistId: job.checklistId || "", duracion_estimada_min: job.duracion_estimada_min ?? "", monto: job.monto ?? "", recargo: job.recargo || null, recursos: job.recursos || [], notas: job.notas || "" } });
  }

  return (
    <div>
      <PageHeader title={t("sch.title")} subtitle={t("sch.subtitle")}
        action={<>
          <button className="btn-ghost" onClick={() => setGenModal(true)}><RefreshCw size={14} /> {t("sch.generate")}</button>
          <button className="btn-primary" onClick={() => setDispatch({ form: emptyForm(checklists) })}><Plus size={15} /> {t("sch.dispatch")}</button>
        </>} />

      <div className="reports-toolbar animate-fadeUp">
        <Segmented ariaLabel={t("common.view")} value={view} onChange={setView} options={[{ id: "lista", label: t("common.list"), icon: FileText }, { id: "calendario", label: t("common.calendar"), icon: CalendarDays }]} />
        {view === "lista" && <PeriodPicker value={period} onChange={setPeriod} />}
        <select className="input-base" style={{ width: 190 }} value={filtroStaff} onChange={(e) => setFiltroStaff(e.target.value)} aria-label={t("sch.filterStaff")}>
          <option value="">{t("sch.allStaff")}</option>{operativos.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select className="input-base" style={{ width: 190 }} value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} aria-label={t("sch.filterClient")}>
          <option value="">{t("sch.allClients")}</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {view === "lista" ? (
        <div style={{ display: "grid", gap: 12 }}>
          {visibles.length === 0 && <EmptyState icon={CalendarDays} title={t("sch.empty")} body={t("sch.emptyBody")} />}
          {visibles.map((job) => {
            const c = clients.find((cl) => cl.id === job.clienteId);
            const emps = (job.empleados || []).map((eid) => staff.find((s) => s.id === eid)).filter(Boolean);
            const chk = localizeChecklist(checklists.find((ch) => ch.id === job.checklistId), lang);
            const origen = servicios.find((sv) => sv.id === job.servicio_id);
            const loc = c?.ubicaciones?.find((u) => u.id === job.ubicacionId);
            const abiertos = registros.filter((r) => r.job_id === job.id && !r.fin);
            const hrs = jobHoras(job, registros);
            const est = job.duracion_estimada_min ? (job.duracion_estimada_min / 60) * Math.max(1, emps.length) : 0;
            return (
              <div key={job.id} className="card animate-fadeUp schedule-card" style={{ marginTop: 0, cursor: "pointer", borderColor: job.incidente && !job.incidente.resuelto ? C.dangerBorder : undefined }} onClick={() => setDetailId(job.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setDetailId(job.id)}>
                <div className="schedule-card-left">
                  <Avatar name={c?.nombre || "?"} size={44} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{c?.nombre || t("common.deletedClient")}</p>
                    {loc?.direccion && <p style={{ fontSize: 11, color: C.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}><MapPin size={10} /> {loc.direccion}</p>}
                    <p className="tabular" style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{formatFecha(job.fecha, lang)} · {job.hora}{job.duracion_estimada_min ? ` · ${t("sch.est")} ${minutesLabel(job.duracion_estimada_min)}` : ""}</p>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {job.recurrente_key && <Pill icon={RefreshCw}>{t("sch.recurring")}</Pill>}
                      {job.incidente && !job.incidente.resuelto && <Pill tone="danger" icon={AlertTriangle}>{t("estado.incidente")}</Pill>}
                      {job.monto ? <Pill tone="success">{money(job.monto, "ISK", lang)}</Pill> : null}
                      {job.recargo ? <Pill tone="amber">{t("job.surcharge", { motivo: t(`motivo.${job.recargo.motivo}`), pct: job.recargo.pct })}</Pill> : null}
                    </div>
                  </div>
                </div>
                <div className="schedule-card-center">
                  <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", marginBottom: 6 }}>{t("common.team")}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {emps.map((emp) => {
                      const r = registros.find((x) => x.job_id === job.id && x.personal_id === emp.id);
                      return (
                        <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 6, background: r && !r.fin ? C.amberPale : C.pale, padding: "4px 10px", borderRadius: 20, border: `1px solid ${r && !r.fin ? C.amberBorder : "transparent"}` }}>
                          <Avatar name={emp.nombre} size={18} />
                          <span style={{ fontSize: 12, color: r && !r.fin ? C.amberInk : C.primary, fontWeight: 500 }}>{emp.nombre}</span>
                          {r && !r.fin && <LiveTimer startTime={r.inicio} />}
                          {r?.fin && <span className="tabular" style={{ fontSize: 10, color: C.muted }}>{hoursLabel(registroHoras(r))}</span>}
                        </div>
                      );
                    })}
                    {emps.length === 0 && <span style={{ fontSize: 12, color: C.muted }}>{t("common.unassigned")}</span>}
                  </div>
                  {hrs > 0 && <p className="tabular" style={{ fontSize: 11, color: est && hrs > est ? C.dangerInk : C.muted, marginTop: 6 }}>{est ? t("sch.realVsEst", { r: hoursLabel(hrs), e: hoursLabel(est) }) : t("sch.real", { r: hoursLabel(hrs) })}</p>}
                </div>
                <div className="schedule-card-right" onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <StatusBadge estado={job.estado} size="sm" />
                    {job.rating ? <StarRating value={job.rating} /> : null}
                    <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                      <button className="icon-btn" aria-label={t("common.edit")} onClick={() => startEdit(job)}><Pencil size={14} /></button>
                      <button className="icon-btn" aria-label={t("common.checklist")} onClick={() => setDetailId(job.id)}><ClipboardCheck size={14} /></button>
                      <button className="icon-btn" aria-label={t("chat.title")} onClick={() => setDetailId({ id: job.id, tab: "chat" })} style={{ position: "relative" }}>
                        <MessageSquare size={14} />
                        {sinLeer[job.id] > 0 && <span className="chat-badge" style={{ position: "absolute", top: -5, right: -5, minWidth: 16, height: 16, fontSize: 9.5 }}>{sinLeer[job.id]}</span>}
                      </button>
                      <button className="icon-btn danger" aria-label={t("common.delete")} onClick={() => deleteJob(job)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: C.muted }}>{chk?.nombre || t("sch.noChecklist")}{abiertos.length ? ` · ${t("sch.onsite", { n: abiertos.length })}` : ""}</p>
                  <p style={{ fontSize: 10.5, color: C.muted2, display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                    {origen ? <><Briefcase size={10} /> {t("sch.fromService", { svc: serviceTypeLabel(origen.tipo_servicio, t) })}</> : <><Plus size={10} /> {t("sch.manual")}</>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <CalendarView jobs={jobs.filter((j) => (!filtroStaff || (j.empleados || []).includes(filtroStaff)) && (!filtroCliente || j.clienteId === filtroCliente))} clients={clients} onOpen={(j) => setDetailId(j.id)} />
      )}

      {dispatch && (
        <Modal title={dispatch.editId ? t("sch.editTitle") : t("sch.dispatch")} onClose={() => setDispatch(null)} wide gradient>
          <JobForm form={dispatch.form} setForm={(f) => setDispatch({ ...dispatch, form: f })} clients={clients} staff={operativos} checklists={checklists} servicios={servicios} recursos={recursos} jobs={jobs} editId={dispatch.editId}
            onSubmit={() => saveJob(dispatch.form)} onCancel={() => setDispatch(null)} saving={saving} isEdit={!!dispatch.editId} />
        </Modal>
      )}

      {detailId && (() => {
        const job = jobs.find((j) => j.id === (detailId.id || detailId));
        if (!job) return null;
        return <JobDetailModal job={job} clients={clients} staff={staff} checklists={checklists} registros={registros} mensajes={mensajes} patch={patch} profile={profile} confirm={confirm}
          initialTab={detailId.tab || "info"} onClose={() => setDetailId(null)} onEdit={() => startEdit(job)} onDelete={() => deleteJob(job)} />;
      })()}

      {genModal && <GenerateModal clients={clients} staff={operativos} servicios={servicios} jobs={jobs} checklists={checklists} patch={patch} onClose={() => setGenModal(false)} />}
      {confirmDialog}
    </div>
  );
}

/* ============================================================ Formulario */
function JobForm({ form, setForm, clients, staff, checklists, servicios, recursos = [], jobs = [], editId, onSubmit, onCancel, saving, isEdit }) {
  const { t, lang } = useT();
  const client = clients.find((c) => c.id === form.clienteId);
  const svc = servicios.filter((s) => s.cliente_id === form.clienteId && s.activo);
  const ubicaciones = client?.ubicaciones || [];
  const servicioSel = svc.find((s) => s.id === form.servicio_id);

  /** Recalcula el monto con el recargo que corresponda a esa fecha y hora. */
  function conMonto(next) {
    const s = svc.find((x) => x.id === next.servicio_id);
    if (!s) return { ...next, recargo: null };
    const { monto, recargo } = montoDeTrabajo(s, next.fecha, next.hora);
    return { ...next, monto: monto ?? "", recargo };
  }

  function pickServicio(id) {
    const s = svc.find((x) => x.id === id);
    if (!s) { setForm({ ...form, servicio_id: "", recargo: null }); return; }
    setForm(conMonto({
      ...form, servicio_id: id, ubicacionId: s.ubicacion_id || form.ubicacionId, hora: s.hora || form.hora,
      checklistId: s.checklist_id || client?.checklistId || form.checklistId,
      duracion_estimada_min: s.duracion_estimada_min ?? "",
    }));
  }
  const toggleRecurso = (id) => setForm({ ...form, recursos: (form.recursos || []).includes(id) ? form.recursos.filter((r) => r !== id) : [...(form.recursos || []), id] });
  // Aviso (no bloquea): el recurso ya está en otro trabajo ese mismo día.
  const ocupados = new Map();
  jobs.filter((j) => j.fecha === form.fecha && j.id !== editId && j.estado !== "no_realizado")
    .forEach((j) => (j.recursos || []).forEach((r) => ocupados.set(r, clients.find((c) => c.id === j.clienteId)?.nombre || "?")));
  // Al sumar a una persona se marcan los recursos que tiene a cargo (se pueden desmarcar).
  const toggleEmp = (id) => {
    if (form.empleados.includes(id)) { setForm({ ...form, empleados: form.empleados.filter((e) => e !== id) }); return; }
    const suyos = recursos.filter((r) => r.staff_id === id && r.activo !== false).map((r) => r.id);
    const yaPuestos = form.recursos || [];
    setForm({ ...form, empleados: [...form.empleados, id], recursos: [...yaPuestos, ...suyos.filter((x) => !yaPuestos.includes(x))] });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="form-grid-2">
        <Field label={t("sch.f.client")} required>
          <select required className="input-base" value={form.clienteId} onChange={(e) => { const c = clients.find((x) => x.id === e.target.value); setForm({ ...form, clienteId: e.target.value, servicio_id: "", ubicacionId: c?.ubicaciones?.[0]?.id || "", checklistId: c?.checklistId || form.checklistId }); }}>
            <option value="">{t("sch.f.clientSel")}</option>
            {clients.filter((c) => c.estado === "activo" || c.id === form.clienteId).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
        <Field label={t("sch.f.service")} hint={svc.length ? t("sch.f.serviceHint") : form.clienteId ? t("sch.f.serviceNone") : ""}>
          <select className="input-base" value={form.servicio_id} onChange={(e) => pickServicio(e.target.value)} disabled={!svc.length}>
            <option value="">{t("sch.f.manual")}</option>
            {svc.map((s) => <option key={s.id} value={s.id}>{serviceTypeLabel(s.tipo_servicio, t)} · {s.hora}</option>)}
          </select>
        </Field>
      </div>
      <div className="form-grid-2">
        <Field label={t("sch.f.location")} required>
          <select required className="input-base" value={form.ubicacionId} onChange={(e) => setForm({ ...form, ubicacionId: e.target.value })} disabled={!form.clienteId}>
            <option value="">{t("sch.f.locationSel")}</option>
            {ubicaciones.map((u, i) => <option key={u.id} value={u.id}>{u.direccion || t("cli.location", { n: i + 1 })}</option>)}
          </select>
        </Field>
        <Field label={t("common.checklist")} required>
          <select required className="input-base" value={form.checklistId} onChange={(e) => setForm({ ...form, checklistId: e.target.value })}>
            <option value="">{t("common.select")}</option>
            {checklists.map((c) => <option key={c.id} value={c.id}>{localizeChecklist(c, lang).nombre}</option>)}
          </select>
        </Field>
      </div>
      <div className="form-grid-2">
        <Field label={t("common.date")} required><DateField value={form.fecha} onChange={(fecha) => setForm(conMonto({ ...form, fecha }))} /></Field>
        <Field label={t("common.time")} required><input required type="time" className="input-base" value={form.hora} onChange={(e) => setForm(conMonto({ ...form, hora: e.target.value }))} /></Field>
      </div>
      <div className="form-grid-2">
        <Field label={t("sch.f.duration")} hint={t("sch.f.durationHint")}>
          <input type="number" min={0} step={15} inputMode="numeric" className="input-base" value={form.duracion_estimada_min} onChange={(e) => setForm({ ...form, duracion_estimada_min: e.target.value })} placeholder="120" />
        </Field>
        <Field label={t("sch.f.amount")} hint={form.recargo
          ? t("job.surchargeBase", { base: money(form.recargo.base, servicioSel?.moneda || "ISK", lang), motivo: t(`motivo.${form.recargo.motivo}`), pct: form.recargo.pct })
          : t("sch.f.amountHint")}>
          <input type="number" min={0} step="any" inputMode="decimal" className="input-base tabular" value={form.monto}
            onChange={(e) => setForm({ ...form, monto: e.target.value, recargo: null })} placeholder="0" />
        </Field>
      </div>
      <Field label={t("sch.f.staff")} required>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: 10, border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface2 }}>
          {staff.filter((s) => s.rol === "operativo" || form.empleados.includes(s.id)).map((s) => (
            <button type="button" key={s.id} aria-pressed={form.empleados.includes(s.id)} className={`chip ${form.empleados.includes(s.id) ? "active" : ""}`} onClick={() => toggleEmp(s.id)}>
              <Avatar name={s.nombre} size={20} bg={form.empleados.includes(s.id) ? "rgba(255,255,255,.25)" : undefined} color={form.empleados.includes(s.id) ? "inherit" : undefined} />
              {s.nombre}
            </button>
          ))}
          {staff.length === 0 && <span style={{ fontSize: 12, color: C.muted }}>{t("sch.f.noStaff")}</span>}
        </div>
      </Field>
      {recursos.length > 0 && (
        <Field label={t("res.assign")} hint={t("res.assignHint")}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: 10, border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface2 }}>
            {recursos.filter((r) => r.activo || (form.recursos || []).includes(r.id)).map((r) => {
              const on = (form.recursos || []).includes(r.id);
              const ocupado = ocupados.get(r.id);
              const duenio = r.staff_id ? staff.find((x) => x.id === r.staff_id) : null;
              return (
                <button type="button" key={r.id} aria-pressed={on} className={`chip ${on ? "active" : ""}`} onClick={() => toggleRecurso(r.id)}
                  title={ocupado ? t("res.busy", { cliente: ocupado }) : r.identificador || ""}>
                  {r.tipo === "vehiculo" ? <Truck size={13} /> : <Wrench size={13} />}
                  {r.nombre}
                  {duenio && <span style={{ color: C.muted, fontWeight: 500 }}>{t("res.ofStaff", { name: duenio.nombre.split(" ")[0] })}</span>}
                  {ocupado && !on && <span style={{ color: "var(--amber)", fontWeight: 700 }}>•</span>}
                </button>
              );
            })}
          </div>
        </Field>
      )}
      <Field label={t("sch.f.notes")}><textarea rows={2} className="input-base" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} style={{ resize: "vertical" }} /></Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 12, borderTop: `1px solid ${C.borderSubtle}` }}>
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>{t("common.cancel")}</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? t("common.saving") : isEdit ? t("sch.f.saveChanges") : t("sch.f.assign")}</button>
      </div>
    </form>
  );
}

/* ================================================================ Generar */
function GenerateModal({ clients, staff, servicios, jobs, checklists, patch, onClose }) {
  const { t, lang } = useT();
  const hoy = todayISO();
  const [range, setRange] = useState({ from: hoy, to: endOfMonth(hoy) });
  const [asignacion, setAsignacion] = useState({});
  const [busy, setBusy] = useState(false);
  const activos = servicios.filter((s) => s.activo && s.frecuencia?.tipo !== "a_demanda");
  const plan = useMemo(() => planificar(activos, jobs, range.from, range.to), [activos, jobs, range]);
  const porServicio = useMemo(() => { const m = {}; plan.forEach((p) => { (m[p.servicio.id] = m[p.servicio.id] || []).push(p); }); return m; }, [plan]);
  const sinChecklist = activos.filter((s) => !s.checklist_id && !clients.find((c) => c.id === s.cliente_id)?.checklistId && !checklists[0]);

  async function generar() {
    const rows = plan.map(({ servicio: s, fecha, key }) => {
      const client = clients.find((c) => c.id === s.cliente_id);
      const { monto, recargo } = montoDeTrabajo(s, fecha, s.hora || "08:00");
      return { clienteId: s.cliente_id, servicio_id: s.id, ubicacionId: s.ubicacion_id || client?.ubicaciones?.[0]?.id || null, empleados: asignacion[s.id] || [], fecha, hora: s.hora || "08:00", checklistId: s.checklist_id || client?.checklistId || checklists[0]?.id || null, duracion_estimada_min: s.duracion_estimada_min, monto, recargo, recurrente_key: key };
    });
    setBusy(true);
    const saved = await run(() => api.insertJobs(rows), { ok: t("sch.g.generated", { n: rows.length }) });
    setBusy(false);
    if (saved) { saved.forEach((r) => patch("jobs", r)); onClose(); }
  }

  return (
    <Modal title={t("sch.g.title")} subtitle={t("sch.g.subtitle")} onClose={onClose} wide
      footer={<>
        <button className="btn-ghost" onClick={onClose} disabled={busy}>{t("common.cancel")}</button>
        <button className="btn-primary" onClick={generar} disabled={busy || plan.length === 0}>{busy ? t("sch.g.generating") : t("sch.g.generate", { n: plan.length })}</button>
      </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <Field label={t("common.from")}><input type="date" className="input-base" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></Field>
          <Field label={t("common.to")}><input type="date" className="input-base" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></Field>
          <button className="btn-ghost btn-sm" onClick={() => setRange({ from: startOfMonth(addDays(endOfMonth(hoy), 1)), to: endOfMonth(addDays(endOfMonth(hoy), 1)) })}>{t("sch.g.nextMonth")}</button>
        </div>
        {activos.length === 0 && <Banner tone="warn">{t("sch.g.noServices")}</Banner>}
        {sinChecklist.length > 0 && <Banner tone="warn">{t("sch.g.noChecklist")}</Banner>}
        {plan.length === 0 && activos.length > 0 && <p style={{ fontSize: 12.5, color: C.muted }}>{t("sch.g.nothing")}</p>}
        {activos.map((s) => {
          const client = clients.find((c) => c.id === s.cliente_id); const items = porServicio[s.id] || [];
          if (!items.length) return null;
          const sel = asignacion[s.id] || [];
          return (
            <div key={s.id} style={{ padding: 12, borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div><p style={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>{client?.nombre} · {serviceTypeLabel(s.tipo_servicio, t)}</p><p style={{ fontSize: 11.5, color: C.muted }}>{t("sch.g.dates", { n: items.length, list: items.slice(0, 6).map((p) => formatFecha(p.fecha, lang).slice(0, 5)).join(", ") + (items.length > 6 ? "…" : "") })}</p></div>
                <Pill>{s.hora} · {minutesLabel(s.duracion_estimada_min)} × {s.personas_previstas}</Pill>
              </div>
              <p style={{ fontSize: 11, color: C.muted, margin: "8px 0 6px" }}>{t("sch.g.assignTo")}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {staff.filter((x) => x.rol === "operativo").map((x) => (
                  <button key={x.id} type="button" className={`chip ${sel.includes(x.id) ? "active" : ""}`} style={{ minHeight: 32, padding: "4px 10px", fontSize: 12 }}
                    onClick={() => setAsignacion({ ...asignacion, [s.id]: sel.includes(x.id) ? sel.filter((i) => i !== x.id) : [...sel, x.id] })}>{x.nombre}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

/* ============================================================== Calendario */
function CalendarView({ jobs, clients, onOpen }) {
  const { t, lang } = useT();
  const [cursor, setCursor] = useState(() => startOfMonth(todayISO()));
  const [dayModal, setDayModal] = useState(null);
  const hoy = todayISO();
  const porDia = useMemo(() => { const m = {}; jobs.forEach((j) => { (m[j.fecha] = m[j.fecha] || []).push(j); }); return m; }, [jobs]);
  const celdas = useMemo(() => {
    const first = fromISO(cursor); const start = new Date(first); start.setDate(start.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return toISO(d); });
  }, [cursor]);
  const DOT = { programado: "var(--neutral-ink)", en_curso: "var(--amber)", finalizado: "var(--success)", no_realizado: "var(--danger)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button className="icon-btn" aria-label={t("common.prevMonth")} onClick={() => setCursor((c) => startOfMonth(addDays(c, -1)))} style={{ border: `1px solid ${C.border}` }}><ChevronRight size={15} style={{ transform: "rotate(180deg)" }} /></button>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.ink, textTransform: "capitalize", minWidth: 170, textAlign: "center" }}>{formatMes(cursor, lang)}</h3>
          <button className="icon-btn" aria-label={t("common.nextMonth")} onClick={() => setCursor((c) => addDays(endOfMonth(c), 1))} style={{ border: `1px solid ${C.border}` }}><ChevronRight size={15} /></button>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, fontSize: 11, color: C.muted, flexWrap: "wrap" }}>{Object.entries(DOT).map(([k, v]) => <span key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: v }} />{t(`estado.${k}`)}</span>)}</div>
          <button onClick={() => setCursor(startOfMonth(hoy))} className="btn-ghost btn-sm">{t("common.today")}</button>
        </div>
      </div>
      <div className="calendar-scroll-wrapper">
        <div className="calendar-scroll-inner" style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", background: C.surface }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: `1px solid ${C.border}` }}>
            {DIAS_KEYS.map((d, i) => <div key={d} style={{ padding: "9px 0", textAlign: "center", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", background: C.surface2 }}>{weekdayShort(i, lang)}</div>)}
          </div>
          {Array.from({ length: 6 }, (_, w) => (
            <div key={w} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
              {celdas.slice(w * 7, w * 7 + 7).map((iso) => {
                const enMes = iso.slice(0, 7) === cursor.slice(0, 7); const esHoy = iso === hoy;
                const jd = (porDia[iso] || []).slice().sort((a, b) => a.hora.localeCompare(b.hora)); const vis = jd.slice(0, 3);
                return (
                  <div key={iso} onClick={() => jd.length && setDayModal(iso)} role={jd.length ? "button" : undefined} tabIndex={jd.length ? 0 : -1}
                    style={{ minHeight: 92, padding: "6px 6px 8px", borderRight: `1px solid ${C.borderSubtle}`, borderBottom: `1px solid ${C.borderSubtle}`, background: enMes ? C.surface : C.surface2, cursor: jd.length ? "pointer" : "default" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
                      <span style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", fontSize: 11.5, fontWeight: esHoy ? 700 : 500, color: esHoy ? C.onPrimary : enMes ? C.ink : C.muted2, background: esHoy ? C.primary : "transparent" }}>{Number(iso.slice(8))}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {vis.map((job) => {
                        const c = clients.find((cl) => cl.id === job.clienteId);
                        return (
                          <div key={job.id} onClick={(e) => { e.stopPropagation(); onOpen(job); }} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, padding: "2px 5px", borderRadius: 5, background: C.pale, color: C.primary, fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", cursor: "pointer" }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: DOT[job.estado] }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{job.hora} {c?.nombre || t("common.client")}</span>
                          </div>
                        );
                      })}
                      {jd.length > 3 && <span style={{ fontSize: 10, color: C.muted, paddingLeft: 5, fontWeight: 600 }}>{t("common.more", { n: jd.length - 3 })}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {dayModal && (
        <Modal title={formatFechaLarga(dayModal, lang)} onClose={() => setDayModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(porDia[dayModal] || []).slice().sort((a, b) => a.hora.localeCompare(b.hora)).map((job) => {
              const c = clients.find((cl) => cl.id === job.clienteId);
              return (
                <button key={job.id} onClick={() => { setDayModal(null); onOpen(job); }} style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.borderSubtle}`, background: C.surface2, cursor: "pointer", minHeight: 44, font: "inherit", width: "100%" }}>
                  <span className="tabular" style={{ fontSize: 12, color: C.muted, width: 42, flexShrink: 0 }}>{job.hora}</span>
                  <Avatar name={c?.nombre || "?"} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{c?.nombre || t("common.deletedClient")}</p></div>
                  <StatusBadge estado={job.estado} size="sm" />
                </button>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}
