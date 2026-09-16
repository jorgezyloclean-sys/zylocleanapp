// Portal del cliente. Entra por ?portal=<token>. Lee por RPC (portal_get),
// que devuelve solo lo de ese cliente. Se refresca cada 20 s.
import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, History, Clock, Star, Heart, Send, CheckCheck, CheckCircle2, Circle, AlertTriangle, Calendar, Truck, XCircle, Plus } from "lucide-react";
import { Avatar, C, Field, LangSwitch, ThemeSwitch, Modal, ProgressBar, LiveTimer, StarRating, EmptyState, FONT_DISPLAY } from "../components/ui.jsx";
import { useT } from "../i18n/index.jsx";
import { MarkBadge, Wordmark } from "../components/Brand.jsx";
import { formatFecha, todayISO } from "../lib/dates";
import { durationLabel } from "../lib/format";
import { toast } from "../lib/toast";
import * as api from "../data/api";
import { localizeChecklist } from "../lib/checklist";

const STEPS = [
  { id: "scheduled", key: "portal.step.scheduled", icon: Calendar },
  { id: "heading", key: "portal.step.heading", icon: Truck },
  { id: "cleaning", key: "portal.step.cleaning", icon: Sparkles },
  { id: "done", key: "portal.step.done", icon: CheckCheck },
];

export default function ClientPortal({ token }) {
  const { t, lang } = useT();
  const [data, setData] = useState(undefined);
  const timer = useRef(null);

  async function load() {
    try { const d = await api.portalGet(token); setData(d ?? null); } catch { setData((prev) => prev ?? null); }
  }
  useEffect(() => { load(); timer.current = setInterval(load, 20000); return () => clearInterval(timer.current); }, [token]);

  if (data === undefined) return <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, background: C.bg }}>{t("common.loading")}</div>;
  if (data === null) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: C.bg }}>
      <div style={{ textAlign: "center", maxWidth: 380 }}><AlertTriangle size={36} color="var(--amber)" style={{ margin: "0 auto 12px" }} /><h2 style={{ fontFamily: FONT_DISPLAY, color: C.ink }}>{t("portal.invalid")}</h2><p style={{ color: C.muted, marginTop: 8, fontSize: 13 }}>{t("portal.invalidBody")}</p></div>
    </div>
  );
  return <PortalBody data={data} token={token} reload={load} t={t} lang={lang} />;
}

function PortalBody({ data, token, reload, t, lang }) {
  const { client, jobs, checklists } = data;
  const hoy = todayISO();
  const activeJob = useMemo(() => {
    const abiertos = jobs.filter((j) => j.estado === "programado" || j.estado === "en_curso").sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    const proximo = abiertos.find((j) => j.fecha >= hoy) || abiertos[0];
    const ultimo = jobs.find((j) => j.estado === "finalizado" || j.estado === "no_realizado"); // jobs viene ordenado desc
    // Si hoy se finalizó algo y no hay nada en curso, mostramos lo finalizado para que pueda valorar.
    if (ultimo && ultimo.fecha === hoy && !abiertos.some((j) => j.fecha === hoy && j.estado === "en_curso")) return ultimo;
    return proximo || ultimo || null;
  }, [jobs, hoy]);
  const pastJobs = jobs.filter((j) => j.id !== activeJob?.id && (j.estado === "finalizado" || j.estado === "no_realizado"));
  const checklist = activeJob ? localizeChecklist(checklists.find((c) => c.id === activeJob.checklistId), lang) : null;
  const [rating, setRating] = useState(0);
  const [comentario, setComentario] = useState("");
  const [request, setRequest] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const realRating = useMemo(() => { const r = jobs.filter((j) => j.rating > 0); return r.length ? Math.round((r.reduce((s, j) => s + j.rating, 0) / r.length) * 10) / 10 : null; }, [jobs]);

  useEffect(() => { setRating(0); setComentario(""); }, [activeJob?.id]);

  async function submitRating() {
    if (!rating) { toast(t("portal.pickRating"), "error"); return; }
    setBusy(true);
    try { const ok = await api.portalRate(token, activeJob.id, rating, comentario); if (ok) { toast(t("portal.ratingSaved")); await reload(); } else toast(t("common.error"), "error"); }
    catch (e) { toast(`${t("common.error")}: ${e.message}`, "error"); }
    setBusy(false);
  }
  async function submitRequest() {
    setBusy(true);
    try { const ok = await api.portalRequest(token, request.tipo, request.fecha, request.notas); if (ok) { toast(t("portal.requestSent")); setRequest(null); } else toast(t("portal.requestError"), "error"); }
    catch (e) { toast(`${t("portal.requestError")} ${e.message}`, "error"); }
    setBusy(false);
  }

  const isDone = activeJob?.estado === "finalizado";
  const isNotDone = activeJob?.estado === "no_realizado";
  const step = isDone ? 3 : activeJob?.estado === "en_curso" ? 2 : 0;
  const progress = checklist?.tareas?.length ? Math.round((Object.values(activeJob.tareasCompletadas || {}).filter(Boolean).length / checklist.tareas.length) * 100) : isDone ? 100 : 0;
  const headline = isDone ? t("portal.ready") : isNotDone ? t("portal.notDone") : activeJob?.incidente ? t("portal.incident") : activeJob?.estado === "en_curso" ? t("portal.cleaning") : t("portal.scheduled");

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, paddingBottom: 40 }}>
      <header style={{ background: "var(--hero-bg, linear-gradient(135deg, var(--primary) 0%, var(--primary-mid) 60%, var(--primary-bright) 100%))", padding: "0 16px", position: "sticky", top: 0, zIndex: 30, boxShadow: "var(--shadow-md)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", gap: 8, color: "var(--hero-fg, #fff)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <MarkBadge size={36} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{client.nombre}</p>
              <p style={{ fontSize: 10, opacity: .75, display: "flex", alignItems: "center", gap: 4 }}>{t("portal.title")} · ZyloClean</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <LangSwitch compact /><ThemeSwitch />
            {pastJobs.length > 0 && <button onClick={() => setShowHistory(true)} aria-label={t("portal.history")} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.18)", border: "none", borderRadius: 10, minHeight: 36, padding: "6px 10px", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}><History size={13} /></button>}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {!activeJob ? (
          <EmptyState icon={CheckCircle2} title={t("portal.allClear")} body={t("portal.allClearBody")} action={<button className="btn-primary" onClick={() => setRequest({ tipo: "", fecha: "", notas: "" })}><Plus size={14} /> {t("portal.request")}</button>} />
        ) : (
          <>
            <div className="portal-hero animate-fadeUp">
              <div style={{ position: "relative", zIndex: 1 }}>
                <p style={{ fontSize: 11, opacity: .7, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{t("portal.status")}</p>
                <p style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{headline}</p>
                <p className="tabular" style={{ fontSize: 13, opacity: .85 }}>{formatFecha(activeJob.fecha, lang)} · {activeJob.hora}{activeJob.ubicacionId ? ` · ${client.ubicaciones.find((u) => u.id === activeJob.ubicacionId)?.direccion || ""}` : ""}</p>
                {activeJob.estado === "en_curso" && activeJob.inicio_real && <p style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}><Clock size={14} /> {t("portal.timeOnSite")}: <LiveTimer startTime={activeJob.inicio_real} /></p>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {activeJob.empleados.map((emp) => (
                    <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.2)", padding: "4px 10px", borderRadius: 20 }}>
                      <Avatar name={emp.nombre} size={20} bg="rgba(255,255,255,.3)" color="#fff" /><span style={{ fontSize: 12, fontWeight: 500 }}>{emp.nombre}</span>
                      {emp.idiomas?.length > 0 && <span style={{ fontSize: 10, opacity: .8 }}>· {emp.idiomas.join(", ")}</span>}
                    </div>
                  ))}
                  {realRating && <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.2)", padding: "4px 10px", borderRadius: 20 }}><Star size={13} fill="#FFD700" color="#FFD700" /><span style={{ fontSize: 12, fontWeight: 600 }}>{realRating} {t("portal.avg")}</span></div>}
                </div>
                {!isDone && !isNotDone && <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}><div className="live-dot" /><span style={{ fontSize: 12, fontWeight: 500 }}>{t("portal.live")}</span></div>}
              </div>
            </div>

            {activeJob.incidente && <div className="banner danger animate-fadeUp"><AlertTriangle size={15} /><div><strong>{t("portal.incident")}</strong><br />{activeJob.incidente.texto}</div></div>}

            {!isNotDone && (
              <div className="card animate-fadeUp delay-75" style={{ marginTop: 0 }}>
                <h3 className="h3" style={{ marginBottom: 18 }}>{t("portal.timeline")}</h3>
                {STEPS.map((s, i) => {
                  const done = i < step, active = i === step; const Icon = s.icon;
                  return (
                    <div key={s.id} className={`timeline-step ${done ? "done" : ""} ${active ? "active" : ""}`} style={{ paddingBottom: i < STEPS.length - 1 ? 24 : 0 }}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: done ? C.primary : active ? C.pale : C.neutralPale, border: `2px solid ${done ? C.primary : active ? C.bright : C.border}`, boxShadow: active ? `0 0 0 4px ${C.glow}` : "none", zIndex: 1, position: "relative" }}>
                        {done ? <CheckCircle2 size={18} color="var(--on-primary)" /> : <Icon size={16} color={active ? "var(--primary)" : "var(--muted-2)"} />}
                      </div>
                      <div style={{ paddingTop: 6 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: done ? C.primary : active ? C.ink : C.muted2 }}>{t(s.key)}</p>
                        {active && checklist && <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{progress}%</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {checklist && (activeJob.estado === "en_curso" || isDone) && (
              <div className="card animate-fadeUp delay-150" style={{ marginTop: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><h3 className="h3">{t("portal.detail")}</h3><span className="tabular" style={{ fontSize: 12, color: C.primary, fontWeight: 700 }}>{progress}%</span></div>
                <ProgressBar value={progress} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                  {checklist.tareas.map((task, i) => { const ok = !!activeJob.tareasCompletadas?.[i]; return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, opacity: ok ? .65 : 1 }}>{ok ? <CheckCircle2 size={14} color="var(--primary-bright)" /> : <Circle size={14} color="var(--border)" />}<span style={{ color: ok ? C.muted : C.ink, textDecoration: ok ? "line-through" : "none" }}>{task}</span></div>); })}
                </div>
              </div>
            )}

            {isDone && (
              <div className="card animate-scaleIn" style={{ textAlign: "center", marginTop: 0 }}>
                <CheckCheck size={36} color="var(--primary-bright)" style={{ margin: "0 auto 12px" }} />
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{t("portal.completed")}</h3>
                {activeJob.inicio_real && activeJob.fin_real && <p className="tabular" style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>{t("portal.totalDuration")}: <strong style={{ color: C.ink }}>{durationLabel(new Date(activeJob.fin_real) - new Date(activeJob.inicio_real))}</strong></p>}
                {!activeJob.rating ? (
                  <>
                    <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>{t("portal.rateQuestion")}</p>
                    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: rating ? 18 : 0 }} role="radiogroup" aria-label={t("emp.rating")}>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button key={v} role="radio" aria-checked={rating === v} aria-label={`${v}`} onClick={() => setRating(v)} style={{ width: 48, height: 48, borderRadius: 14, border: "none", background: v <= rating ? C.pale : C.neutralPale, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Star size={24} fill={v <= rating ? "var(--amber)" : "none"} color={v <= rating ? "var(--amber)" : "var(--border)"} />
                        </button>
                      ))}
                    </div>
                    {!rating && <p style={{ fontSize: 11.5, color: C.amberInk, marginTop: 8, fontWeight: 600 }}>{t("portal.pickRating")}</p>}
                    {rating > 0 && (
                      <div className="animate-fadeUp" style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
                        <Field label={t("portal.tellMore")}><textarea className="input-base" rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder={t("portal.tellMorePlaceholder")} style={{ resize: "vertical" }} /></Field>
                        <button className="btn-primary" style={{ justifyContent: "center" }} onClick={submitRating} disabled={busy}><Send size={14} /> {t("portal.sendRating")}</button>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 10 }}>{[1, 2, 3, 4, 5].map((v) => <Star key={v} size={22} fill={v <= activeJob.rating ? "var(--amber)" : "none"} color={v <= activeJob.rating ? "var(--amber)" : "var(--border)"} />)}</div>
                    {activeJob.comentario && <p style={{ fontSize: 13, color: C.ink, fontStyle: "italic", margin: "0 auto 12px", maxWidth: 320 }}>"{activeJob.comentario}"</p>}
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.pale, borderRadius: 12, padding: "10px 20px", color: C.primary, fontWeight: 600, fontSize: 13 }}><Heart size={16} fill="var(--primary-bright)" color="var(--primary-bright)" /> {t("portal.thanks")}</div>
                  </div>
                )}
              </div>
            )}
            {isNotDone && <div className="banner danger"><XCircle size={15} /><div>{t("portal.notDone")}</div></div>}

            <button className="btn-ghost" style={{ justifyContent: "center", minHeight: 48 }} onClick={() => setRequest({ tipo: "", fecha: "", notas: "" })}><Plus size={15} /> {t("portal.request")}</button>
          </>
        )}
      </div>

      {request && (
        <Modal title={t("portal.request")} onClose={() => setRequest(null)} gradient
          footer={<><button className="btn-ghost" onClick={() => setRequest(null)} disabled={busy}>{t("common.cancel")}</button><button className="btn-primary" onClick={submitRequest} disabled={busy || !request.tipo.trim()}><Send size={14} /> {t("portal.requestSend")}</button></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label={t("portal.requestType")} required><input className="input-base" value={request.tipo} onChange={(e) => setRequest({ ...request, tipo: e.target.value })} autoFocus /></Field>
            <Field label={t("portal.requestDate")}><input type="date" className="input-base" value={request.fecha} min={hoy} onChange={(e) => setRequest({ ...request, fecha: e.target.value })} /></Field>
            <Field label={t("portal.requestNotes")}><textarea className="input-base" rows={3} value={request.notas} onChange={(e) => setRequest({ ...request, notas: e.target.value })} style={{ resize: "vertical" }} /></Field>
          </div>
        </Modal>
      )}

      {showHistory && (
        <Modal title={t("portal.historyTitle")} onClose={() => setShowHistory(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 420, overflowY: "auto" }}>
            {pastJobs.length === 0 && <p style={{ fontSize: 12, color: C.muted }}>{t("portal.noHistory")}</p>}
            {pastJobs.map((job) => (
              <div key={job.id} style={{ padding: "10px 12px", borderRadius: 10, background: C.surface2, border: `1px solid ${C.borderSubtle}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span className="tabular" style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{formatFecha(job.fecha, lang)} · {job.hora}</span>
                  {job.estado === "finalizado" ? <StarRating value={job.rating ?? null} empty="—" /> : <span style={{ fontSize: 11, color: C.dangerInk, fontWeight: 600 }}>{t("estado.no_realizado")}</span>}
                </div>
                <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{job.empleados.map((e) => e.nombre).join(", ")}</p>
                {job.comentario && <p style={{ fontSize: 11, color: C.muted, fontStyle: "italic", marginTop: 4 }}>"{job.comentario}"</p>}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
