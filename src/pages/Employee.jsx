// Vista del personal operativo. Mobile-first: pocos toques, botones grandes.
// Solo ve sus trabajos (RLS). Registra SU inicio/fin (registro_horas) — spec §3.5.
import { useMemo, useState } from "react";
import {
  LogOut, Clock, History, MapPin, ChevronRight, KeyRound, Wifi, Phone, Package, Eye, StickyNote, Camera, AlertTriangle, CheckCheck, X, XCircle, CheckCircle2, Sparkles, Users,
} from "lucide-react";
import { Avatar, C, Field, LangSwitch, ThemeSwitch, Modal, ProgressBar, StatusBadge, LiveTimer, StarRating, SignedImg, PhotoLink, Pill, FONT_DISPLAY, FONT_MONO } from "../components/ui.jsx";
import { tipoFotoLabel } from "../components/PhotosField.jsx";
import { useT } from "../i18n/index.jsx";
import { addDays, formatFecha, todayISO } from "../lib/dates";
import { hoursLabel, minutesLabel } from "../lib/format";
import { avgChecklistPct, avgRating, checklistPct, jobHoras, registroHoras } from "../lib/stats";
import { photoPath, uploadPhoto, removePhoto } from "../lib/storage";
import { run, toast } from "../lib/toast";
import * as api from "../data/api";
import { emailJobCompleted } from "../email/templates";

export default function EmployeeView({ profile, onLogout, onLangChange, clients, jobs, checklists, registros, patch }) {
  const { t, lang } = useT();
  const me = profile.id;
  const hoy = todayISO();
  const mis = useMemo(() => jobs.filter((j) => (j.empleados || []).includes(me)), [jobs, me]);
  const pendientes = useMemo(() => mis.filter((j) => j.estado === "programado" || j.estado === "en_curso").sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)), [mis]);
  const historial = useMemo(() => mis.filter((j) => j.estado === "finalizado" || j.estado === "no_realizado").sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora)), [mis]);
  const [tab, setTab] = useState("hoy");
  const [modal, setModal] = useState(null); // {type: 'incidente'|'no_realizado'|'finish', job}
  const stats = { cumplimiento: avgChecklistPct(mis, checklists), rating: avgRating(mis), completados: historial.filter((j) => j.estado === "finalizado").length };
  const pendHoy = pendientes.filter((j) => j.fecha <= hoy).length;

  const dayLabel = (iso) => iso === hoy ? t("common.today") : iso === addDays(hoy, 1) ? t("common.tomorrow") : formatFecha(iso, lang);

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, paddingBottom: "env(safe-area-inset-bottom)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", paddingTop: "calc(14px + env(safe-area-inset-top))", background: "var(--hero-bg, linear-gradient(135deg, var(--primary), var(--primary-mid)))", color: "var(--hero-fg, #fff)", gap: 10, borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Sparkles size={18} /></div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t("emp.hello", { name: profile.nombre.split(" ")[0] })}</p>
            <p style={{ fontSize: 11, opacity: .8 }}>{t("emp.pendingToday", { n: pendHoy })}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <LangSwitch compact onChangeExtra={onLangChange} />
          <ThemeSwitch />
          <button onClick={onLogout} aria-label={t("common.logout")} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, background: "rgba(255,255,255,.15)", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer" }}><LogOut size={15} /></button>
        </div>
      </header>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 16px 0" }}>
        <div className="animate-fadeUp" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, background: C.surface, borderRadius: 16, padding: 14, border: `1px solid ${C.border}`, boxShadow: "var(--shadow-sm)" }}>
          {[[stats.cumplimiento === null ? "—" : `${stats.cumplimiento}%`, t("emp.compliance")], [stats.rating ?? "—", t("emp.rating")], [stats.completados, t("emp.completed")]].map(([v, l], i) => (
            <div key={l} style={{ textAlign: "center", borderLeft: i ? `1px solid ${C.borderSubtle}` : "none" }}>
              <p className="tabular" style={{ fontFamily: FONT_MONO, fontSize: 18, fontWeight: 600, color: C.primary }}>{v}</p>
              <p style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{l}</p>
            </div>
          ))}
        </div>
        <div className="seg" style={{ display: "flex", marginTop: 12, width: "100%" }} role="tablist">
          {[{ id: "hoy", label: `${t("emp.tab.today")} (${pendientes.length})`, icon: Clock }, { id: "historial", label: `${t("emp.tab.history")} (${historial.length})`, icon: History }].map((x) => {
            const Icon = x.icon;
            return <button key={x.id} role="tab" aria-selected={tab === x.id} className={tab === x.id ? "active" : ""} onClick={() => setTab(x.id)} style={{ flex: 1 }}><Icon size={13} /> {x.label}</button>;
          })}
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        {tab === "hoy" && pendientes.map((job, i) => (
          <JobCard key={job.id} job={job} me={me} client={clients.find((c) => c.id === job.clienteId)} checklist={checklists.find((c) => c.id === job.checklistId)}
            registros={registros} patch={patch} dayLabel={dayLabel(job.fecha)} delay={i * 60} onModal={(type) => setModal({ type, job })} />
        ))}
        {tab === "hoy" && pendientes.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: C.muted }}><CheckCircle2 size={36} color="var(--primary-bright)" style={{ margin: "0 auto 12px" }} /><p style={{ fontWeight: 600, color: C.ink }}>{t("emp.noPending")}</p></div>
        )}
        {tab === "historial" && historial.map((job, i) => {
          const cliente = clients.find((c) => c.id === job.clienteId);
          const r = registros.find((x) => x.job_id === job.id && x.personal_id === me);
          return (
            <div key={job.id} className="card animate-fadeUp" style={{ animationDelay: `${i * 40}ms`, padding: 14, marginTop: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Avatar name={cliente?.nombre || "?"} size={36} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{cliente?.nombre || t("common.deletedClient")}</p>
                    <p className="tabular" style={{ fontSize: 11, color: C.muted }}>{formatFecha(job.fecha, lang)} · {job.hora}{r?.fin ? ` · ${hoursLabel(registroHoras(r))}` : ""}</p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <StatusBadge estado={job.estado} size="sm" />
                  {job.estado === "finalizado" && <StarRating value={job.rating ?? null} />}
                </div>
              </div>
              {job.motivo_no_realizado && <p style={{ fontSize: 12, color: C.dangerInk, marginTop: 8 }}>{job.motivo_no_realizado}</p>}
              {job.comentario && <p style={{ fontSize: 12, color: C.muted, fontStyle: "italic", marginTop: 8 }}>"{job.comentario}"</p>}
            </div>
          );
        })}
        {tab === "historial" && historial.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: C.muted }}><History size={36} color="var(--primary-bright)" style={{ margin: "0 auto 12px" }} /><p style={{ fontWeight: 600, color: C.ink }}>{t("emp.noHistory")}</p></div>
        )}
      </div>

      {modal?.type === "incidente" && <IncidentModal job={modal.job} client={clients.find((c) => c.id === modal.job.clienteId)} patch={patch} onClose={() => setModal(null)} />}
      {modal?.type === "no_realizado" && <NotDoneModal job={modal.job} me={me} registros={registros} patch={patch} onClose={() => setModal(null)} />}
      {modal?.type === "finish" && <FinishModal job={jobs.find((j) => j.id === modal.job.id) || modal.job} me={me} checklist={checklists.find((c) => c.id === modal.job.checklistId)} client={clients.find((c) => c.id === modal.job.clienteId)} registros={registros} patch={patch} onClose={() => setModal(null)} />}
    </div>
  );
}

/* ================================================================ Tarjeta */
function JobCard({ job, me, client, checklist, registros, patch, dayLabel, delay, onModal }) {
  const { t } = useT();
  const [showInfo, setShowInfo] = useState(false);
  const [busy, setBusy] = useState(false);
  const mine = registros.find((r) => r.job_id === job.id && r.personal_id === me);
  const started = !!mine;
  const progress = checklistPct(job, checklist);
  const total = checklist?.tareas?.length || 0;
  const done = Object.values(job.tareasCompletadas || {}).filter(Boolean).length;
  const loc = client?.ubicaciones?.find((u) => u.id === job.ubicacionId) || client?.ubicaciones?.[0];
  const otros = (job.empleados || []).filter((e) => e !== me).length;

  async function start() {
    setBusy(true);
    const r = await run(() => api.startRegistro(job.id, me), { ok: t("emp.started") });
    if (r) {
      patch("registro_horas", r);
      const p = { estado: "en_curso", ...(job.inicio_real ? {} : { inicio_real: r.inicio }) };
      const saved = await run(() => api.updateJob(job.id, p));
      if (saved) patch("jobs", saved);
    }
    setBusy(false);
  }
  async function toggle(idx, isDone) {
    const tareasCompletadas = { ...(job.tareasCompletadas || {}), [idx]: !isDone };
    const tareas_no_hechas = { ...(job.tareas_no_hechas || {}) }; delete tareas_no_hechas[idx];
    patch("jobs", { id: job.id, tareasCompletadas, tareas_no_hechas });
    const saved = await run(() => api.updateJob(job.id, { tareasCompletadas, tareas_no_hechas }));
    if (saved) patch("jobs", saved); else patch("jobs", job);
  }
  async function checkAll() {
    const tareasCompletadas = {}; for (let i = 0; i < total; i++) tareasCompletadas[i] = true;
    const saved = await run(() => api.updateJob(job.id, { tareasCompletadas, tareas_no_hechas: {} }));
    if (saved) patch("jobs", saved);
  }
  async function addPhoto(file) {
    if (!file) return;
    setBusy(true);
    try {
      const path = await uploadPhoto("job-photos", photoPath(job.id, file), file);
      const fotos = [...(job.fotos || []), path];
      const saved = await api.updateJob(job.id, { fotos });
      patch("jobs", saved); toast(t("emp.photoAdded"));
    } catch (e) { toast(`${t("emp.photoError")} ${e.message}`, "error"); }
    setBusy(false);
  }
  async function removeFoto(path) {
    const fotos = (job.fotos || []).filter((p) => p !== path);
    const saved = await run(() => api.updateJob(job.id, { fotos }), { ok: t("emp.photoRemoved") });
    if (saved) { patch("jobs", saved); try { await removePhoto("job-photos", path); } catch { /* ya no está */ } }
  }

  const infoItems = [
    { icon: KeyRound, label: t("emp.access"), value: loc?.acceso || client?.acceso },
    { icon: Phone, label: t("emp.contact"), value: loc?.contacto || client?.contactoHabitual },
    { icon: Phone, label: t("emp.emergency"), value: client?.contactoEmergencia },
    { icon: Wifi, label: t("emp.wifi"), value: client?.wifi },
    { icon: Package, label: t("emp.products"), value: client?.productos },
    { icon: Eye, label: t("emp.discretion"), value: client?.discrecion },
  ].filter((x) => x.value);

  return (
    <div className="animate-fadeUp" style={{ animationDelay: `${delay}ms` }}>
      <div style={{ borderRadius: 18, background: C.surface, overflow: "hidden", border: `1px solid ${job.incidente && !job.incidente.resuelto ? C.dangerBorder : C.border}`, boxShadow: "var(--shadow-sm)" }}>
        <div style={{ padding: "16px 18px", background: started ? C.amberPale : C.surface2, borderBottom: `1px solid ${C.borderSubtle}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <Avatar name={client?.nombre || "?"} size={38} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{client?.nombre || t("common.deletedClient")}</p>
                {loc?.direccion && <p style={{ fontSize: 11.5, color: C.muted, marginTop: 1, display: "flex", alignItems: "center", gap: 4 }}><MapPin size={11} /> {loc.direccion}</p>}
                <p className="tabular" style={{ fontSize: 12, color: C.ink, marginTop: 3, fontWeight: 600 }}>{dayLabel} · {job.hora}{job.duracion_estimada_min ? <span style={{ color: C.muted, fontWeight: 400 }}> · {t("emp.estimated")} {minutesLabel(job.duracion_estimada_min)}</span> : null}</p>
              </div>
            </div>
            <StatusBadge estado={job.estado} size="sm" />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
            {otros > 0 && <Pill tone="neutral" icon={Users}>{t("emp.team")}: +{otros}</Pill>}
            {job.incidente && !job.incidente.resuelto && <Pill tone="danger" icon={AlertTriangle}>{t("emp.incidentReported")}</Pill>}
            {started && <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.amberInk, fontWeight: 700, marginLeft: "auto" }}><Clock size={13} /> {t("emp.yourTime")}: <LiveTimer startTime={mine.inicio} /></span>}
          </div>
          {started && total > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>{t("emp.progress")}</span>
                <span className="tabular" style={{ fontSize: 11, color: C.primary, fontWeight: 700 }}>{done}/{total} · {progress}%</span>
              </div>
              <ProgressBar value={progress} />
            </div>
          )}
        </div>

        {client && (
          <div style={{ padding: "12px 18px 0" }}>
            <button onClick={() => setShowInfo(!showInfo)} aria-expanded={showInfo} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", minHeight: 44, padding: "10px 12px", borderRadius: 10, background: showInfo ? C.pale : C.surface2, border: `1px solid ${showInfo ? C.bright : C.border}`, cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 600, color: C.primary }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><MapPin size={15} /> {t("emp.placeInfo")}</span>
              <ChevronRight size={16} style={{ transform: showInfo ? "rotate(90deg)" : "", transition: "transform .2s" }} />
            </button>
            {showInfo && (
              <div className="animate-fadeIn" style={{ marginTop: 10, padding: 12, borderRadius: 12, background: C.surface2, border: `1px solid ${C.border}` }}>
                {loc && (
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: C.muted, marginBottom: 6 }}>{t("emp.location")}</p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8, background: C.surface, border: `1px solid ${C.borderSubtle}`, gap: 8 }}>
                      <span style={{ fontSize: 12.5, color: C.ink, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}><MapPin size={14} color="var(--primary)" /><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{loc.direccion}</span></span>
                      {loc.mapsLink && <a href={loc.mapsLink} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm" style={{ flexShrink: 0 }}>{t("common.open")}</a>}
                    </div>
                  </div>
                )}
                {(loc?.notas || client.notas) && (
                  <div style={{ display: "flex", gap: 8, padding: "8px 10px", borderRadius: 8, background: C.amberPale, border: `1px solid ${C.amberBorder}`, marginBottom: 8 }}>
                    <StickyNote size={14} color="var(--amber-ink)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div><p style={{ fontSize: 10, fontWeight: 600, color: C.amberInk }}>{t("emp.notes")}</p><p style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.45 }}>{loc?.notas || client.notas}</p></div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {infoItems.map((item, idx) => { const Icon = item.icon; return (
                    <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", borderRadius: 8, background: C.surface, border: `1px solid ${C.borderSubtle}` }}>
                      <Icon size={14} color="var(--primary)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}><p style={{ fontSize: 10, fontWeight: 600, color: C.muted }}>{item.label}</p><p style={{ fontSize: 12.5, color: C.ink, wordBreak: "break-word" }}>{item.value}</p></div>
                    </div>); })}
                </div>
                {client.fotosReferencia?.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: C.muted, marginBottom: 6 }}>{t("emp.refPhotos")}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 8 }}>
                      {client.fotosReferencia.map((f, idx) => (
                        <PhotoLink key={idx} bucket="client-photos" path={f.path || f.url}>
                          <SignedImg bucket="client-photos" path={f.path || f.url} alt={tipoFotoLabel(f.tipo, t)} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}` }} />
                          <span style={{ fontSize: 9, display: "block", color: C.muted, marginTop: 2, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tipoFotoLabel(f.tipo, t)}</span>
                        </PhotoLink>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {job.notas && <p style={{ margin: "10px 18px 0", fontSize: 12.5, color: C.ink, padding: "8px 10px", borderRadius: 8, background: C.pale }}>{job.notas}</p>}

        {!started && (
          <button onClick={start} disabled={busy} style={{ width: "calc(100% - 36px)", margin: "12px 18px 0", minHeight: 52, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, border: "none", background: `linear-gradient(135deg, var(--primary), var(--primary-bright))`, color: "var(--on-primary)", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
            <Clock size={18} /> {t("emp.start")}
          </button>
        )}

        {started && (
          <div style={{ padding: "14px 18px 4px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase" }}>{t("emp.checklist")}: {checklist?.nombre || "—"}</span>
              {total > 0 && done < total && <button onClick={checkAll} className="btn-ghost btn-sm">{t("emp.checkAll")}</button>}
            </div>
            {(checklist?.tareas || []).map((task, i) => {
              const isDone = !!job.tareasCompletadas?.[i]; const motivo = job.tareas_no_hechas?.[i];
              return (
                <button key={i} className={`checklist-item ${isDone ? "checked" : ""}`} onClick={() => toggle(i, isDone)} style={{ minHeight: 48 }} aria-pressed={isDone}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, background: isDone ? C.primary : motivo ? C.dangerPale : C.surface, border: `2px solid ${isDone ? C.primary : motivo ? C.dangerBorder : C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isDone && <CheckCheck size={14} color="var(--on-primary)" className="animate-checkBounce" />}{!isDone && motivo && <XCircle size={14} color="var(--danger)" />}
                  </div>
                  <span style={{ fontSize: 14, color: isDone ? C.muted : C.ink, flex: 1, lineHeight: 1.35 }}>{task}{!isDone && motivo && <em style={{ display: "block", fontSize: 11, color: C.dangerInk, fontStyle: "normal" }}>{motivo}</em>}</span>
                </button>
              );
            })}
          </div>
        )}

        {job.fotos?.length > 0 && (
          <div style={{ padding: "8px 18px 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {job.fotos.map((p) => (
              <div key={p} style={{ position: "relative" }}>
                <SignedImg bucket="job-photos" path={p} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", border: `1px solid ${C.border}` }} />
                <button onClick={() => removeFoto(p)} aria-label={t("common.delete")} style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: "var(--danger)", border: `2px solid ${C.surface}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}><X size={11} color="#fff" strokeWidth={3} /></button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: `1px solid ${C.borderSubtle}`, marginTop: 10, flexWrap: "wrap" }}>
          <label className="btn-ghost" style={{ flex: "1 1 30%", justifyContent: "center", cursor: busy ? "wait" : "pointer" }}>
            <Camera size={15} /> {t("common.photo")}{job.fotos?.length ? ` (${job.fotos.length})` : ""}
            <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} disabled={busy} onChange={(e) => { addPhoto(e.target.files[0]); e.target.value = ""; }} />
          </label>
          <button onClick={() => onModal("incidente")} className="btn-ghost" style={{ flex: "1 1 30%", justifyContent: "center", color: C.danger, borderColor: C.dangerBorder }}><AlertTriangle size={15} /> {t("emp.incident")}</button>
          {!started ? (
            <button onClick={() => onModal("no_realizado")} className="btn-ghost" style={{ flex: "1 1 30%", justifyContent: "center", color: C.muted }}><XCircle size={15} /> {t("emp.notDone")}</button>
          ) : (
            <button onClick={() => onModal("finish")} className="btn-primary" style={{ flex: "1 1 100%", justifyContent: "center", minHeight: 48, fontSize: 15 }}><CheckCheck size={16} /> {t("emp.finish")}</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* =================================================== Terminar (con motivos) */
function FinishModal({ job, me, checklist, client, registros, patch, onClose }) {
  const { t } = useT();
  const pendientes = (checklist?.tareas || []).map((task, i) => ({ i, task })).filter(({ i }) => !job.tareasCompletadas?.[i]);
  const [motivos, setMotivos] = useState(() => Object.fromEntries(pendientes.map(({ i }) => [i, job.tareas_no_hechas?.[i] || ""])));
  const [busy, setBusy] = useState(false);
  const faltan = pendientes.filter(({ i }) => !motivos[i]?.trim());

  async function finish() {
    if (faltan.length) { toast(t("emp.finishConfirmBody", { n: faltan.length }), "error"); return; }
    setBusy(true);
    const r = await run(() => api.stopRegistro(job.id, me));
    if (!r) { setBusy(false); return; }
    patch("registro_horas", r);
    const otrosAbiertos = registros.some((x) => x.job_id === job.id && x.personal_id !== me && !x.fin);
    const tareas_no_hechas = { ...(job.tareas_no_hechas || {}) };
    pendientes.forEach(({ i }) => { tareas_no_hechas[i] = motivos[i].trim(); });
    const p = { tareas_no_hechas, ...(otrosAbiertos ? {} : { estado: "finalizado", fin_real: r.fin }) };
    const saved = await run(() => api.updateJob(job.id, p), { ok: t("emp.finished") });
    setBusy(false);
    if (!saved) return;
    patch("jobs", saved);
    onClose();
    if (!otrosAbiertos && client?.email) {
      emailJobCompleted({ client, job: saved, horasLabel: hoursLabel(jobHoras(saved, [...registros.filter((x) => x.id !== r.id), r])) }).catch(() => {});
    }
  }

  return (
    <Modal title={t("emp.finishConfirmTitle")} subtitle={client?.nombre} onClose={onClose}
      footer={<><button className="btn-ghost" onClick={onClose} disabled={busy}>{t("common.cancel")}</button><button className="btn-primary" onClick={finish} disabled={busy || faltan.length > 0}><CheckCheck size={15} /> {t("emp.finish")}</button></>}>
      {pendientes.length === 0 ? (
        <p style={{ fontSize: 14, color: C.ink, display: "flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={18} color="var(--success)" /> {t("emp.allDone")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 13, color: C.ink, lineHeight: 1.5 }}>{t("emp.finishConfirmBody", { n: pendientes.length })}</p>
          {pendientes.map(({ i, task }) => (
            <Field key={i} label={task} required>
              <input className="input-base" value={motivos[i]} onChange={(e) => setMotivos({ ...motivos, [i]: e.target.value })} placeholder={t("emp.taskReasonPlaceholder")} />
            </Field>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ================================================================ Incidente */
function IncidentModal({ job, client, patch, onClose }) {
  const { t } = useT();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!text.trim()) { toast(t("emp.incidentDesc"), "error"); return; }
    setBusy(true);
    try {
      const fotos = [...(job.incidente?.fotos || [])];
      if (photo) fotos.push(await uploadPhoto("job-photos", photoPath(`incident-${job.id}`, photo), photo));
      const incidente = { texto: [job.incidente?.texto, text.trim()].filter(Boolean).join("\n"), fotos, fecha: new Date().toISOString(), resuelto: false };
      const saved = await api.updateJob(job.id, { incidente });
      patch("jobs", saved); toast(t("emp.incidentSent")); onClose();
    } catch (e) { toast(`${t("common.error")}: ${e.message}`, "error"); }
    setBusy(false);
  }

  return (
    <Modal title={t("emp.incidentTitle")} subtitle={client?.nombre} onClose={onClose}
      footer={<><button className="btn-ghost" onClick={onClose} disabled={busy}>{t("common.cancel")}</button><button className="btn-danger" onClick={send} disabled={busy}><AlertTriangle size={14} /> {t("emp.incidentSend")}</button></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label={t("emp.incidentDesc")} required>
          <textarea className="input-base" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("emp.incidentPlaceholder")} style={{ resize: "vertical" }} autoFocus />
        </Field>
        <Field label={t("emp.incidentPhoto")}>
          <div style={{ padding: 10, borderRadius: 10, border: `1.5px dashed ${C.border}`, background: C.surface2 }}>
            {!photo ? (
              <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, cursor: "pointer", color: C.muted, fontSize: 13, fontWeight: 500 }}>
                <Camera size={16} /> {t("emp.incidentAttach")}
                <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => setPhoto(e.target.files[0])} />
              </label>
            ) : (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img src={URL.createObjectURL(photo)} alt="" style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}` }} />
                <button onClick={() => setPhoto(null)} aria-label={t("common.delete")} style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: "var(--danger)", border: `2px solid ${C.surface}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}><X size={12} color="#fff" strokeWidth={3} /></button>
              </div>
            )}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

/* ============================================================= No realizado */
function NotDoneModal({ job, me, registros, patch, onClose }) {
  const { t } = useT();
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    if (!motivo.trim()) { toast(t("emp.notDoneReason"), "error"); return; }
    setBusy(true);
    const mine = registros.find((r) => r.job_id === job.id && r.personal_id === me && !r.fin);
    if (mine) { const r = await run(() => api.stopRegistro(job.id, me)); if (r) patch("registro_horas", r); }
    const saved = await run(() => api.updateJob(job.id, { estado: "no_realizado", motivo_no_realizado: motivo.trim() }), { ok: t("emp.notDoneSent") });
    setBusy(false);
    if (saved) { patch("jobs", saved); onClose(); }
  }
  return (
    <Modal title={t("emp.notDoneTitle")} onClose={onClose}
      footer={<><button className="btn-ghost" onClick={onClose} disabled={busy}>{t("common.cancel")}</button><button className="btn-danger" onClick={send} disabled={busy}><XCircle size={14} /> {t("common.confirm")}</button></>}>
      <Field label={t("emp.notDoneReason")} required>
        <textarea className="input-base" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={t("emp.notDonePlaceholder")} autoFocus style={{ resize: "vertical" }} />
      </Field>
    </Modal>
  );
}
