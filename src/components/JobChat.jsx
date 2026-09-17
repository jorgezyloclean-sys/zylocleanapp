// Hilo de mensajes de un trabajo (chat nivel A): admin ↔ personal asignado.
// Sin push: al abrir el hilo se marcan como leídos los mensajes del otro.
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Paperclip, Trash2, X, MessageSquare, Check, CheckCheck } from "lucide-react";
import { Avatar, C, EmptyState, SignedImg, PhotoLink } from "./ui.jsx";
import { useT } from "../i18n/index.jsx";
import { formatFecha, formatHoraTs, todayISO, addDays } from "../lib/dates";
import { agruparPorDia, mensajesDeJob } from "../lib/chat";
import { photoPath, uploadPhoto } from "../lib/storage";
import { run } from "../lib/toast";
import * as api from "../data/api";

const BUCKET = "job-photos";

export default function JobChat({ job, mensajes, staff, profile, patch, compact = false }) {
  const { t, lang } = useT();
  const me = profile.id;
  const lista = useMemo(() => mensajesDeJob(mensajes, job.id), [mensajes, job.id]);
  const [texto, setTexto] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const nombreDe = (id) => staff.find((s) => s.id === id)?.nombre || "?";
  const esAdmin = (id) => staff.find((s) => s.id === id)?.rol === "admin";

  // Marcar como leídos los mensajes ajenos al abrir / al llegar nuevos.
  useEffect(() => {
    const pend = lista.filter((m) => m.autor_id !== me && !(m.leido_por || []).includes(me));
    if (!pend.length) return;
    api.marcarLeidos(pend, me).then((rows) => rows.forEach((r) => patch("mensajes", r))).catch(() => {});
  }, [lista, me, patch]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [lista.length]);

  async function enviar() {
    const txt = texto.trim();
    if ((!txt && !file) || busy) return;
    setBusy(true);
    try {
      let adjunto = null;
      if (file) adjunto = await uploadPhoto(BUCKET, photoPath(`chat/${job.id}/img`, file), file);
      const row = await run(() => api.insertMensaje({ job_id: job.id, autor_id: me, texto: txt, adjunto }), { err: t("chat.sendError") });
      if (row) { patch("mensajes", row); setTexto(""); setFile(null); if (fileRef.current) fileRef.current.value = ""; }
    } catch (e) { run(() => Promise.reject(e), { err: t("chat.sendError") }); }
    setBusy(false);
  }
  async function borrar(m) {
    if (await run(() => api.deleteMensaje(m.id), { ok: t("chat.deleted") })) patch("mensajes", m, true);
  }
  const diaLabel = (dia) => dia === todayISO() ? t("common.today") : dia === addDays(todayISO(), -1) ? t("chat.yesterday") : formatFecha(dia, lang);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: compact ? 0 : 260, maxHeight: compact ? "60vh" : 420 }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, padding: "4px 2px" }}>
        {lista.length === 0 && <EmptyState icon={MessageSquare} title={t("chat.empty")} body={t("chat.emptyBody")} />}
        {agruparPorDia(lista).map((g) => (
          <div key={g.dia} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ alignSelf: "center", fontSize: 10.5, fontWeight: 700, color: C.muted2, textTransform: "uppercase", letterSpacing: ".4px", padding: "6px 0 2px" }}>{diaLabel(g.dia)}</div>
            {g.items.map((m) => {
              const mio = m.autor_id === me;
              const leidoPorOtro = (m.leido_por || []).some((id) => id !== me);
              return (
                <div key={m.id} style={{ display: "flex", gap: 8, flexDirection: mio ? "row-reverse" : "row", alignItems: "flex-end" }}>
                  {!mio && <Avatar name={nombreDe(m.autor_id)} size={26} bg={esAdmin(m.autor_id) ? C.primary : C.pale} color={esAdmin(m.autor_id) ? C.onPrimary : C.primary} />}
                  <div className={`chat-bubble ${mio ? "mine" : ""}`} style={{ maxWidth: "78%" }}>
                    {!mio && <p style={{ fontSize: 10.5, fontWeight: 700, color: C.primary, marginBottom: 2 }}>{nombreDe(m.autor_id)}</p>}
                    {m.adjunto && (
                      <PhotoLink bucket={BUCKET} path={m.adjunto}>
                        <SignedImg bucket={BUCKET} path={m.adjunto} alt={t("chat.attachment")} style={{ width: "100%", maxWidth: 240, borderRadius: 10, display: "block", marginBottom: m.texto ? 6 : 0 }} />
                      </PhotoLink>
                    )}
                    {m.texto && <p style={{ fontSize: 13.5, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.texto}</p>}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", marginTop: 3, opacity: .7, fontSize: 10.5 }}>
                      <span className="tabular">{formatHoraTs(m.created_at, lang)}</span>
                      {mio && (leidoPorOtro ? <CheckCheck size={12} aria-label={t("chat.read")} /> : <Check size={12} aria-label={t("chat.sent")} />)}
                      {(mio || profile.rol === "admin") && <button className="chat-del" aria-label={t("common.delete")} onClick={() => borrar(m)}><Trash2 size={11} /></button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {file && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 10, background: C.surface2, border: `1px solid ${C.borderSubtle}`, marginTop: 6, fontSize: 12 }}>
          <Paperclip size={13} /> <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
          <button className="icon-btn" style={{ width: 26, height: 26 }} aria-label={t("common.remove")} onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}><X size={12} /></button>
        </div>
      )}
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", marginTop: 8 }}>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button className="icon-btn" aria-label={t("chat.attach")} onClick={() => fileRef.current?.click()} disabled={busy} style={{ width: 40, height: 40, flexShrink: 0 }}><Paperclip size={16} /></button>
        <textarea className="input-base" rows={1} value={texto} placeholder={t("chat.placeholder")} aria-label={t("chat.placeholder")} disabled={busy}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          style={{ flex: 1, resize: "none", minHeight: 40, maxHeight: 120, padding: "9px 12px", lineHeight: 1.4 }} />
        <button className="btn-primary" onClick={enviar} disabled={busy || (!texto.trim() && !file)} aria-label={t("chat.send")} style={{ height: 40, padding: "0 14px", flexShrink: 0 }}><Send size={15} /></button>
      </div>
    </div>
  );
}
