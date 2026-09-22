// Vehículos y maquinaria: alta simple y a quién se le asignó hoy.
// No es inventario ni stock (fuera de alcance): es saber qué se llevó cada trabajo.
import { useState } from "react";
import { Plus, Truck, Wrench, Trash2, Pencil } from "lucide-react";
import { C, EmptyState, Field, Modal, PageHeader, Pill, Segmented, Toggle, useConfirm } from "../components/ui.jsx";
import { useT } from "../i18n/index.jsx";
import { formatFecha, todayISO } from "../lib/dates";
import { run } from "../lib/toast";
import * as api from "../data/api";

const TIPOS = ["vehiculo", "maquina"];
const empty = () => ({ nombre: "", tipo: "vehiculo", identificador: "", activo: true, notas: "" });

export default function ResourcesPage({ recursos, jobs, clients, patch }) {
  const { t, lang } = useT();
  const [filtro, setFiltro] = useState("todos");
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, confirmDialog] = useConfirm();
  const hoy = todayISO();

  const lista = recursos.filter((r) => filtro === "todos" || r.tipo === filtro);
  // Dónde está cada recurso hoy.
  const enUso = {};
  jobs.filter((j) => j.fecha === hoy && j.estado !== "no_realizado")
    .forEach((j) => (j.recursos || []).forEach((id) => { enUso[id] = j; }));

  async function guardar(form) {
    setSaving(true);
    const row = { ...form, nombre: form.nombre.trim(), identificador: form.identificador?.trim() || null };
    const saved = modal.item
      ? await run(() => api.updateRecurso(modal.item.id, row), { ok: t("res.saved") })
      : await run(() => api.insertRecurso(row), { ok: t("res.created") });
    setSaving(false);
    if (!saved) return;
    patch("recursos", modal.item ? { id: modal.item.id, ...row } : saved);
    setModal(null);
  }
  async function borrar(r) {
    const usos = jobs.filter((j) => (j.recursos || []).includes(r.id)).length;
    if (!(await confirm({ title: t("res.deleteTitle", { name: r.nombre }), danger: true, confirmLabel: t("common.delete"), body: usos ? t("res.deleteBodyUses", { n: usos }) : t("res.deleteBody") }))) return;
    if (await run(() => api.deleteRecurso(r.id), { ok: t("res.deleted") })) patch("recursos", r, true);
  }

  return (
    <div>
      <PageHeader title={t("res.title")} subtitle={t("res.subtitle")}
        action={<button className="btn-primary" onClick={() => setModal({ form: empty() })}><Plus size={15} /> {t("res.new")}</button>} />

      <Segmented value={filtro} onChange={setFiltro} ariaLabel={t("res.filter")} options={[
        { id: "todos", label: t("common.all") },
        { id: "vehiculo", label: t("res.tipo.vehiculo"), icon: Truck },
        { id: "maquina", label: t("res.tipo.maquina"), icon: Wrench },
      ]} />

      {lista.length === 0 ? (
        <EmptyState icon={Truck} title={t("res.empty")} body={t("res.emptyBody")} />
      ) : (
        <div className="cards-grid" style={{ marginTop: 16 }}>
          {lista.map((r) => {
            const job = enUso[r.id];
            const cliente = job && clients.find((c) => c.id === job.clienteId);
            const Icon = r.tipo === "vehiculo" ? Truck : Wrench;
            return (
              <div key={r.id} className="card" style={{ marginTop: 0, opacity: r.activo ? 1 : .6 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: C.pale, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={18} /></div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{r.nombre}</p>
                      <p style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{[t(`res.tipo.${r.tipo}`), r.identificador].filter(Boolean).join(" · ")}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2 }}>
                    <button className="icon-btn" aria-label={t("common.edit")} onClick={() => setModal({ item: r, form: { ...empty(), ...r } })}><Pencil size={14} /></button>
                    <button className="icon-btn danger" aria-label={t("common.delete")} onClick={() => borrar(r)}><Trash2 size={14} /></button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  {!r.activo && <Pill tone="neutral">{t("res.inactive")}</Pill>}
                  {job
                    ? <Pill tone="amber">{t("res.inUse", { cliente: cliente?.nombre || "?", hora: job.hora })}</Pill>
                    : r.activo ? <Pill tone="success">{t("res.free")}</Pill> : null}
                </div>
                {r.notas && <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{r.notas}</p>}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal.item ? t("res.edit") : t("res.new")} subtitle={formatFecha(hoy, lang)} onClose={() => setModal(null)}>
          <ResourceForm form={modal.form} setForm={(f) => setModal({ ...modal, form: f })} onSave={guardar} onCancel={() => setModal(null)} saving={saving} />
        </Modal>
      )}
      {confirmDialog}
    </div>
  );
}

function ResourceForm({ form, setForm, onSave, onCancel, saving }) {
  const { t } = useT();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (form.nombre.trim()) onSave(form); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="form-grid-2">
        <Field label={t("res.f.name")} required>
          <input required className="input-base" value={form.nombre} onChange={set("nombre")} placeholder={t("res.f.namePh")} autoFocus />
        </Field>
        <Field label={t("res.f.tipo")}>
          <select className="input-base" value={form.tipo} onChange={set("tipo")}>
            {TIPOS.map((x) => <option key={x} value={x}>{t(`res.tipo.${x}`)}</option>)}
          </select>
        </Field>
      </div>
      <Field label={t("res.f.id")} hint={t("res.f.idHint")}>
        <input className="input-base" value={form.identificador || ""} onChange={set("identificador")} />
      </Field>
      <Field label={t("common.notes")}>
        <textarea rows={2} className="input-base" value={form.notas || ""} onChange={set("notas")} style={{ resize: "vertical" }} />
      </Field>
      <Toggle checked={form.activo} onChange={(v) => setForm({ ...form, activo: v })} label={t("res.f.active")} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 10, borderTop: `1px solid ${C.borderSubtle}` }}>
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>{t("common.cancel")}</button>
        <button type="submit" className="btn-primary" disabled={saving || !form.nombre.trim()}>{saving ? t("common.saving") : t("common.save")}</button>
      </div>
    </form>
  );
}
