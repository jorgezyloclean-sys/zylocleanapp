import { useState } from "react";
import { C, Field, Toggle } from "./ui.jsx";
import LocationsField from "./LocationsField.jsx";
import PhotosField from "./PhotosField.jsx";
import { formatKennitala } from "../lib/format";
import { newId } from "../lib/ids";
import { useT } from "../i18n/index.jsx";
import { localizeChecklist } from "../lib/checklist";

export const SERVICE_TYPES = [
  "Limpieza comercial / oficinas",
  "Limpieza de locales / retail",
  "Limpieza industrial",
  "Renta de corta estancia (Airbnb)",
  "Limpieza de mudanza",
  "Asociación de propietarios",
  "Post-construcción",
];
// Los tipos de servicio se guardan en español (son datos); en pantalla se muestran traducidos.
export const serviceTypeLabel = (v, t) => { const i = SERVICE_TYPES.indexOf(v); return i >= 0 ? t(`svc.type.${i}`) : (v || ""); };

export const CLIENT_TIPOS = ["empresa", "local", "domicilio"];
export const clientTipoLabel = (tipo, t) => t(`cli.tipo.${CLIENT_TIPOS.includes(tipo) ? tipo : "empresa"}`);

export function emptyClient() {
  return {
    id: newId("c"), nombre: "", tipo: "empresa", rubro: "", servicio: SERVICE_TYPES[0],
    ubicaciones: [{ id: newId("u"), direccion: "", mapsLink: "", contacto: "", acceso: "", notas: "" }],
    contactoHabitual: "", contactoEmergencia: "", email: "", telefono: "", acceso: "", productos: "",
    discrecion: "", wifi: "", m2: "", estado: "activo", formal: true, kennitala: "", fotosReferencia: [],
    checklistId: "", notas: "",
  };
}

export default function ClientForm({ initial, onSave, onCancel, checklists, saving }) {
  const { t, lang } = useT();
  const [form, setForm] = useState({ ...emptyClient(), ...initial, ubicaciones: Array.isArray(initial.ubicaciones) && initial.ubicaciones.length ? initial.ubicaciones : emptyClient().ubicaciones });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.nombre.trim()) errs.nombre = t("cf.errName");
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = t("cf.errEmail");
    if (form.ubicaciones.some((u) => !u.direccion?.trim())) errs.ubicaciones = t("cf.errLocations");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSave({ ...form, checklistId: form.checklistId || null, m2: form.m2 === "" ? null : String(form.m2) });
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }} noValidate>
      <div className="form-grid-2">
        <Field label={t("cf.name")} required error={errors.nombre}>
          <input className="input-base" value={form.nombre} onChange={set("nombre")} placeholder={t("cf.namePh")} autoFocus />
        </Field>
        <Field label={t("cli.f.tipo")}>
          <select className="input-base" value={form.tipo} onChange={set("tipo")}>{CLIENT_TIPOS.map((id) => <option key={id} value={id}>{t(`cli.tipo.${id}`)}</option>)}</select>
        </Field>
      </div>
      <div className="form-grid-2">
        <Field label={t("cli.f.rubro")}><input className="input-base" value={form.rubro || ""} onChange={set("rubro")} placeholder={t("cf.rubroPh")} /></Field>
        <Field label={t("cli.f.servicio")}>
          <select className="input-base" value={form.servicio || ""} onChange={set("servicio")}>{SERVICE_TYPES.map((s) => <option key={s} value={s}>{serviceTypeLabel(s, t)}</option>)}</select>
        </Field>
      </div>
      <div className="form-grid-2">
        <Field label={t("cli.f.email")} hint={t("cf.emailHint")} error={errors.email}>
          <input type="email" inputMode="email" className="input-base" value={form.email || ""} onChange={set("email")} placeholder="cliente@ejemplo.com" />
        </Field>
        <Field label={t("cli.f.phone")}><input type="tel" inputMode="tel" className="input-base" value={form.telefono || ""} onChange={set("telefono")} /></Field>
      </div>
      <div className="form-grid-2">
        <Field label={t("cli.f.kennitala")} hint={t("cf.kennitalaHint")}>
          <input className="input-base" value={form.kennitala || ""} onChange={(e) => setForm({ ...form, kennitala: formatKennitala(e.target.value) })} placeholder="120184-2380" maxLength={11} inputMode="numeric" />
        </Field>
        <Field label={t("cf.m2")}><input type="number" inputMode="numeric" className="input-base" value={form.m2 ?? ""} onChange={set("m2")} /></Field>
      </div>

      <Field label={t("cf.locations")} required error={errors.ubicaciones} hint={t("cf.locationsHint")}>
        <LocationsField value={form.ubicaciones} onChange={(ubicaciones) => setForm({ ...form, ubicaciones })} />
      </Field>

      <div className="form-grid-2">
        <Field label={t("cli.f.contact")}><input className="input-base" value={form.contactoHabitual || ""} onChange={set("contactoHabitual")} /></Field>
        <Field label={t("cli.f.emergency")}><input className="input-base" value={form.contactoEmergencia || ""} onChange={set("contactoEmergencia")} /></Field>
      </div>
      <Field label={t("cli.f.access")} hint={t("cf.accessHint")}>
        <input className="input-base" value={form.acceso || ""} onChange={set("acceso")} placeholder={t("cf.accessPh")} />
      </Field>
      <div className="form-grid-3">
        <Field label={t("cli.f.products")}><input className="input-base" value={form.productos || ""} onChange={set("productos")} /></Field>
        <Field label={t("cli.f.discretion")}><input className="input-base" value={form.discrecion || ""} onChange={set("discrecion")} /></Field>
        <Field label={t("cli.f.wifi")}><input className="input-base" value={form.wifi || ""} onChange={set("wifi")} placeholder={t("cf.wifiPh")} /></Field>
      </div>

      <Field label={t("cli.refPhotos")} hint={t("cf.photosHint")}>
        <PhotosField prefix={form.id} value={form.fotosReferencia} onChange={(fotosReferencia) => setForm({ ...form, fotosReferencia })} />
      </Field>

      <Field label={t("cli.f.checklist")} hint={t("cf.checklistHint")}>
        <select className="input-base" value={form.checklistId || ""} onChange={set("checklistId")}>
          <option value="">{t("cf.checklistNone")}</option>
          {checklists.map((ck) => <option key={ck.id} value={ck.id}>{localizeChecklist(ck, lang).nombre}</option>)}
        </select>
      </Field>
      <Field label={t("cf.internalNotes")}><textarea rows={2} className="input-base" value={form.notas || ""} onChange={set("notas")} style={{ resize: "vertical" }} /></Field>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        <Toggle checked={form.formal} onChange={(v) => setForm({ ...form, formal: v })} label={t("cf.formal")} />
        <Toggle checked={form.estado === "activo"} onChange={(v) => setForm({ ...form, estado: v ? "activo" : "inactivo" })} label={t("cf.activeClient")} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8, borderTop: `1px solid ${C.borderSubtle}` }}>
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>{t("common.cancel")}</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? t("common.saving") : t("cf.save")}</button>
      </div>
    </form>
  );
}
