// Reportes por período (spec §3.5): horas por trabajo/persona/cliente,
// estimado vs. real, cumplimiento de checklists, exportables a CSV.
import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { Download, Clock, CheckCheck, XCircle, TrendingUp, BarChart3 } from "lucide-react";
import { C, EmptyState, KpiCard, PageHeader, PeriodPicker, Segmented, StarRating, StatusBadge } from "../components/ui.jsx";
import { useT } from "../i18n/index.jsx";
import { formatFecha, formatMes, periodPresets, todayISO } from "../lib/dates";
import { hoursLabel, num } from "../lib/format";
import { avgChecklistPct, avgRating, checklistPct, comparables, inPeriod, jobHoras, jobHorasEstimadas, registroHoras, serieMensual } from "../lib/stats";
import { downloadFile, toCSV } from "../lib/csv";
import { toast } from "../lib/toast";

const tooltipStyle = { contentStyle: { borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink)", fontSize: 12 }, labelStyle: { color: "var(--ink)", fontWeight: 600 } };

export default function ReportsPage({ clients, staff, jobs, checklists, servicios, registros }) {
  const { t, lang } = useT();
  const [period, setPeriod] = useState(() => periodPresets().mes);
  const [tab, setTab] = useState("clientes");

  const enPeriodo = useMemo(() => jobs.filter((j) => inPeriod(j, period.from, period.to)), [jobs, period]);
  const svcOf = (j) => servicios.find((s) => s.id === j.servicio_id);

  const totales = useMemo(() => {
    const reales = enPeriodo.reduce((s, j) => s + jobHoras(j, registros), 0);
    const est = comparables(enPeriodo).reduce((s, j) => s + jobHorasEstimadas(j, svcOf(j)), 0);
    return { trabajos: enPeriodo.length, finalizados: enPeriodo.filter((j) => j.estado === "finalizado").length, noRealizados: enPeriodo.filter((j) => j.estado === "no_realizado").length, reales, est, desvio: est ? reales - est : null };
  }, [enPeriodo, registros, servicios]);

  const porCliente = useMemo(() => clients.map((c) => {
    const cj = enPeriodo.filter((j) => j.clienteId === c.id);
    const reales = cj.reduce((s, j) => s + jobHoras(j, registros), 0);
    const est = comparables(cj).reduce((s, j) => s + jobHorasEstimadas(j, svcOf(j)), 0);
    return { cliente: c.nombre, id: c.id, trabajos: cj.length, finalizados: cj.filter((j) => j.estado === "finalizado").length, reales, est, desvio: est ? reales - est : null, cumplimiento: avgChecklistPct(cj, checklists), rating: avgRating(cj) };
  }).filter((r) => r.trabajos > 0).sort((a, b) => b.reales - a.reales), [clients, enPeriodo, registros, checklists, servicios]);

  const porPersona = useMemo(() => staff.map((s) => {
    const sj = enPeriodo.filter((j) => (j.empleados || []).includes(s.id));
    const regs = registros.filter((r) => r.personal_id === s.id && r.fin && sj.some((j) => j.id === r.job_id));
    const horas = regs.reduce((a, r) => a + registroHoras(r), 0);
    const est = comparables(sj).reduce((a, j) => a + (j.duracion_estimada_min ?? svcOf(j)?.duracion_estimada_min ?? 0) / 60, 0);
    return { persona: s.nombre, id: s.id, trabajos: sj.length, finalizados: sj.filter((j) => j.estado === "finalizado").length, horas, est, desvio: est ? horas - est : null, cumplimiento: avgChecklistPct(sj, checklists), rating: avgRating(sj) };
  }).filter((r) => r.trabajos > 0).sort((a, b) => b.horas - a.horas), [staff, enPeriodo, registros, checklists, servicios]);

  const detalle = useMemo(() => enPeriodo.slice().sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)).map((j) => {
    const c = clients.find((x) => x.id === j.clienteId); const chk = checklists.find((x) => x.id === j.checklistId);
    const reales = jobHoras(j, registros); const est = j.estado === "finalizado" || j.estado === "en_curso" ? jobHorasEstimadas(j, svcOf(j)) : 0;
    return { id: j.id, fecha: j.fecha, hora: j.hora, cliente: c?.nombre || "—", personal: (j.empleados || []).map((e) => staff.find((s) => s.id === e)?.nombre || "?").join(", "), estado: j.estado, reales, est, desvio: est ? reales - est : null, checklist: checklistPct(j, chk), rating: j.rating ?? "", motivo: j.motivo_no_realizado || "", incidente: j.incidente?.texto || "" };
  }), [enPeriodo, clients, staff, checklists, registros, servicios]);

  const tendencia = useMemo(() => serieMensual({ servicios, jobs, registros, meses: 6, hoy: todayISO() }).map((m) => ({ ...m, mes: formatMes(m.mes, lang).slice(0, 3) })), [servicios, jobs, registros, lang]);

  function exportCSV() {
    const tag = `${period.from}_${period.to}`;
    const L = (k) => t(k);
    if (tab === "clientes") downloadFile(`horas_por_cliente_${tag}.csv`, toCSV(porCliente, [
      { label: L("rep.csv.client"), value: "cliente" }, { label: L("rep.csv.jobs"), value: "trabajos" }, { label: L("rep.csv.finished"), value: "finalizados" },
      { label: L("rep.csv.realH"), value: (r) => r.reales.toFixed(2) }, { label: L("rep.csv.estH"), value: (r) => r.est.toFixed(2) }, { label: L("rep.csv.dev"), value: (r) => r.desvio === null ? "" : r.desvio.toFixed(2) },
      { label: L("rep.csv.compliance"), value: (r) => r.cumplimiento ?? "" }, { label: L("common.rating"), value: (r) => r.rating ?? "" }]));
    else if (tab === "personas") downloadFile(`horas_por_persona_${tag}.csv`, toCSV(porPersona, [
      { label: L("rep.csv.person"), value: "persona" }, { label: L("rep.csv.jobs"), value: "trabajos" }, { label: L("rep.csv.finished"), value: "finalizados" },
      { label: L("rep.csv.realH"), value: (r) => r.horas.toFixed(2) }, { label: L("rep.csv.estH"), value: (r) => r.est.toFixed(2) }, { label: L("rep.csv.dev"), value: (r) => r.desvio === null ? "" : r.desvio.toFixed(2) },
      { label: L("rep.csv.compliance"), value: (r) => r.cumplimiento ?? "" }, { label: L("common.rating"), value: (r) => r.rating ?? "" }]));
    else downloadFile(`detalle_trabajos_${tag}.csv`, toCSV(detalle, [
      { label: L("common.date"), value: "fecha" }, { label: L("common.time"), value: "hora" }, { label: L("rep.csv.client"), value: "cliente" }, { label: L("rep.csv.staff"), value: "personal" }, { label: L("common.status"), value: (r) => t(`estado.${r.estado}`) },
      { label: L("rep.csv.realH"), value: (r) => r.reales.toFixed(2) }, { label: L("rep.csv.estH"), value: (r) => r.est.toFixed(2) }, { label: L("rep.csv.dev"), value: (r) => r.desvio === null ? "" : r.desvio.toFixed(2) },
      { label: L("rep.csv.checklist"), value: "checklist" }, { label: L("common.rating"), value: "rating" }, { label: L("rep.csv.reason"), value: "motivo" }, { label: L("rep.csv.incident"), value: "incidente" }]));
    toast(t("common.csvDownloaded"));
  }

  const Desvio = ({ v }) => v === null ? <span style={{ color: C.muted2 }}>—</span> : <span className="tabular" style={{ color: v > 0.05 ? C.dangerInk : v < -0.05 ? C.successInk : C.muted, fontWeight: 600 }}>{v > 0 ? "+" : ""}{num(v, lang)} h</span>;

  return (
    <div>
      <PageHeader title={t("rep.title")} subtitle={t("rep.subtitle")}
        action={<button className="btn-ghost" onClick={exportCSV} disabled={enPeriodo.length === 0}><Download size={14} /> {t("common.exportCsv")}</button>} />
      <div className="reports-toolbar animate-fadeUp"><PeriodPicker value={period} onChange={setPeriod} /></div>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard icon={CheckCheck} label={t("rep.kpi.jobs")} value={totales.trabajos} sub={t("rep.kpi.jobsSub", { a: totales.finalizados, b: totales.noRealizados })} delay={0} />
        <KpiCard icon={Clock} label={t("rep.kpi.hours")} value={hoursLabel(totales.reales)} sub={totales.est ? t("rep.kpi.hoursEst", { h: hoursLabel(totales.est) }) : t("rep.kpi.hoursNoEst")} delay={75} />
        <KpiCard icon={TrendingUp} label={t("rep.kpi.deviation")} value={totales.desvio === null ? "—" : `${totales.desvio > 0 ? "+" : ""}${num(totales.desvio, lang)} h`} sub={totales.desvio === null ? t("rep.kpi.devNoEst") : totales.desvio > 0 ? t("rep.kpi.devOver") : t("rep.kpi.devOk")} tone={totales.desvio > 0 ? "var(--danger)" : "var(--success)"} delay={150} />
        <KpiCard icon={XCircle} label={t("rep.kpi.compliance")} value={`${avgChecklistPct(enPeriodo, checklists) ?? "—"}%`} sub={t("rep.kpi.complianceSub")} delay={225} />
      </div>

      <div className="two-col" style={{ marginBottom: 20 }}>
        <div className="card animate-fadeUp" style={{ marginTop: 0, overflow: "hidden" }}>
          <h3 className="h3" style={{ marginBottom: 14 }}>{t("rep.chart.hours")}</h3>
          {porCliente.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={porCliente.slice(0, 8).map((r) => ({ ...r, reales: +r.reales.toFixed(1), est: +r.est.toFixed(1) }))} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="cliente" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={32} unit="h" />
                <Tooltip {...tooltipStyle} cursor={{ fill: "var(--surface-3)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="est" name={t("common.estimated")} fill="var(--border)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="reales" name={t("common.real")} fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={BarChart3} title={t("rep.chart.empty")} body={t("rep.chart.emptyBody")} />}
        </div>
        <div className="card animate-fadeUp delay-75" style={{ marginTop: 0, overflow: "hidden" }}>
          <h3 className="h3" style={{ marginBottom: 14 }}>{t("rep.chart.trend")}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={tendencia.map((m) => ({ ...m, horas: +m.horas.toFixed(1) }))} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="l" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={32} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="l" type="monotone" dataKey="trabajos" name={t("common.jobs")} stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="l" type="monotone" dataKey="horas" name={t("rent.chart.hours")} stroke="var(--amber)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Segmented ariaLabel={t("common.view")} value={tab} onChange={setTab} options={[{ id: "clientes", label: t("rep.tab.clients", { n: porCliente.length }) }, { id: "personas", label: t("rep.tab.people", { n: porPersona.length }) }, { id: "trabajos", label: t("rep.tab.jobs", { n: detalle.length }) }]} />
      </div>

      <div className="table-wrap animate-fadeIn">
        {tab === "clientes" && (
          <table className="data-table">
            <thead><tr><th>{t("common.client")}</th><th className="num">{t("common.jobs")}</th><th className="num">{t("common.real")}</th><th className="num">{t("common.estimated")}</th><th className="num">{t("common.deviation")}</th><th className="num">{t("common.checklist")}</th><th>{t("common.rating")}</th></tr></thead>
            <tbody>{porCliente.map((r) => (
              <tr key={r.id}><td style={{ fontWeight: 600, color: C.ink }}>{r.cliente}</td><td className="num">{r.finalizados}/{r.trabajos}</td><td className="num">{hoursLabel(r.reales)}</td><td className="num">{r.est ? hoursLabel(r.est) : "—"}</td><td className="num"><Desvio v={r.desvio} /></td><td className="num">{r.cumplimiento ?? "—"}%</td><td><StarRating value={r.rating} empty="—" /></td></tr>
            ))}{porCliente.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", color: C.muted, padding: 30 }}>{t("rep.noData")}</td></tr>}</tbody>
          </table>
        )}
        {tab === "personas" && (
          <table className="data-table">
            <thead><tr><th>{t("common.person")}</th><th className="num">{t("common.jobs")}</th><th className="num">{t("rent.chart.hours")}</th><th className="num">{t("common.estimated")}</th><th className="num">{t("common.deviation")}</th><th className="num">{t("common.checklist")}</th><th>{t("common.rating")}</th></tr></thead>
            <tbody>{porPersona.map((r) => (
              <tr key={r.id}><td style={{ fontWeight: 600, color: C.ink }}>{r.persona}</td><td className="num">{r.finalizados}/{r.trabajos}</td><td className="num">{hoursLabel(r.horas)}</td><td className="num">{r.est ? hoursLabel(r.est) : "—"}</td><td className="num"><Desvio v={r.desvio} /></td><td className="num">{r.cumplimiento ?? "—"}%</td><td><StarRating value={r.rating} empty="—" /></td></tr>
            ))}{porPersona.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", color: C.muted, padding: 30 }}>{t("rep.noData")}</td></tr>}</tbody>
          </table>
        )}
        {tab === "trabajos" && (
          <table className="data-table">
            <thead><tr><th>{t("common.date")}</th><th>{t("common.client")}</th><th>{t("rep.csv.staff")}</th><th>{t("common.status")}</th><th className="num">{t("common.real")}</th><th className="num">{t("rep.th.est")}</th><th className="num">{t("common.deviation")}</th><th className="num">{t("common.checklist")}</th></tr></thead>
            <tbody>{detalle.map((r) => (
              <tr key={r.id}><td className="tabular" style={{ whiteSpace: "nowrap" }}>{formatFecha(r.fecha, lang)} {r.hora}</td><td style={{ fontWeight: 600, color: C.ink }}>{r.cliente}</td><td style={{ fontSize: 12, color: C.muted }}>{r.personal || "—"}</td><td><StatusBadge estado={r.estado} size="sm" /></td><td className="num">{r.reales ? hoursLabel(r.reales) : "—"}</td><td className="num">{r.est ? hoursLabel(r.est) : "—"}</td><td className="num"><Desvio v={r.desvio} /></td><td className="num">{r.checklist}%</td></tr>
            ))}{detalle.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", color: C.muted, padding: 30 }}>{t("rep.noJobs")}</td></tr>}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
