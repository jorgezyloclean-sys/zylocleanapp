// Panel de rentabilidad (comprometido con Jorge el 02/09/2026).
// Ingresos por cliente vs. horas reales: cada hora de más sobre el fijo mensual
// es margen perdido. No hay liquidación de sueldos (fuera de alcance).
import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Download, Wallet, Clock, TrendingDown, TrendingUp, Briefcase } from "lucide-react";
import { C, EmptyState, KpiCard, PageHeader, PeriodPicker, Pill, Banner } from "../components/ui.jsx";
import { useT } from "../i18n/index.jsx";
import { formatMes, periodPresets, todayISO } from "../lib/dates";
import { hoursLabel, money, num } from "../lib/format";
import { costoTotalPersonal, rentabilidadPorCliente, serieMensual } from "../lib/stats";
import { downloadFile, toCSV } from "../lib/csv";
import { toast } from "../lib/toast";

const tooltipStyle = { contentStyle: { borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink)", fontSize: 12 }, labelStyle: { color: "var(--ink)", fontWeight: 600 } };

export default function ProfitabilityPage({ clients, servicios, jobs, registros, staff = [] }) {
  const { t, lang } = useT();
  const [period, setPeriod] = useState(() => periodPresets().mes);
  const [costoHora, setCostoHora] = useState(() => { try { return Number(localStorage.getItem("zyloclean_costo_hora")) || ""; } catch { return ""; } });

  const rows = useMemo(() => rentabilidadPorCliente({ clients, servicios, jobs, registros, from: period.from, to: period.to }).sort((a, b) => b.ingresos - a.ingresos), [clients, servicios, jobs, registros, period]);
  const moneda = rows[0]?.moneda || servicios[0]?.moneda || "ISK";
  const tot = useMemo(() => ({
    ingresos: rows.reduce((s, r) => s + r.ingresos, 0), horas: rows.reduce((s, r) => s + r.horasReales, 0), est: rows.reduce((s, r) => s + r.horasEst, 0),
    trabajos: rows.reduce((s, r) => s + r.trabajos, 0),
  }), [rows]);
  const ingresoHora = tot.horas > 0 ? tot.ingresos / tot.horas : null;
  // Si el personal tiene costo por hora cargado, el costo real manda sobre el promedio a mano.
  const real = useMemo(() => costoTotalPersonal(staff, registros, jobs, period.from, period.to), [staff, registros, jobs, period]);
  const costo = Number(costoHora) || 0;
  const costoTotal = real ? real.total : (costo && tot.horas ? tot.horas * costo : null);
  const margen = costoTotal === null ? null : tot.ingresos - costoTotal;
  const serie = useMemo(() => serieMensual({ servicios, jobs, registros, meses: 6, hoy: todayISO() }).map((m) => ({ ...m, mes: formatMes(m.mes, lang).slice(0, 3), horas: +m.horas.toFixed(1) })), [servicios, jobs, registros, lang]);

  function saveCosto(v) { setCostoHora(v); try { localStorage.setItem("zyloclean_costo_hora", v); } catch { /* nada */ } }
  function exportCSV() {
    downloadFile(`rentabilidad_${period.from}_${period.to}.csv`, toCSV(rows, [
      { label: t("rep.csv.client"), value: (r) => r.cliente.nombre }, { label: t("rent.csv.income"), value: (r) => r.ingresos.toFixed(2) }, { label: t("rent.csv.currency"), value: "moneda" },
      { label: t("rep.csv.jobs"), value: "trabajos" }, { label: t("rep.csv.finished"), value: "finalizados" }, { label: t("rent.csv.notDone"), value: "noRealizados" },
      { label: t("rep.csv.realH"), value: (r) => r.horasReales.toFixed(2) }, { label: t("rep.csv.estH"), value: (r) => r.horasEst.toFixed(2) },
      { label: t("rep.csv.dev"), value: (r) => r.desvio === null ? "" : r.desvio.toFixed(2) }, { label: t("rent.csv.perHour"), value: (r) => r.ingresoPorHora === null ? "" : r.ingresoPorHora.toFixed(2) },
      ...(costo ? [{ label: t("rent.csv.margin"), value: (r) => (r.ingresos - r.horasReales * costo).toFixed(2) }] : []),
    ]));
    toast(t("common.csvDownloaded"));
  }

  return (
    <div>
      <PageHeader title={t("rent.title")} subtitle={t("rent.subtitle")}
        action={<button className="btn-ghost" onClick={exportCSV} disabled={!rows.length}><Download size={14} /> {t("common.exportCsv")}</button>} />
      <div className="reports-toolbar animate-fadeUp">
        <PeriodPicker value={period} onChange={setPeriod} />
        <label style={{ display: real ? "none" : "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.muted, marginLeft: "auto" }}>
          {t("rent.costLabel")}
          <input type="number" min={0} inputMode="decimal" className="input-base tabular" style={{ width: 120 }} value={costoHora} onChange={(e) => saveCosto(e.target.value)} placeholder={`${moneda}/h`} aria-label={t("rent.costLabel")} />
        </label>
      </div>

      {real?.sinTarifa?.length ? (
        <div style={{ marginBottom: 14 }}><Banner tone="info">{t("rent.noRateFor", { names: real.sinTarifa.join(", ") })}</Banner></div>
      ) : null}

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard icon={Wallet} label={t("rent.kpi.income")} value={money(tot.ingresos, moneda, lang)} sub={t("rent.kpi.incomeSub", { c: rows.length, j: tot.trabajos })} delay={0} />
        <KpiCard icon={Clock} label={t("rep.kpi.hours")} value={hoursLabel(tot.horas)} sub={tot.est ? t("rent.kpi.hoursSub", { d: `${tot.horas > tot.est ? "+" : ""}${num(tot.horas - tot.est, lang)}` }) : t("rent.kpi.noEst")} tone={tot.est && tot.horas > tot.est ? "var(--danger)" : C.primary} delay={75} />
        <KpiCard icon={TrendingUp} label={t("rent.kpi.perHour")} value={ingresoHora === null ? "—" : money(ingresoHora, moneda, lang)} sub={t("rent.kpi.perHourSub")} delay={150} />
        <KpiCard icon={margen !== null && margen < 0 ? TrendingDown : Briefcase} label={t("rent.kpi.margin")} value={margen === null ? "—" : money(margen, moneda, lang)} sub={margen === null ? t("rent.kpi.marginNoCost") : real ? t("rent.kpi.marginReal", { n: real.personas, c: money(costoTotal, moneda, lang) }) : t("rent.kpi.marginSub", { c: money(costo, moneda, lang) })} tone={margen !== null && margen < 0 ? "var(--danger)" : "var(--success)"} delay={225} />
      </div>

      <div className="two-col" style={{ marginBottom: 20 }}>
        <div className="card animate-fadeUp" style={{ marginTop: 0, overflow: "hidden" }}>
          <h3 className="h3" style={{ marginBottom: 14 }}>{t("rent.chart.perHour")}</h3>
          {rows.some((r) => r.ingresoPorHora !== null) ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={rows.filter((r) => r.ingresoPorHora !== null).slice(0, 8).map((r) => ({ cliente: r.cliente.nombre, v: Math.round(r.ingresoPorHora) }))} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="cliente" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={44} />
                <Tooltip {...tooltipStyle} cursor={{ fill: "var(--surface-3)" }} formatter={(v) => [money(v, moneda, lang), t("rent.chart.perHourTip")]} />
                <Bar dataKey="v" name={t("rent.th.perHour")} fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={Wallet} title={t("rent.chart.empty")} body={t("rent.chart.emptyBody")} />}
        </div>
        <div className="card animate-fadeUp delay-75" style={{ marginTop: 0, overflow: "hidden" }}>
          <h3 className="h3" style={{ marginBottom: 14 }}>{t("rent.chart.trend")}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={serie} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="i" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
              <YAxis yAxisId="h" orientation="right" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={32} unit="h" />
              <Tooltip {...tooltipStyle} cursor={{ fill: "var(--surface-3)" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="i" dataKey="ingresos" name={t("rent.chart.income", { m: moneda })} fill="var(--primary)" radius={[6, 6, 0, 0]} />
              <Bar yAxisId="h" dataKey="horas" name={t("rent.chart.hours")} fill="var(--amber)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="table-wrap animate-fadeIn">
        <table className="data-table">
          <thead><tr><th>{t("common.client")}</th><th className="num">{t("rent.th.income")}</th><th className="num">{t("common.jobs")}</th><th className="num">{t("rent.th.hours")}</th><th className="num">{t("common.deviation")}</th><th className="num">{t("rent.th.perHour")}</th>{costo ? <th className="num">{t("rent.th.margin")}</th> : null}</tr></thead>
          <tbody>
            {rows.map((r) => {
              const m = costo ? r.ingresos - r.horasReales * costo : null;
              return (
                <tr key={r.cliente.id}>
                  <td><span style={{ fontWeight: 600, color: C.ink }}>{r.cliente.nombre}</span>{r.noRealizados ? <Pill tone="danger">{t("rent.notDone", { n: r.noRealizados })}</Pill> : null}</td>
                  <td className="num" style={{ fontWeight: 600, color: C.ink }}>{money(r.ingresos, r.moneda, lang)}</td>
                  <td className="num">{r.finalizados}/{r.trabajos}</td>
                  <td className="num">{hoursLabel(r.horasReales)}{r.horasEst ? <span style={{ color: C.muted2 }}> / {hoursLabel(r.horasEst)}</span> : null}</td>
                  <td className="num" style={{ color: r.desvio > 0.05 ? C.dangerInk : r.desvio < -0.05 ? C.successInk : C.muted, fontWeight: 600 }}>{r.desvio === null ? "—" : `${r.desvio > 0 ? "+" : ""}${num(r.desvio, lang)} h`}</td>
                  <td className="num">{r.ingresoPorHora === null ? "—" : money(r.ingresoPorHora, r.moneda, lang)}</td>
                  {costo ? <td className="num" style={{ color: m < 0 ? C.dangerInk : C.successInk, fontWeight: 600 }}>{money(m, r.moneda, lang)}</td> : null}
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={costo ? 7 : 6} style={{ textAlign: "center", color: C.muted, padding: 30 }}>{t("rent.empty")}</td></tr>}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11.5, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
        {t("rent.footnote")}
      </p>
    </div>
  );
}
