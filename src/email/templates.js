// Plantillas de correo. Salen por la edge function `send-email` (SMTP Gmail).
// Spec §3.3: aviso al personal al asignar/modificar un trabajo. El aviso al
// cliente (programado / finalizado) se mantiene como estaba en el prototipo.
import { sendNotificationEmail } from "../data/api";
import { formatFecha } from "../lib/dates";
import { minutesLabel } from "../lib/format";

function layout(title, bodyHtml, footer = "ZyloClean · Reykjavík") {
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#F2F8F6;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #D8EDE7">
      <div style="background:linear-gradient(135deg,#01664E,#018060);color:#fff;padding:22px 26px">
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.75">ZyloClean</div>
        <h1 style="margin:6px 0 0;font-size:20px;font-weight:700">${title}</h1>
      </div>
      <div style="padding:22px 26px;color:#0A1F1A;font-size:14px;line-height:1.55">${bodyHtml}</div>
      <div style="padding:14px 26px;background:#FAFCFB;border-top:1px solid #EAF4F1;color:#6B8A84;font-size:12px">${footer}</div>
    </div>
  </div>`;
}

function row(label, value) {
  return `<tr><td style="padding:6px 0;color:#6B8A84;font-size:12px;width:140px">${label}</td><td style="padding:6px 0;font-weight:600">${value ?? "—"}</td></tr>`;
}

/** Aviso a cada empleado asignado (spec §3.3). */
export async function emailJobToStaff({ client, job, assignedStaff, ubicacion, modificado = false }) {
  const withEmail = assignedStaff.filter((s) => s.email);
  const title = modificado ? "Cambió un trabajo asignado" : "Tenés un trabajo asignado";
  const html = layout(title, `
    <table style="border-collapse:collapse;width:100%">
      ${row("Cliente", client?.nombre)}
      ${row("Dirección", ubicacion?.direccion || client?.ubicaciones?.[0]?.direccion)}
      ${row("Fecha", formatFecha(job.fecha))}
      ${row("Hora", job.hora)}
      ${job.duracion_estimada_min ? row("Duración estimada", minutesLabel(job.duracion_estimada_min)) : ""}
      ${row("Equipo", assignedStaff.map((s) => s.nombre).join(", "))}
    </table>
    <p style="margin-top:16px">Entrá al sistema desde el celular para ver el checklist e iniciar el trabajo.</p>`);
  const results = await Promise.allSettled(withEmail.map((s) => sendNotificationEmail({
    to: s.email, subject: `${modificado ? "Cambio" : "Nuevo trabajo"} — ${client?.nombre} · ${formatFecha(job.fecha)} ${job.hora}`,
    html, type: "job_assigned_staff",
  })));
  return { sent: results.filter((r) => r.status === "fulfilled").length, total: withEmail.length };
}

/** Aviso al cliente cuando se programa una visita. */
export function emailJobAssignedToClient({ client, job, assignedStaff }) {
  if (!client?.email) return Promise.resolve(false);
  const html = layout("Limpieza programada", `
    <p>Hola ${client.nombre},</p>
    <p>Programamos una visita de limpieza:</p>
    <table style="border-collapse:collapse;width:100%">
      ${row("Fecha", formatFecha(job.fecha))}
      ${row("Hora", job.hora)}
      ${row("Equipo", assignedStaff.map((s) => s.nombre).join(", ") || "A confirmar")}
    </table>`);
  return sendNotificationEmail({ to: client.email, subject: `Limpieza programada — ${formatFecha(job.fecha)} a las ${job.hora}`, html, type: "job_assigned" });
}

/** Aviso al cliente al finalizar. */
export function emailJobCompleted({ client, job, horasLabel }) {
  if (!client?.email) return Promise.resolve(false);
  const html = layout("Tu limpieza está lista", `
    <p>Hola ${client.nombre},</p>
    <p>La visita del ${formatFecha(job.fecha)} quedó finalizada.${horasLabel ? ` Tiempo en el lugar: <strong>${horasLabel}</strong>.` : ""}</p>
    <p style="color:#6B8A84;font-size:13px">Podés calificar el servicio desde tu portal de cliente.</p>`);
  return sendNotificationEmail({ to: client.email, subject: `Tu limpieza del ${formatFecha(job.fecha)} está completa`, html, type: "job_completed" });
}
