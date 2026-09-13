import { useMemo, useState } from "react";
import {
  Plus, Search, Pencil, Trash2, Activity, FileText, MapPin, ImageIcon, History, Link2, Copy, Ban,
  ShieldOff, Briefcase, Building2, ExternalLink,
} from "lucide-react";
import {
  Avatar, C, EmptyState, Modal, PageHeader, Pill, Segmented, StarRating, StatusBadge, PhotoLink, SignedImg, useConfirm, Banner,
} from "../components/ui.jsx";
import ClientForm, { emptyClient, clientTipoLabel } from "../components/ClientForm.jsx";
import ServicioForm from "../components/ServicioForm.jsx";
import { FrequencyBadge, frecuenciaLabel } from "../components/FrequencyField.jsx";
import { tipoFotoLabel } from "../components/PhotosField.jsx";
import { useT } from "../i18n/index.jsx";
import { formatFecha } from "../lib/dates";
import { hoursLabel, minutesLabel, money } from "../lib/format";
import { avgRating, jobHoras, jobsForClient, tasaFinalizados } from "../lib/stats";
import { run, toast } from "../lib/toast";
import * as api from "../data/api";

export default function ClientsPage({ clients, staff, jobs, checklists, servicios, registros, portalTokens, patch }) {
  const { t, lang } = useT();
  const [query, setQuery] = useState("");
  const [view, setView] = useState("cards");
  const [estado, setEstado] = useState("activo");
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return clients
      .filter((c) => estado === "todos" || c.estado === estado)
      .filter((c) => !q || c.nombre.toLowerCase().includes(q) || (c.rubro || "").toLowerCase().includes(q) || (c.ubicaciones || []).some((u) => (u.direccion || "").toLowerCase().includes(q)))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [clients, query, estado]);

  async function saveClient(form) {
    setSaving(true);
    const saved = await run(() => api.upsertClient(form), { ok: modal.mode === "new" ? t("cli.created") : t("cli.updated") });
    setSaving(false);
    if (saved) { patch("clients", saved); setModal({ mode: "view", client: saved }); }
  }

  async function deleteClient(c) {
    const cJobs = jobsForClient(jobs, c.id);
    const ok = await confirm({
      title: t("cli.deleteTitle", { name: c.nombre }), danger: true, confirmLabel: t("common.delete"),
      body: cJobs.length ? t("cli.deleteBodyJobs", { n: cJobs.length }) : t("cli.deleteBody"),
    });
    if (!ok) return;
    if (await run(() => api.deleteClient(c.id), { ok: t("cli.deleted") })) { patch("clients", c, true); setModal(null); }
  }

  return (
    <div>
      <PageHeader title={t("cli.title")} subtitle={t("cli.subtitle", { a: clients.filter((c) => c.estado === "activo").length, n: clients.length })}
        action={<button className="btn-primary" onClick={() => setModal({ mode: "new", client: emptyClient() })}><Plus size={15} /> {t("cli.new")}</button>} />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }} className="animate-fadeUp">
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 320 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          <input className="input-base" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("cli.searchPh")} style={{ paddingLeft: 36 }} aria-label={t("cli.searchAria")} />
        </div>
        <Segmented ariaLabel={t("common.status")} value={estado} onChange={setEstado} options={[{ id: "activo", label: t("common.active") }, { id: "inactivo", label: t("common.inactive") }, { id: "todos", label: t("common.all") }]} />
        <Segmented ariaLabel={t("common.view")} value={view} onChange={setView} options={[{ id: "cards", icon: Activity, label: "" }, { id: "table", icon: FileText, label: "" }]} />
      </div>

      {filtered.length === 0 && <EmptyState icon={Building2} title={t("cli.empty")} body={query ? t("cli.emptySearch") : t("cli.emptyBody")} />}

      {view === "cards" && filtered.length > 0 && (
        <div className="clients-grid">
          {filtered.map((c, i) => {
            const cJobs = jobsForClient(jobs, c.id);
            const svc = servicios.filter((s) => s.cliente_id === c.id && s.activo);
            return (
              <div key={c.id} className="card animate-fadeUp" style={{ animationDelay: `${i * 40}ms`, cursor: "pointer", marginTop: 0 }} onClick={() => setModal({ mode: "view", client: c })}
                role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setModal({ mode: "view", client: c })}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <Avatar name={c.nombre} size={44} />
                  <div style={{ display: "flex", gap: 2 }} onClick={(e) => e.stopPropagation()}>
                    <button className="icon-btn" aria-label={t("common.edit")} onClick={() => setModal({ mode: "edit", client: c })}><Pencil size={14} /></button>
                    <button className="icon-btn danger" aria-label={t("common.delete")} onClick={() => deleteClient(c)}><Trash2 size={14} /></button>
                  </div>
                </div>
                <p style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{c.nombre}</p>
                <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{[clientTipoLabel(c.tipo, t), c.rubro].filter(Boolean).join(" · ")}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <StarRating value={avgRating(cJobs)} empty={t("common.noRatings")} />
                  <span style={{ fontSize: 11, color: C.muted2 }}>·</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{t("cli.visits", { n: cJobs.length })}</span>
                </div>
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <StatusBadge estado={c.estado} size="sm" />
                  {!c.formal && <Pill tone="amber">{t("cli.noContract")}</Pill>}
                  {svc.slice(0, 2).map((s) => <FrequencyBadge key={s.id} frecuencia={s.frecuencia} />)}
                  {svc.length === 0 && <Pill tone="neutral">{t("cli.noService")}</Pill>}
                </div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.borderSubtle}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><MapPin size={10} style={{ display: "inline", marginRight: 3 }} />{c.ubicaciones?.[0]?.direccion || t("cli.noAddress")}{c.ubicaciones?.length > 1 ? ` +${c.ubicaciones.length - 1}` : ""}</span>
                  <span className="tabular" style={{ fontSize: 11, color: C.primary, fontWeight: 600, flexShrink: 0 }}>
                    {svc.length ? money(svc.filter((s) => s.tipo_monto === "mensual").reduce((a, s) => a + Number(s.monto_acordado || 0), 0), svc[0].moneda, lang) + t("common.perMonth") : c.m2 ? `${c.m2} m²` : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "table" && filtered.length > 0 && (
        <div className="table-wrap animate-fadeIn">
          <table className="data-table">
            <thead><tr><th>{t("common.client")}</th><th>{t("cli.th.services")}</th><th className="num">{t("cli.th.monthly")}</th><th>{t("common.rating")}</th><th>{t("common.status")}</th><th></th></tr></thead>
            <tbody>
              {filtered.map((c) => {
                const svc = servicios.filter((s) => s.cliente_id === c.id && s.activo);
                return (
                  <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => setModal({ mode: "view", client: c })}>
                    <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar name={c.nombre} size={32} /><div><p style={{ fontWeight: 600, fontSize: 13, color: C.ink }}>{c.nombre}</p><p style={{ fontSize: 11, color: C.muted }}>{c.rubro}</p></div></div></td>
                    <td style={{ fontSize: 12, color: C.muted }}>{svc.map((s) => frecuenciaLabel(s.frecuencia, t)).join(" · ") || "—"}</td>
                    <td className="num" style={{ fontSize: 12.5, color: C.ink }}>{svc.length ? money(svc.filter((s) => s.tipo_monto === "mensual").reduce((a, s) => a + Number(s.monto_acordado || 0), 0), svc[0].moneda, lang) : "—"}</td>
                    <td><StarRating value={avgRating(jobsForClient(jobs, c.id))} empty="—" /></td>
                    <td><StatusBadge estado={c.estado} size="sm" /></td>
                    <td><div style={{ display: "flex", justifyContent: "flex-end", gap: 2 }} onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn" aria-label={t("common.edit")} onClick={() => setModal({ mode: "edit", client: c })}><Pencil size={14} /></button>
                      <button className="icon-btn danger" aria-label={t("common.delete")} onClick={() => deleteClient(c)}><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal?.mode === "view" && (
        <ClientDetailModal client={clients.find((c) => c.id === modal.client.id) || modal.client} jobs={jobs} staff={staff} checklists={checklists}
          servicios={servicios} registros={registros} portalTokens={portalTokens} patch={patch}
          onClose={() => setModal(null)} onEdit={() => setModal({ mode: "edit", client: modal.client })} onDelete={() => deleteClient(modal.client)} />
      )}
      {(modal?.mode === "new" || modal?.mode === "edit") && (
        <Modal title={modal.mode === "new" ? t("cli.new") : t("cli.editTitle", { name: modal.client.nombre })} onClose={() => setModal(null)} wide gradient>
          <ClientForm initial={modal.client} onSave={saveClient} onCancel={() => setModal(modal.mode === "edit" ? { mode: "view", client: modal.client } : null)} checklists={checklists} saving={saving} />
        </Modal>
      )}
      {confirmDialog}
    </div>
  );
}

/* ================================================================ Detalle */
function ClientDetailModal({ client, onClose, onEdit, onDelete, jobs, staff, checklists, servicios, registros, portalTokens, patch }) {
  const { t, lang } = useT();
  const [tab, setTab] = useState("ficha");
  const [svcModal, setSvcModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  const cJobs = useMemo(() => jobsForClient(jobs, client.id).sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora)), [jobs, client.id]);
  const svc = servicios.filter((s) => s.cliente_id === client.id);
  const tokens = portalTokens.filter((t) => t.cliente_id === client.id && t.activo);
  const ubicaciones = Array.isArray(client.ubicaciones) ? client.ubicaciones : [];
  const horasTotales = cJobs.reduce((s, j) => s + jobHoras(j, registros), 0);

  async function saveServicio(form) {
    setSaving(true);
    const saved = await run(() => api.upsertServicio({ ...form, id: svcModal.item?.id }), { ok: t("cli.svcSaved") });
    setSaving(false);
    if (saved) { patch("servicios_contratados", saved); setSvcModal(null); }
  }
  async function deleteServicio(s) {
    if (!(await confirm({ title: t("cli.svcDeleteTitle"), body: t("cli.svcDeleteBody"), danger: true, confirmLabel: t("common.delete") }))) return;
    if (await run(() => api.deleteServicio(s.id), { ok: t("cli.svcDeleted") })) patch("servicios_contratados", s, true);
  }
  async function crearToken() {
    const t = await run(() => api.createPortalToken(client.id), { ok: t("cli.linkCreated") });
    if (t) patch("portal_tokens", t);
  }
  async function revocar(t) {
    if (await run(() => api.revokePortalToken(t.token), { ok: t("cli.linkDisabled") })) patch("portal_tokens", { ...t, activo: false });
  }
  function copiar(t) {
    const link = `${window.location.origin}/?portal=${t.token}`;
    navigator.clipboard?.writeText(link).then(() => toast(t("cli.linkCopied"))).catch(() => toast(link, "info"));
  }
  async function anonimizar() {
    const ok = await confirm({
      title: t("cli.anonTitle"), danger: true, confirmLabel: t("cli.anonBtn"),
      body: t("cli.anonBody"),
    });
    if (!ok) return;
    if (await run(() => api.anonimizarCliente(client.id), { ok: t("cli.anonDone") })) onClose();
  }

  const rows = [
    [t("cli.f.tipo"), clientTipoLabel(client.tipo, t)], [t("cli.f.rubro"), client.rubro], [t("cli.f.servicio"), client.servicio],
    [t("cli.f.kennitala"), client.kennitala], [t("cli.f.m2"), client.m2 ? `${client.m2} m²` : null], [t("cli.f.email"), client.email], [t("cli.f.phone"), client.telefono],
    [t("cli.f.contact"), client.contactoHabitual], [t("cli.f.emergency"), client.contactoEmergencia], [t("cli.f.access"), client.acceso],
    [t("cli.f.products"), client.productos], [t("cli.f.discretion"), client.discrecion], [t("cli.f.wifi"), client.wifi],
    [t("cli.f.checklist"), checklists.find((c) => c.id === client.checklistId)?.nombre], [t("cli.f.notes"), client.notas],
  ];

  return (
    <Modal title={client.nombre} subtitle={ubicaciones[0]?.direccion} onClose={onClose} wide gradient
      footer={<>
        <button className="btn-ghost" style={{ color: C.danger, marginRight: "auto" }} onClick={anonimizar}><ShieldOff size={14} /> {t("cli.anon")}</button>
        <button className="btn-ghost" style={{ color: C.danger }} onClick={onDelete}><Trash2 size={14} /> {t("common.delete")}</button>
        <button className="btn-primary" onClick={onEdit}><Pencil size={14} /> {t("common.edit")}</button>
      </>}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
        <Avatar name={client.nombre} size={48} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
            <StatusBadge estado={client.estado} />
            {!client.formal && <Pill tone="amber">{t("cli.noContractFormal")}</Pill>}
            {svc.filter((s) => s.activo).map((s) => <FrequencyBadge key={s.id} frecuencia={s.frecuencia} />)}
          </div>
          <StarRating value={avgRating(cJobs)} empty={t("common.noRatings")} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
        {[[t("cli.stat.visits"), cJobs.length], [t("cli.stat.finished"), `${tasaFinalizados(cJobs) ?? "—"}%`], [t("cli.stat.hours"), hoursLabel(horasTotales)], [t("cli.stat.incidents"), cJobs.filter((j) => j.incidente).length]].map(([l, v]) => (
          <div key={l} style={{ background: C.pale, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
            <p className="tabular" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 16, fontWeight: 600, color: C.primary }}>{v}</p>
            <p style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{l}</p>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <Segmented ariaLabel={t("common.view")} value={tab} onChange={setTab} options={[
          { id: "ficha", label: t("cli.tab.profile") }, { id: "servicios", label: t("cli.tab.services", { n: svc.length }), icon: Briefcase },
          { id: "historial", label: t("cli.tab.history", { n: cJobs.length }), icon: History }, { id: "portal", label: t("cli.tab.portal"), icon: Link2 },
        ]} />
      </div>

      {tab === "ficha" && (
        <div>
          <dl className="dl" style={{ marginBottom: 20 }}>
            {rows.filter(([, v]) => v).map(([l, v]) => <div key={l}><dt>{l}</dt><dd>{v}</dd></div>)}
          </dl>
          <h4 className="section-title"><MapPin size={14} /> {t("cli.locations", { n: ubicaciones.length })}</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {ubicaciones.map((u, i) => (
              <div key={u.id || i} style={{ padding: "10px 12px", borderRadius: 10, background: C.surface2, border: `1px solid ${C.borderSubtle}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{u.direccion || t("cli.location", { n: i + 1 })}</p>
                  {u.mapsLink && <a href={u.mapsLink} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm"><ExternalLink size={12} /> Maps</a>}
                </div>
                <dl className="dl" style={{ marginTop: 8, gap: "6px 16px" }}>
                  {u.contacto && <div><dt>{t("cli.loc.contact")}</dt><dd>{u.contacto}</dd></div>}
                  {u.acceso && <div><dt>{t("cli.loc.access")}</dt><dd>{u.acceso}</dd></div>}
                  {u.notas && <div style={{ gridColumn: "1 / -1" }}><dt>{t("cli.f.notes")}</dt><dd>{u.notas}</dd></div>}
                </dl>
              </div>
            ))}
          </div>
          {client.fotosReferencia?.length > 0 && (
            <div>
              <h4 className="section-title"><ImageIcon size={14} /> {t("cli.refPhotos")}</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 8 }}>
                {client.fotosReferencia.map((f, i) => (
                  <PhotoLink key={i} bucket="client-photos" path={f.path || f.url}>
                    <SignedImg bucket="client-photos" path={f.path || f.url} alt={f.descripcion || tipoFotoLabel(f.tipo, t)} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}` }} />
                    <span style={{ position: "absolute", bottom: 3, left: 3, right: 3, fontSize: 9, fontWeight: 700, color: "#fff", background: "rgba(10,31,26,.7)", borderRadius: 5, padding: "1px 5px", textAlign: "center" }}>{tipoFotoLabel(f.tipo, t)}</span>
                  </PhotoLink>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "servicios" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
            <p style={{ fontSize: 12.5, color: C.muted }}>{t("cli.svcIntro")}</p>
            <button className="btn-primary btn-sm" onClick={() => setSvcModal({ item: null })}><Plus size={13} /> {t("cli.newService")}</button>
          </div>
          {svc.length === 0 && <EmptyState icon={Briefcase} title={t("cli.svcEmpty")} body={t("cli.svcEmptyBody")} />}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {svc.map((s) => {
              const u = ubicaciones.find((x) => x.id === s.ubicacion_id);
              return (
                <div key={s.id} style={{ padding: "12px 14px", borderRadius: 12, background: C.surface2, border: `1px solid ${s.activo ? C.borderSubtle : C.border}`, opacity: s.activo ? 1 : .6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>{s.tipo_servicio}</p>
                      <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{u?.direccion || t("cli.allLocations")} · {s.hora}</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                        <FrequencyBadge frecuencia={s.frecuencia} />
                        <Pill tone="neutral">{minutesLabel(s.duracion_estimada_min)} × {s.personas_previstas} {t("cli.pers")}</Pill>
                        <Pill tone="success">{money(s.monto_acordado, s.moneda, lang)} {s.tipo_monto === "mensual" ? t("common.perMonth") : t("common.perJob")}</Pill>
                        {!s.activo && <Pill tone="neutral">{t("estado.inactivo")}</Pill>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                      <button className="icon-btn" aria-label={t("cli.svcEdit")} onClick={() => setSvcModal({ item: s })}><Pencil size={14} /></button>
                      <button className="icon-btn danger" aria-label={t("common.delete")} onClick={() => deleteServicio(s)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {s.notas && <p style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>{s.notas}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "historial" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflowY: "auto" }}>
          {cJobs.length === 0 && <EmptyState icon={History} title={t("cli.historyEmpty")} />}
          {cJobs.map((job) => {
            const emps = (job.empleados || []).map((eid) => staff.find((s) => s.id === eid)).filter(Boolean);
            const hrs = jobHoras(job, registros);
            return (
              <div key={job.id} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "9px 12px", borderRadius: 10, background: C.surface2, border: `1px solid ${C.borderSubtle}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{formatFecha(job.fecha, lang)} · {job.hora}{hrs > 0 ? ` · ${hoursLabel(hrs)}` : ""}</span>
                  <StatusBadge estado={job.estado} size="sm" />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 11, color: C.muted }}>{emps.map((e) => e.nombre).join(", ") || t("common.unassigned")}</span>
                  <StarRating value={job.rating ?? null} empty="—" />
                </div>
                {job.comentario && <p style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>"{job.comentario}"</p>}
                {job.motivo_no_realizado && <p style={{ fontSize: 11, color: C.dangerInk, fontWeight: 500 }}>{t("cli.notDonePrefix")}: {job.motivo_no_realizado}</p>}
                {job.incidente && <p style={{ fontSize: 11, color: C.dangerInk, fontWeight: 500 }}>{t("cli.incidentPrefix")}: {job.incidente.texto}</p>}
              </div>
            );
          })}
        </div>
      )}

      {tab === "portal" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Banner tone="info" icon={Link2}>{t("cli.portalBanner")}</Banner>
          {tokens.length === 0 && <p style={{ fontSize: 12.5, color: C.muted }}>{t("cli.portalNone")}</p>}
          {tokens.map((tk) => (
            <div key={tk.token} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: C.surface2, border: `1px solid ${C.borderSubtle}` }}>
              <code style={{ flex: 1, fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>…?portal={tk.token.slice(0, 10)}…</code>
              <span style={{ fontSize: 11, color: C.muted2 }}>{formatFecha(tk.created_at?.slice(0, 10), lang)}</span>
              <button className="btn-ghost btn-sm" onClick={() => copiar(tk)}><Copy size={12} /> {t("cli.copy")}</button>
              <button className="btn-ghost btn-sm" style={{ color: C.danger }} onClick={() => revocar(tk)}><Ban size={12} /> {t("cli.deactivate")}</button>
            </div>
          ))}
          <button className="btn-primary btn-sm" style={{ alignSelf: "flex-start" }} onClick={crearToken}><Plus size={13} /> {t("cli.newLink")}</button>
        </div>
      )}

      {svcModal && (
        <Modal title={svcModal.item ? t("cli.svcEdit") : t("cli.svcNew")} subtitle={client.nombre} onClose={() => setSvcModal(null)} wide>
          <ServicioForm client={client} initial={svcModal.item || {}} checklists={checklists} onSave={saveServicio} onCancel={() => setSvcModal(null)} saving={saving} />
        </Modal>
      )}
      {confirmDialog}
    </Modal>
  );
}
