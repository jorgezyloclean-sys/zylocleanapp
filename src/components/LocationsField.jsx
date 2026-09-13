// Ubicaciones del cliente con datos por ubicación (spec §3.1): dirección,
// contacto en sitio, indicaciones de acceso, notas (objetos delicados, mascotas…).
import { useState } from "react";
import { ChevronDown, MapPin, Plus, Trash2 } from "lucide-react";
import { C, Field } from "./ui.jsx";
import { newId } from "../lib/ids";
import { useT } from "../i18n/index.jsx";

const empty = () => ({ id: newId("u"), direccion: "", mapsLink: "", contacto: "", acceso: "", notas: "" });

export default function LocationsField({ value, onChange }) {
  const { t } = useT();
  const ubicaciones = value && value.length ? value : [empty()];
  const [open, setOpen] = useState(() => new Set(ubicaciones.length === 1 ? [ubicaciones[0].id] : []));

  const update = (id, patch) => onChange(ubicaciones.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  const add = () => { const u = empty(); onChange([...ubicaciones, u]); setOpen((s) => new Set([...s, u.id])); };
  const remove = (id) => { if (ubicaciones.length > 1) onChange(ubicaciones.filter((u) => u.id !== id)); };
  const toggle = (id) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {ubicaciones.map((u, i) => {
        const isOpen = open.has(u.id);
        return (
          <div key={u.id} style={{ borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface2, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px 8px 12px" }}>
              <MapPin size={14} color="var(--primary)" />
              <button type="button" onClick={() => toggle(u.id)} aria-expanded={isOpen} style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer", font: "600 13px 'Inter',sans-serif", color: C.ink, minHeight: 32, display: "flex", alignItems: "center", gap: 6 }}>
                {u.direccion || t("cli.location", { n: i + 1 })}
                <ChevronDown size={14} style={{ transform: isOpen ? "rotate(180deg)" : "", transition: "transform .2s", color: "var(--muted)" }} />
              </button>
              <button type="button" onClick={() => remove(u.id)} disabled={ubicaciones.length <= 1} className="icon-btn danger" aria-label={t("loc.remove")}><Trash2 size={15} /></button>
            </div>
            {isOpen && (
              <div style={{ padding: "4px 12px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                <Field label={t("loc.address")} required>
                  <input className="input-base" value={u.direccion} onChange={(e) => update(u.id, { direccion: e.target.value })} placeholder={t("loc.addressPh")} />
                </Field>
                <Field label={t("loc.maps")}>
                  <input className="input-base" value={u.mapsLink || ""} onChange={(e) => update(u.id, { mapsLink: e.target.value })} placeholder="https://maps.app.goo.gl/…" inputMode="url" />
                </Field>
                <div className="form-grid-2">
                  <Field label={t("loc.contact")}>
                    <input className="input-base" value={u.contacto || ""} onChange={(e) => update(u.id, { contacto: e.target.value })} placeholder={t("loc.contactPh")} />
                  </Field>
                  <Field label={t("loc.access")} hint={t("loc.accessHint")}>
                    <input className="input-base" value={u.acceso || ""} onChange={(e) => update(u.id, { acceso: e.target.value })} placeholder={t("loc.accessPh")} />
                  </Field>
                </div>
                <Field label={t("loc.notes")} hint={t("loc.notesHint")}>
                  <textarea rows={2} className="input-base" value={u.notas || ""} onChange={(e) => update(u.id, { notas: e.target.value })} style={{ resize: "vertical" }} />
                </Field>
              </div>
            )}
          </div>
        );
      })}
      <button type="button" onClick={add} className="btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}><Plus size={13} /> {t("loc.add")}</button>
    </div>
  );
}
