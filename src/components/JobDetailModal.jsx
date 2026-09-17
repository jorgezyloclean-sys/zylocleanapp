// Detalle de un trabajo para administración: checklist, horas por persona,
// incidente (con resolución), finalizar / no realizado / reabrir.
import { useState } from "react";
import { Pencil, Trash2, ClipboardCheck, CheckCheck, Clock, XCircle, Users, AlertTriangle, RotateCcw, MessageSquare, Info } from "lucide-react";
import { Avatar, C, Field, Modal, ProgressBar, StarRating, StatusBadge, LiveTimer, Banner, SignedImg, PhotoLink, Segmented } from "./ui.jsx";
import JobChat from "./JobChat.jsx";
import { noLeidos } from "../lib/chat";
import { useT } from "../i18n/index.jsx";
import { formatFecha, formatHoraTs } from "../lib/dates";
import { hoursLabel, minutesLabel } from "../lib/format";
import { checklistPct, jobHoras, registroHoras } from "../lib/stats";
import { run, toast } from "../lib/toast";
import * as api from "../data/api";
import { localizeChecklist } from "../lib/checklist";

export default function JobDetailModal({ job, clients, staff, checklists, registros, mensajes = [], patch, profile, onClose, onEdit, onDelete, confirm, initialTab = "info" }) {
  const { t, lang } = useT();
  const [tab, setTab] = useState(initialTab);
  const sinLeer = noLeidos(mensajes, profile.id, job.id).length;
  const nMsgs = mensajes.filter((m) => m.job_id === job.id).length;
  const c = clients.find((cl) => cl.id === job.clienteId);
  const chk = localizeChecklist(checklists.find((ch) => ch.id === job.checklistId), lang);
  const progress = checklistPct(job, chk);
  const regs = registros.filter((r) => r.job_id === job.id);
  const [noRealizado, setNoRealizado] = useState(null);
  const [resolving, setResolving] = useState(null);
  const [busy, setBusy] = useState(false);

  async function toggle(idx, done) {
    const tareasCompletadas = { ...(job.tareasCompletadas || {}), [idx]: !done };
    const saved = await run(() => api.updateJob(job.id, { tareasCompletadas }));
    if (saved) patch("jobs", saved);
  }
  async function finalizar() {
    const pend = (chk?.tareas || []).map((_, i) => i).filter((i) => !job.tareasCompletadas?.[i] && !job.tareas_no_hechas?.[i]);
    if (pend.length && !(await confirm({ title: t("sch.d.unchecked"), body: t("sch.d.uncheckedBody", { n: pend.length }), confirmLabel: t("sch.d.finish") }))) return;
    setBusy(true);
    const saved = await run(() => api.updateJob(job.id, { estado: "finalizado", fin_real: job.fin_real || new Date().toISOString() }), { ok: t("sch.d.finished") });
    setBusy(false);
    if (saved) patch("jobs", saved);
  }
  async function marcarNoRealizado() {
    if (!noRealizado?.trim()) { toast(t("sch.d.reasonRequired"), "error"); return; }
    setBusy(true);
    const saved = await run(() => api.updateJob(job.id, { estado: "no_realizado", motivo_no_realizado: noRealizado.trim() }), { ok: t("sch.d.markedNotDone") });
    setBusy(false);
    if (saved) { patch("jobs", saved); setNoRealizado(null); }
  }
  async function reabrir() {
    const saved = await run(() => api.updateJob(job.id, { estado: "programado", motivo_no_realizado: null }), { ok: t("sch.d.reopened") });
    if (saved) patch("jobs", saved);
  }
  async function resolver() {
    setBusy(true);
    const incidente = { ...job.incidente, resuelto: true, resuelto_en: new Date().toISOString(), resuelto_por: profile?.nombre || null, nota_resolucion: (resolving || "").trim() || null };
    const saved = await run(() => api.updateJob(job.id, { incidente }), { ok: t("dash.incidentResolved") });
    setBusy(false);
    if (saved) { patch("jobs", saved); setResolving(null); }
  }
  async function reabrirIncidente() {
    const incidente = { ...job.incidente, resuelto: false, resuelto_en: null, resuelto_por: null, nota_resolucion: null };
    const saved = await run(() => api.updateJob(job.id, { incidente }), { ok: t("dash.incidentReopened") });
    if (saved) patch("jobs", saved);
  }

  return (
    <Modal title={`${c?.nombre || t("common.client")} — ${formatFecha(job.fecha, lang)} ${job.hora}`} subtitle={chk?.nombre} onClose={onClose} gradient
      footer={<>
        {onDelete && <button className="btn-ghost" style={{ color: C.danger, marginRight: "auto" }} onClick={onDelete}><Trash2 size={14} /> {t("common.delete")}</button>}
        {onEdit && <button className="btn-ghost" onClick={onEdit}><Pencil size={14} /> {t("common.edit")}</button>}
        {job.estado === "no_realizado" ? <button className="btn-ghost" onClick={reabrir}>{t("common.reopen")}</button>
          : job.estado !== "finalizado" && <>
            <button className="btn-ghost" style={{ color: C.danger }} onClick={() => setNoRealizado("")}><XCircle size={14} /> {t("estado.no_realizado")}</button>
            <button className="btn-primary" onClick={finalizar} disabled={busy}><CheckCheck size={14} /> {t("sch.d.finish")}</button>
          </>}
      </>}>
      <div style={{ marginBottom: 14 }}>
        <Segmented value={tab} onChange={setTab} ariaLabel={t("chat.title")} options={[
          { id: "info", label: t("chat.tabInfo"), icon: Info },
          { id: "chat", label: <>{nMsgs ? t("chat.titleN", { n: nMsgs }) : t("chat.title")}{sinLeer > 0 && <span className="chat-badge" style={{ marginLeft: 6 }}>{sinLeer}</span>}</>, icon: MessageSquare },
        ]} />
      </div>
      {tab === "chat" && <JobChat job={job} mensajes={mensajes} staff={staff} profile={profile} patch={patch} />}
      <div style={{ display: tab === "info" ? "flex" : "none", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <StatusBadge estado={job.estado} />
          <span className="tabular" style={{ fontSize: 12, color: C.primary, fontWeight: 700 }}>{t("sch.d.pct", { p: progress })}</span>
        </div>
        <ProgressBar value={progress} />

        {job.estado === "no_realizado" && <Banner tone="danger" icon={XCircle}><strong>{t("sch.d.notDone")}</strong> {job.motivo_no_realizado}</Banner>}

        {job.incidente && (
          <Banner tone={job.incidente.resuelto ? "info" : "danger"} icon={AlertTriangle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <strong>{job.incidente.resuelto ? t("sch.d.incidentResolved") : t("sch.d.incident")}:</strong> {job.incidente.texto}
                {job.incidente.fotos?.length > 0 && <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>{job.incidente.fotos.map((p, i) => <PhotoLink key={i} bucket="job-photos" path={p}><SignedImg bucket="job-photos" path={p} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }} /></PhotoLink>)}</div>}
                {job.incidente.resuelto && (
                  <p style={{ marginTop: 6, fontSize: 12 }}>
                    {t("dash.resolvedBy", { who: job.incidente.resuelto_por || "—", when: job.incidente.resuelto_en ? `${formatFecha(job.incidente.resuelto_en.slice(0, 10), lang)} ${formatHoraTs(job.incidente.resuelto_en, lang)}` : "—" })}
                    {job.incidente.nota_resolucion && <><br /><em>{job.incidente.nota_resolucion}</em></>}
                  </p>
                )}
              </div>
              {job.incidente.resuelto
                ? <button className="btn-ghost btn-sm" onClick={reabrirIncidente}><RotateCcw size={12} /> {t("common.reopen")}</button>
                : resolving === null && <button className="btn-primary btn-sm" onClick={() => setResolving("")}><CheckCheck size={12} /> {t("common.resolve")}</button>}
            </div>
            {resolving !== null && !job.incidente.resuelto && (
              <div style={{ marginTop: 10 }}>
                <Field label={t("dash.resolveNote")}>
                  <textarea rows={2} className="input-base" value={resolving} onChange={(e) => setResolving(e.target.value)} placeholder={t("dash.resolveNotePh")} autoFocus />
                </Field>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                  <button className="btn-ghost btn-sm" onClick={() => setResolving(null)}>{t("common.cancel")}</button>
                  <button className="btn-primary btn-sm" onClick={resolver} disabled={busy}><CheckCheck size={12} /> {t("common.resolve")}</button>
                </div>
              </div>
            )}
          </Banner>
        )}

        <div>
          <h4 className="section-title"><Users size={14} /> {t("sch.d.hoursPerPerson")}</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(job.empleados || []).map((eid) => {
              const s = staff.find((x) => x.id === eid); const r = regs.find((x) => x.personal_id === eid);
              return (
                <div key={eid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: C.surface2, fontSize: 12, flexWrap: "wrap" }}>
                  <Avatar name={s?.nombre || "?"} size={22} /><span style={{ flex: 1, color: C.ink, fontWeight: 600 }}>{s?.nombre || "—"}</span>
                  {!r && <span style={{ color: C.muted }}>{t("sch.d.notStarted")}</span>}
                  {r && !r.fin && <span style={{ color: C.amberInk, display: "flex", gap: 4, alignItems: "center" }}><Clock size={12} /> {t("common.since")} {formatHoraTs(r.inicio, lang)} · <LiveTimer startTime={r.inicio} /></span>}
                  {r?.fin && <span className="tabular" style={{ color: C.muted }}>{formatHoraTs(r.inicio, lang)}–{formatHoraTs(r.fin, lang)} · <strong style={{ color: C.ink }}>{hoursLabel(registroHoras(r))}</strong></span>}
                </div>
              );
            })}
            {(job.empleados || []).length === 0 && <span style={{ fontSize: 12, color: C.muted }}>{t("common.unassigned")}</span>}
          </div>
          {job.duracion_estimada_min && <p className="tabular" style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>{t("sch.d.estPerPerson", { e: minutesLabel(job.duracion_estimada_min), r: hoursLabel(jobHoras(job, registros)) })}</p>}
        </div>

        {job.rating ? <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 10, background: C.pale }}><span style={{ fontSize: 12, fontWeight: 600, color: C.primary }}>{t("sch.d.clientRating")}</span><StarRating value={job.rating} /></div> : null}
        {job.comentario && <p style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>"{job.comentario}"</p>}
        {job.notas && <p style={{ fontSize: 12, color: C.ink }}><strong>{t("common.notes")}:</strong> {job.notas}</p>}

        {job.fotos?.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {job.fotos.map((p, i) => <PhotoLink key={i} bucket="job-photos" path={p}><SignedImg bucket="job-photos" path={p} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", border: `1px solid ${C.border}` }} /></PhotoLink>)}
          </div>
        )}

        <div>
          <h4 className="section-title"><ClipboardCheck size={14} /> {chk?.nombre || t("common.checklist")}</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(chk?.tareas || []).map((task, i) => {
              const done = !!job.tareasCompletadas?.[i]; const motivo = job.tareas_no_hechas?.[i];
              return (
                <button key={i} className={`checklist-item ${done ? "checked" : ""}`} onClick={() => toggle(i, done)} disabled={job.estado === "no_realizado"}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: done ? C.primary : motivo ? C.dangerPale : C.surface, border: `2px solid ${done ? C.primary : motivo ? C.dangerBorder : C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {done && <CheckCheck size={13} color="var(--on-primary)" />}{!done && motivo && <XCircle size={13} color="var(--danger)" />}
                  </div>
                  <span style={{ fontSize: 13, color: done ? C.muted : C.ink, flex: 1, textAlign: "left" }}>{task}{!done && motivo && <em style={{ display: "block", fontSize: 11, color: C.dangerInk, fontStyle: "normal" }}>{t("sch.d.notDoneTask", { m: motivo })}</em>}</span>
                </button>
              );
            })}
            {!chk && <p style={{ fontSize: 12, color: C.muted }}>{t("sch.d.checklistGone")}</p>}
          </div>
        </div>

        {noRealizado !== null && (
          <div style={{ padding: 12, borderRadius: 12, background: C.dangerPale, border: `1px solid ${C.dangerBorder}` }}>
            <Field label={t("sch.d.reason")} required>
              <textarea rows={2} className="input-base" value={noRealizado} onChange={(e) => setNoRealizado(e.target.value)} placeholder={t("sch.d.reasonPh")} autoFocus />
            </Field>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn-ghost btn-sm" onClick={() => setNoRealizado(null)}>{t("common.cancel")}</button>
              <button className="btn-danger btn-sm" onClick={marcarNoRealizado} disabled={busy}>{t("sch.d.confirmNotDone")}</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
