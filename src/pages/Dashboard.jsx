import { useMemo, useState } from "react";
import { Building2, Clock, Users, ShieldAlert, Star, AlertTriangle, Inbox, CheckCircle2, MapPin, CheckCheck, ExternalLink } from "lucide-react";
import { Avatar, C, KpiCard, PageHeader, ProgressBar, ProgressRing, StarRating, StatusBadge, EmptyState, Modal, Segmented, LiveTimer, useConfirm } from "../components/ui.jsx";
import JobDetailModal from "../components/JobDetailModal.jsx";
import { useT } from "../i18n/index.jsx";
import { formatFecha, formatFechaLarga, formatHoraTs, todayISO } from "../lib/dates";
import { avgChecklistPct, avgRating, checklistPct } from "../lib/stats";
import { run } from "../lib/toast";
import { updateSolicitud } from "../data/api";

const ESTADOS = ["programado", "en_curso", "finalizado", "no_realizado"];

export default function Dashboard({ clients, staff, jobs, checklists, registros, solicitudes, mensajes = [], patch, profile, goTo }) {
  const { t, lang } = useT();
  const hoy = todayISO();
  const [filtro, setFiltro] = useState("todos");
  const [modal, setModal] = useState(null); // {type:'job', id} | {type:'onsite'} | {type:'incidents'}
  const [incTab, setIncTab] = useState("abiertos");
  const [confirm, confirmDialog] = useConfirm();

  const hoyJobs = useMemo(() => jobs.filter((j) => j.fecha === hoy).sort((a, b) => (a.hora || "").localeCompare(b.hora || "")), [jobs, hoy]);
  const counts = useMemo(() => Object.fromEntries(ESTADOS.map((e) => [e, hoyJobs.filter((j) => j.estado === e).length])), [hoyJobs]);
  const visibles = filtro === "todos" ? hoyJobs : hoyJobs.filter((j) => j.estado === filtro);
  const abiertos = useMemo(() => registros.filter((r) => !r.fin), [registros]);
  const enCalle = new Set(abiertos.map((r) => r.personal_id)).size;
  const incidentes = useMemo(() => jobs.filter((j) => j.incidente).sort((a, b) => (b.incidente.fecha || b.fecha || "").localeCompare(a.incidente.fecha || a.fecha || "")), [jobs]);
  const incAbiertos = incidentes.filter((j) => !j.incidente.resuelto);
  const incResueltos = incidentes.filter((j) => j.incidente.resuelto);
  const nuevas = solicitudes.filter((s) => s.estado === "nueva");
  const cumplimientoHoy = avgChecklistPct(hoyJobs, checklists);
  const overallRating = avgRating(jobs);
  const recentRatings = useMemo(() => jobs.filter((j) => typeof j.rating === "number" && j.rating > 0).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")).slice(0, 5), [jobs]);
  const activos = clients.filter((c) => c.estado === "activo").length;

  async function marcarVista(s) {
    const ok = await run(() => updateSolicitud(s.id, { estado: "vista" }));
    if (ok) patch("solicitudes", { id: s.id, estado: "vista" });
  }

  const openJob = (id) => setModal({ type: "job", id });
  const kpiBtn = { cursor: "pointer", textAlign: "left", background: "none", border: "none", padding: 0, width: "100%", font: "inherit" };

  return (
    <div>
      <PageHeader title={t("dash.title")} subtitle={t("dash.subtitle", { date: formatFechaLarga(hoy, lang) })}
        action={<div style={{ display: "flex", alignItems: "center", gap: 6, background: C.pale, borderRadius: 10, padding: "6px 14px", fontSize: 12, color: C.primary, fontWeight: 600 }}><div className="live-dot" style={{ width: 8, height: 8 }} /> {t("dash.live")}</div>} />

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <button style={kpiBtn} onClick={() => { setFiltro("todos"); document.getElementById("today-list")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
          <KpiCard icon={Clock} label={t("dash.kpi.today")} value={hoyJobs.length} sub={t("dash.kpi.todaySub", { a: counts.en_curso, b: counts.finalizado })} delay={0} />
        </button>
        <button style={kpiBtn} onClick={() => setModal({ type: "onsite" })}>
          <KpiCard icon={Users} label={t("dash.kpi.onsite")} value={enCalle} sub={t("dash.kpi.onsiteSub", { n: staff.filter((s) => s.activo !== false && s.rol === "operativo").length })} tone="var(--info)" delay={75} />
        </button>
        <button style={kpiBtn} onClick={() => { setIncTab(incAbiertos.length ? "abiertos" : "resueltos"); setModal({ type: "incidents" }); }}>
          <KpiCard icon={ShieldAlert} label={t("dash.kpi.incidents")} value={incAbiertos.length} sub={incAbiertos.length ? t("dash.kpi.incidentsSub") : t("dash.kpi.incidentsNone")} tone={incAbiertos.length ? "var(--danger)" : "var(--success)"} delay={150} />
        </button>
        <button style={kpiBtn} onClick={() => goTo("clientes")}>
          <KpiCard icon={Building2} label={t("dash.kpi.clients")} value={activos} sub={nuevas.length ? t("dash.kpi.requests", { n: nuevas.length }) : t("dash.kpi.requestsNone")} tone={nuevas.length ? "var(--amber)" : C.primary} delay={225} />
        </button>
      </div>

      <div className="dashboard-body-grid">
        <div className="card animate-fadeUp delay-150" style={{ marginTop: 0 }} id="today-list">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
            <h3 className="h3" style={{ fontSize: 15 }}>{t("dash.todayJobs")}</h3>
            <button className="btn-ghost btn-sm" onClick={() => goTo("programacion")}>{t("dash.seeSchedule")}</button>
          </div>
          <div style={{ marginBottom: 14, overflowX: "auto" }}>
            <Segmented ariaLabel={t("common.status")} value={filtro} onChange={setFiltro} options={[
              { id: "todos", label: `${t("common.all")} (${hoyJobs.length})` },
              ...ESTADOS.map((e) => ({ id: e, label: `${t(`estado.${e}`)} (${counts[e]})` })),
            ]} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visibles.map((job, i) => {
              const client = clients.find((c) => c.id === job.clienteId);
              const emps = (job.empleados || []).map((eid) => staff.find((s) => s.id === eid)).filter(Boolean);
              const chk = checklists.find((c) => c.id === job.checklistId);
              const p = checklistPct(job, chk);
              const tone = job.incidente && !job.incidente.resuelto ? "danger" : job.estado === "en_curso" ? "amber" : null;
              return (
                <button key={job.id} className="animate-fadeUp" onClick={() => openJob(job.id)} style={{
                  animationDelay: `${i * 40}ms`, display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 14, cursor: "pointer", textAlign: "left", width: "100%", font: "inherit",
                  border: `1.5px solid ${tone === "danger" ? C.dangerBorder : tone === "amber" ? C.amberBorder : C.borderSubtle}`,
                  background: tone === "danger" ? C.dangerPale : tone === "amber" ? C.amberPale : C.surface,
                }}>
                  <span className="tabular" style={{ fontSize: 12, color: C.muted, width: 44, flexShrink: 0, fontFamily: "'IBM Plex Mono',monospace" }}>{job.hora}</span>
                  <Avatar name={client?.nombre || "?"} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client?.nombre || t("common.deletedClient")}</p>
                    <p style={{ fontSize: 11, color: C.muted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emps.map((e) => e.nombre).join(", ") || t("common.unassigned")}</p>
                  </div>
                  {job.rating ? <StarRating value={job.rating} /> : null}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <StatusBadge estado={job.estado} />
                    {job.estado !== "programado" && job.estado !== "no_realizado" && <div style={{ width: 80 }}><ProgressBar value={p} height={4} /></div>}
                  </div>
                </button>
              );
            })}
            {hoyJobs.length === 0 && <EmptyState icon={CheckCircle2} title={t("dash.emptyToday")} body={t("dash.emptyTodayBody")} />}
            {hoyJobs.length > 0 && visibles.length === 0 && <EmptyState icon={CheckCircle2} title={t("dash.emptyFilter")} />}
          </div>

          {incAbiertos.length > 0 && (
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.borderSubtle}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h4 className="section-title" style={{ color: C.dangerInk, marginBottom: 0 }}><ShieldAlert size={14} /> {t("dash.kpi.incidents")}</h4>
                <button className="btn-ghost btn-sm" onClick={() => { setIncTab("abiertos"); setModal({ type: "incidents" }); }}>{t("common.view")}</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {incAbiertos.slice(0, 3).map((job) => <IncidentRow key={job.id} job={job} client={clients.find((c) => c.id === job.clienteId)} onOpen={() => openJob(job.id)} t={t} lang={lang} />)}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {nuevas.length > 0 && (
            <div className="card animate-fadeUp delay-150" style={{ marginTop: 0, borderColor: C.amberBorder }}>
              <h3 className="h3" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><Inbox size={15} /> {t("dash.requests")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {nuevas.map((s) => {
                  const client = clients.find((c) => c.id === s.cliente_id);
                  return (
                    <div key={s.id} style={{ padding: "8px 10px", borderRadius: 10, background: C.amberPale, border: `1px solid ${C.amberBorder}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{client?.nombre || t("common.client")}</span>
                        <button className="btn-ghost btn-sm" onClick={() => marcarVista(s)}>{t("dash.markSeen")}</button>
                      </div>
                      <p style={{ fontSize: 12, color: C.ink, marginTop: 2 }}>{s.tipo}{s.fecha ? ` · ${formatFecha(s.fecha, lang)}` : ""}</p>
                      {s.notas && <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{s.notas}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="card animate-fadeUp delay-225" style={{ marginTop: 0 }}>
            <h3 className="h3" style={{ marginBottom: 14 }}>{t("dash.compliance")}</h3>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <ProgressRing value={cumplimientoHoy ?? 0} size={100} stroke={9} />
              <p style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>{cumplimientoHoy === null ? t("dash.complianceNone") : t("dash.complianceSub")}</p>
            </div>
          </div>

          <div className="card animate-fadeUp delay-300" style={{ marginTop: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 className="h3">{t("dash.satisfaction")}</h3>
              {overallRating && <StarRating value={overallRating} />}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentRatings.length === 0 && <p style={{ fontSize: 12, color: C.muted }}>{t("dash.noRatings")}</p>}
              {recentRatings.map((job) => {
                const client = clients.find((c) => c.id === job.clienteId); const low = job.rating <= 2;
                return (
                  <button key={job.id} onClick={() => openJob(job.id)} style={{ display: "flex", flexDirection: "column", gap: 3, padding: "8px 10px", borderRadius: 10, background: low ? C.dangerPale : C.surface2, border: `1px solid ${low ? C.dangerBorder : C.borderSubtle}`, cursor: "pointer", textAlign: "left", font: "inherit", width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{client?.nombre || t("common.client")}</span>
                      <StarRating value={job.rating} />
                    </div>
                    {job.comentario && <p style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>"{job.comentario}"</p>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card animate-fadeUp delay-375" style={{ marginTop: 0 }}>
            <h3 className="h3" style={{ marginBottom: 12 }}>{t("dash.featured")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {staff.filter((s) => s.destacado).map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={s.nombre} size={34} />
                  <div style={{ flex: 1 }}><p style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{s.nombre}</p><p style={{ fontSize: 11, color: C.muted }}>{t(`st.f.tipo.${{ Fijo: "fijo", Temporada: "temporada", "Por hora": "porHora" }[s.tipo] || "fijo"}`)}</p></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, background: C.amberPale, borderRadius: 8, padding: "3px 8px" }}><Star size={11} fill="var(--amber)" color="var(--amber)" /><span style={{ fontSize: 11, color: C.amberInk, fontWeight: 700 }}>Top</span></div>
                </div>
              ))}
              {staff.filter((s) => s.destacado).length === 0 && <p style={{ fontSize: 12, color: C.muted }}>{t("dash.noFeatured")}</p>}
            </div>
          </div>
        </div>
      </div>

      {modal?.type === "job" && (() => {
        const job = jobs.find((j) => j.id === modal.id); if (!job) return null;
        return <JobDetailModal job={job} clients={clients} staff={staff} checklists={checklists} registros={registros} mensajes={mensajes} patch={patch} profile={profile} confirm={confirm} onClose={() => setModal(null)} />;
      })()}

      {modal?.type === "onsite" && (
        <Modal title={t("dash.onsiteTitle")} onClose={() => setModal(null)}>
          {abiertos.length === 0 && <EmptyState icon={Users} title={t("dash.onsiteEmpty")} />}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {abiertos.map((r) => {
              const s = staff.find((x) => x.id === r.personal_id); const job = jobs.find((j) => j.id === r.job_id); const client = clients.find((c) => c.id === job?.clienteId);
              const loc = client?.ubicaciones?.find((u) => u.id === job?.ubicacionId);
              return (
                <button key={r.id} onClick={() => job && openJob(job.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: C.amberPale, border: `1px solid ${C.amberBorder}`, cursor: "pointer", textAlign: "left", font: "inherit", width: "100%" }}>
                  <Avatar name={s?.nombre || "?"} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{s?.nombre || "—"}</p>
                    <p style={{ fontSize: 12, color: C.ink, marginTop: 1 }}>{client?.nombre || t("common.deletedClient")}{loc?.direccion ? <span style={{ color: C.muted }}> · <MapPin size={10} style={{ display: "inline" }} /> {loc.direccion}</span> : null}</p>
                    <p className="tabular" style={{ fontSize: 11, color: C.amberInk, marginTop: 2, display: "flex", gap: 4, alignItems: "center" }}><Clock size={11} /> {t("common.since")} {formatHoraTs(r.inicio, lang)} · <LiveTimer startTime={r.inicio} /></p>
                  </div>
                  <ExternalLink size={14} color="var(--muted)" />
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {modal?.type === "incidents" && (
        <Modal title={t("dash.incidents")} onClose={() => setModal(null)} wide>
          <div style={{ marginBottom: 12 }}>
            <Segmented ariaLabel={t("dash.incidents")} value={incTab} onChange={setIncTab} options={[{ id: "abiertos", label: t("dash.incidentsOpen", { n: incAbiertos.length }) }, { id: "resueltos", label: t("dash.incidentsResolved", { n: incResueltos.length }) }]} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(incTab === "abiertos" ? incAbiertos : incResueltos).map((job) => <IncidentRow key={job.id} job={job} client={clients.find((c) => c.id === job.clienteId)} onOpen={() => openJob(job.id)} t={t} lang={lang} />)}
            {(incTab === "abiertos" ? incAbiertos : incResueltos).length === 0 && <p style={{ fontSize: 12.5, color: C.muted }}>{t("dash.incidentsEmpty")}</p>}
          </div>
        </Modal>
      )}
      {confirmDialog}
    </div>
  );
}

function IncidentRow({ job, client, onOpen, t, lang }) {
  const inc = job.incidente; const res = inc.resuelto;
  return (
    <button onClick={onOpen} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 12, background: res ? C.surface2 : C.dangerPale, border: `1px solid ${res ? C.borderSubtle : C.dangerBorder}`, cursor: "pointer", textAlign: "left", font: "inherit", width: "100%" }}>
      {res ? <CheckCheck size={15} color="var(--success)" style={{ flexShrink: 0, marginTop: 2 }} /> : <AlertTriangle size={15} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{client?.nombre || t("common.deletedClient")} · {formatFecha(job.fecha, lang)} {job.hora}</p>
        <p style={{ fontSize: 12, color: res ? C.ink : C.dangerInk, marginTop: 1 }}>{inc.texto || "—"}</p>
        {res && <p style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{t("dash.resolvedBy", { who: inc.resuelto_por || "—", when: inc.resuelto_en ? formatFecha(inc.resuelto_en.slice(0, 10), lang) : "—" })}{inc.nota_resolucion ? ` — ${inc.nota_resolucion}` : ""}</p>}
      </div>
      <span style={{ fontSize: 11, color: C.primary, fontWeight: 600, flexShrink: 0 }}>{t("dash.openJob")} →</span>
    </button>
  );
}
