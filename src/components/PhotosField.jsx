// Fotos de referencia del cliente (llave, incidencias). Bucket privado.
import { useState } from "react";
import { Camera, X } from "lucide-react";
import { C, SignedImg } from "./ui.jsx";
import { toast } from "../lib/toast";
import { photoPath, uploadPhoto, removePhoto } from "../lib/storage";
import { useT } from "../i18n/index.jsx";

export const TIPO_FOTO = ["llave", "incidencia", "otro"];
export const tipoFotoLabel = (tipo, t) => t(`ph.${TIPO_FOTO.includes(tipo) ? tipo : "otro"}`);

export default function PhotosField({ prefix, value, onChange }) {
  const { t } = useT();
  const fotos = value || [];
  const [uploading, setUploading] = useState(false);
  const [tipo, setTipo] = useState("llave");

  async function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadPhoto("client-photos", photoPath(prefix, file), file);
      onChange([...fotos, { path, tipo, descripcion: "" }]);
      toast(t("ph.added"));
    } catch (e) {
      toast(t("ph.error", { e: e.message }), "error");
    } finally { setUploading(false); }
  }

  async function remove(i) {
    const f = fotos[i];
    onChange(fotos.filter((_, idx) => idx !== i));
    if (f.path) { try { await removePhoto("client-photos", f.path); } catch { /* ya no está */ } }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {fotos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))", gap: 8 }}>
          {fotos.map((f, i) => (
            <div key={f.path || f.url || i} style={{ position: "relative" }}>
              <SignedImg bucket="client-photos" path={f.path || f.url} alt={tipoFotoLabel(f.tipo, t)} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}` }} />
              <span style={{ position: "absolute", bottom: 3, left: 3, right: 3, fontSize: 8, fontWeight: 700, color: "#fff", background: "rgba(10,31,26,.7)", borderRadius: 4, padding: "1px 4px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tipoFotoLabel(f.tipo, t)}</span>
              <button type="button" onClick={() => remove(i)} aria-label={t("ph.remove")} style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: "var(--danger)", border: `2px solid ${C.surface}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                <X size={11} color="#fff" strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select className="input-base" style={{ width: 170 }} value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label={t("ph.type")}>
          {TIPO_FOTO.map((k) => <option key={k} value={k}>{t(`ph.${k}`)}</option>)}
        </select>
        <label className="btn-ghost btn-sm" style={{ cursor: uploading ? "wait" : "pointer" }}>
          <Camera size={14} /> {uploading ? t("ph.uploading") : t("ph.add")}
          <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploading} onChange={(e) => { handleUpload(e.target.files[0]); e.target.value = ""; }} />
        </label>
      </div>
    </div>
  );
}
