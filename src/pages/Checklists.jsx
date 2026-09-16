// Plantillas de checklist editables por administración sin ayuda técnica (spec §3.4).
// El original se carga en español; las pestañas EN / IS cargan la traducción que ve el personal.
import { useEffect, useState } from "react";
import { Plus, Trash2, X, ArrowUp, ArrowDown, ClipboardCheck, Copy, Languages } from "lucide-react";
import { C, EmptyState, PageHeader, Segmented, useConfirm, FONT_MONO } from "../components/ui.jsx";
import { run } from "../lib/toast";
import { mapTareas, translationCoverage, SOURCE_LANG } from "../lib/checklist";
import { useT, LANGS } from "../i18n/index.jsx";
import * as api from "../data/api";

const snapshot = (c) => ({ nombre: c.nombre, tareas: [...(c.tareas || [])], traducciones: JSON.parse(JSON.stringify(c.traducciones || {})) });

export default function ChecklistsPage({ checklists, clients, servicios, patch }) {
  const { t } = useT();
  const [activeId, setActiveId] = useState(checklists[0]?.id || "");
  const [draft, setDraft] = useState(null); // copia editable de la plantilla activa
  const [editLang, setEditLang] = useState(SOURCE_LANG); // qué idioma se está editando
  const [newTask, setNewTask] = useState("");
  const [confirm, confirmDialog] = useConfirm();
  const active = checklists.find((c) => c.id === activeId);
  const translating = editLang !== SOURCE_LANG;
  const tr = draft?.traducciones?.[editLang] || { nombre: "", tareas: [] };

  useEffect(() => { setDraft(active ? snapshot(active) : null); }, [activeId, active?.nombre, active?.tareas?.length, active?.traducciones]);

  async function persist(next) {
    const row = { nombre: draft.nombre, tareas: draft.tareas, traducciones: draft.traducciones, ...next };
    const ok = await run(() => api.updateChecklist(activeId, row));
    if (ok) patch("checklists", { id: activeId, ...row });
    return ok;
  }
  // Cambios en la lista de tareas: siempre sobre el original, manteniendo alineadas las traducciones.
  async function applyList(fn) {
    const next = mapTareas(draft, fn);
    setDraft({ ...draft, ...next });
    await persist(next);
  }

  async function addTask() {
    const v = newTask.trim();
    if (!v || !draft) return;
    setNewTask("");
    await applyList((arr, isTr) => [...arr, isTr ? "" : v]);
  }
  const removeTask = (i) => applyList((arr) => arr.filter((_, idx) => idx !== i));
  async function move(i, dir) {
    const j = i + dir; if (j < 0 || j >= draft.tareas.length) return;
    await applyList((arr) => { const a = [...arr]; [a[i], a[j]] = [a[j], a[i]]; return a; });
  }
  async function commitTask(i) {
    const v = draft.tareas[i].trim();
    if (v === active.tareas[i]) return;
    if (!v) { await removeTask(i); return; }
    await persist({ tareas: draft.tareas.map((x, idx) => (idx === i ? v : x)) });
  }
  async function commitName() {
    const v = draft.nombre.trim() || active.nombre;
    if (v !== active.nombre) await persist({ nombre: v });
  }

  // Traducciones: se editan aparte y no tocan el original.
  function setTr(next) {
    setDraft({ ...draft, traducciones: { ...draft.traducciones, [editLang]: { ...tr, ...next } } });
  }
  async function commitTr() {
    const cur = JSON.stringify(draft.traducciones);
    if (cur === JSON.stringify(active.traducciones || {})) return;
    await persist({ traducciones: draft.traducciones });
  }

  async function create() {
    const row = await run(() => api.insertChecklist({ nombre: t("chk.newName"), tareas: [], traducciones: {} }), { ok: t("chk.created") });
    if (row) { patch("checklists", row); setActiveId(row.id); }
  }
  async function duplicate() {
    const row = await run(() => api.insertChecklist({ nombre: `${active.nombre} ${t("chk.copySuffix")}`, tareas: [...active.tareas], traducciones: active.traducciones || {} }), { ok: t("chk.duplicated") });
    if (row) { patch("checklists", row); setActiveId(row.id); }
  }
  async function remove() {
    const usos = servicios.filter((s) => s.checklist_id === activeId).length + clients.filter((c) => c.checklistId === activeId).length;
    if (!(await confirm({ title: t("chk.deleteTitle", { name: active.nombre }), danger: true, confirmLabel: t("common.delete"), body: usos ? t("chk.deleteBodyUses", { n: usos }) : t("chk.deleteBody") }))) return;
    if (await run(() => api.deleteChecklist(activeId), { ok: t("chk.deleted") })) {
      patch("checklists", active, true);
      setActiveId(checklists.find((c) => c.id !== activeId)?.id || "");
    }
  }

  const langOptions = LANGS.map((l) => {
    if (l.id === SOURCE_LANG) return { id: l.id, label: t("chk.langSource") };
    const cov = translationCoverage(draft, l.id);
    return { id: l.id, label: `${l.short} ${cov.done}/${cov.total}` };
  });
  const langName = LANGS.find((l) => l.id === editLang)?.label;

  return (
    <div>
      <PageHeader title={t("chk.title")} subtitle={t("chk.subtitle")}
        action={<button className="btn-primary" onClick={create}><Plus size={15} /> {t("chk.new")}</button>} />

      <div className="checklists-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {checklists.length === 0 && <EmptyState icon={ClipboardCheck} title={t("chk.empty")} body={t("chk.emptyBody")} />}
          {checklists.map((ck) => {
            const on = activeId === ck.id;
            return (
              <button key={ck.id} onClick={() => setActiveId(ck.id)} aria-current={on} style={{ padding: "12px 14px", borderRadius: 14, cursor: "pointer", textAlign: "left", background: on ? C.primary : C.surface, color: on ? C.onPrimary : C.ink, border: `1.5px solid ${on ? C.primary : C.border}`, fontFamily: "'Inter',sans-serif", boxShadow: on ? `0 4px 16px ${C.glow}` : "none", minHeight: 44 }}>
                <p style={{ fontWeight: 700, fontSize: 13 }}>{ck.nombre}</p>
                <p style={{ fontSize: 11, marginTop: 3, opacity: .7 }}>{t("chk.meta", { n: ck.tareas.length, u: servicios.filter((s) => s.checklist_id === ck.id).length + clients.filter((c) => c.checklistId === ck.id).length })}</p>
              </button>
            );
          })}
        </div>

        {active && draft ? (
          <div className="card animate-fadeIn" style={{ marginTop: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
              {translating ? (
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>{draft.nombre}</p>
                  <input className="input-base" value={tr.nombre || ""} placeholder={t("chk.trNamePh", { lang: langName })} onChange={(e) => setTr({ nombre: e.target.value })} onBlur={commitTr} aria-label={t("chk.nameAria")}
                    style={{ fontSize: 18, fontWeight: 700, border: "none", padding: "4px 0", background: "transparent", color: C.ink, width: "100%", fontFamily: "'Space Grotesk',sans-serif" }} />
                </div>
              ) : (
                <input className="input-base" value={draft.nombre} onChange={(e) => setDraft({ ...draft, nombre: e.target.value })} onBlur={commitName} aria-label={t("chk.nameAria")}
                  style={{ fontSize: 18, fontWeight: 700, border: "none", padding: "4px 0", background: "transparent", color: C.ink, flex: 1, minWidth: 200, fontFamily: "'Space Grotesk',sans-serif" }} />
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button className="btn-ghost btn-sm" onClick={duplicate}><Copy size={13} /> {t("chk.duplicate")}</button>
                <button className="btn-ghost btn-sm" style={{ color: C.danger, borderColor: C.dangerBorder }} onClick={remove} aria-label={t("chk.deleteAria")}><Trash2 size={14} /></button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <Languages size={14} color={C.muted} />
              <Segmented value={editLang} onChange={setEditLang} options={langOptions} ariaLabel={t("chk.langEdit")} />
              <p style={{ fontSize: 11.5, color: C.muted, flex: "1 1 240px" }}>{t("chk.trHint")}</p>
            </div>

            <ol style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none" }}>
              {draft.tareas.map((task, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px 8px 14px", borderRadius: 12, border: `1.5px solid ${C.borderSubtle}`, background: C.surface2 }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: C.pale, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_MONO, fontSize: 11, fontWeight: 500 }}>{i + 1}</span>
                  {translating ? (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.3 }}>{task}</p>
                      <input aria-label={t("chk.taskAria", { n: i + 1 })} placeholder={t("chk.trTaskPh")} style={{ width: "100%", fontSize: 13, color: C.ink, border: "none", background: "transparent", minHeight: 28 }}
                        value={tr.tareas?.[i] || ""}
                        onChange={(e) => { const a = draft.tareas.map((_, idx) => tr.tareas?.[idx] || ""); a[i] = e.target.value; setTr({ tareas: a }); }}
                        onBlur={commitTr} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
                    </div>
                  ) : (
                    <>
                      <input aria-label={t("chk.taskAria", { n: i + 1 })} style={{ flex: 1, fontSize: 13, color: C.ink, border: "none", background: "transparent", minHeight: 32, minWidth: 0 }} value={task}
                        onChange={(e) => setDraft({ ...draft, tareas: draft.tareas.map((x, idx) => (idx === i ? e.target.value : x)) })}
                        onBlur={() => commitTask(i)} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
                      <button className="icon-btn" aria-label={t("chk.up")} onClick={() => move(i, -1)} disabled={i === 0} style={{ width: 30, height: 30 }}><ArrowUp size={13} /></button>
                      <button className="icon-btn" aria-label={t("chk.down")} onClick={() => move(i, 1)} disabled={i === draft.tareas.length - 1} style={{ width: 30, height: 30 }}><ArrowDown size={13} /></button>
                      <button className="icon-btn danger" aria-label={t("chk.removeTask")} onClick={() => removeTask(i)} style={{ width: 30, height: 30 }}><X size={14} /></button>
                    </>
                  )}
                </li>
              ))}
              {draft.tareas.length === 0 && <p style={{ fontSize: 12.5, color: C.muted, padding: "8px 0" }}>{t("chk.noTasks")}</p>}
            </ol>

            {translating ? (
              <p style={{ fontSize: 11.5, color: C.muted, marginTop: 12 }}>{t("chk.trAddHint")}</p>
            ) : (
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <input className="input-base" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder={t("chk.newTaskPh")} onKeyDown={(e) => e.key === "Enter" && addTask()} style={{ flex: 1 }} aria-label={t("chk.newTaskAria")} />
                <button className="btn-primary" onClick={addTask} disabled={!newTask.trim()}><Plus size={15} /> {t("common.add")}</button>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ marginTop: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, minHeight: 200 }}>{t("chk.select")}</div>
        )}
      </div>
      {confirmDialog}
    </div>
  );
}
