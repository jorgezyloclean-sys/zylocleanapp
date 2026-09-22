// Plantillas de correo. Salen por la edge function `send-email` (SMTP Gmail).
// Cada correo va en el idioma del destinatario: `clients.idioma` para el cliente,
// `staff.idioma` para cada persona del equipo (pedidos de la capacitación del 18/09).
// Los correos al cliente llevan el enlace de su portal; los del personal, el de la app.
import { sendNotificationEmail } from "../data/api";
import { formatFecha } from "../lib/dates";
import { minutesLabel } from "../lib/format";
import { tr } from "../i18n/index.jsx";

/** Base pública de la app. En un correo no sirve una ruta relativa. */
export const appUrl = () => (typeof window !== "undefined" && window.location ? window.location.origin : "https://zyloclean.app");
export const portalUrl = (token) => `${appUrl()}/?portal=${token}`;

function layout(title, bodyHtml, footer) {
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

const saludo = (client) => (client?.contactoHabitual || "").trim() || client?.nombre;

const row = (label, value) =>
  `<tr><td style="padding:6px 0;color:#6B8A84;font-size:12px;width:150px">${label}</td><td style="padding:6px 0;font-weight:600">${value ?? "—"}</td></tr>`;

/** Botón grande: en correo se hace con tabla, no con flex. */
const button = (href, label) => `
  <table role="presentation" style="border-collapse:collapse;margin:18px 0"><tr>
    <td style="background:#01664E;border-radius:10px">
      <a href="${href}" style="display:inline-block;padding:12px 22px;color:#fff;font-weight:700;font-size:14px;text-decoration:none">${label}</a>
    </td>
  </tr></table>
  <p style="font-size:11.5px;color:#6B8A84;word-break:break-all;margin:0">${href}</p>`;

/** Aviso a cada empleado asignado (spec §3.3), en su idioma, con enlace directo a la app. */
export async function emailJobToStaff({ client, job, assignedStaff, ubicacion, modificado = false }) {
  const withEmail = assignedStaff.filter((s) => s.email);
  const results = await Promise.allSettled(withEmail.map((s) => {
    const t = tr(s.idioma || "es");
    const lang = s.idioma || "es";
    const title = t(modificado ? "mail.staff.titleMod" : "mail.staff.title");
    const html = layout(title, `
      <p>${t("mail.hi", { name: s.nombre })}</p>
      <table style="border-collapse:collapse;width:100%">
        ${row(t("mail.f.client"), client?.nombre)}
        ${row(t("mail.f.address"), ubicacion?.direccion || client?.ubicaciones?.[0]?.direccion)}
        ${row(t("mail.f.date"), formatFecha(job.fecha, lang))}
        ${row(t("mail.f.time"), job.hora)}
        ${job.duracion_estimada_min ? row(t("mail.f.duration"), minutesLabel(job.duracion_estimada_min, t)) : ""}
        ${row(t("mail.f.team"), assignedStaff.map((x) => x.nombre).join(", "))}
      </table>
      <p style="margin-top:16px">${t("mail.staff.body")}</p>
      ${button(appUrl(), t("mail.staff.cta"))}`, t("mail.footer"));
    return sendNotificationEmail({
      to: s.email,
      subject: `${t(modificado ? "mail.staff.subjMod" : "mail.staff.subj")} — ${client?.nombre} · ${formatFecha(job.fecha, lang)} ${job.hora}`,
      html, type: "job_assigned_staff",
    });
  }));
  return { sent: results.filter((r) => r.status === "fulfilled").length, total: withEmail.length };
}

/** Aviso al cliente cuando se programa una visita. */
export function emailJobAssignedToClient({ client, job, assignedStaff, portalToken }) {
  if (!client?.email) return Promise.resolve(false);
  const lang = client.idioma || "es";
  const t = tr(lang);
  const html = layout(t("mail.client.scheduled"), `
    <p>${t("mail.hi", { name: saludo(client) })}</p>
    <p>${t("mail.client.scheduledBody")}</p>
    <table style="border-collapse:collapse;width:100%">
      ${row(t("mail.f.date"), formatFecha(job.fecha, lang))}
      ${row(t("mail.f.time"), job.hora)}
      ${row(t("mail.f.team"), assignedStaff.map((s) => s.nombre).join(", ") || t("mail.f.tbc"))}
    </table>
    ${portalToken ? button(portalUrl(portalToken), t("mail.client.cta")) : ""}`, t("mail.footer"));
  return sendNotificationEmail({
    to: client.email, subject: `${t("mail.client.scheduled")} — ${formatFecha(job.fecha, lang)} · ${job.hora}`,
    html, type: "job_assigned",
  });
}

/** Aviso al cliente al finalizar, con el enlace del portal para que pueda calificar. */
export function emailJobCompleted({ client, job, horasLabel, portalToken }) {
  if (!client?.email) return Promise.resolve(false);
  const lang = client.idioma || "es";
  const t = tr(lang);
  const html = layout(t("mail.client.done"), `
    <p>${t("mail.hi", { name: saludo(client) })}</p>
    <p>${t("mail.client.doneBody", { fecha: formatFecha(job.fecha, lang) })}${horasLabel ? ` ${t("mail.client.doneHours", { h: horasLabel })}` : ""}</p>
    <p>${portalToken ? t("mail.client.rate") : t("mail.client.ratePortal")}</p>
    ${portalToken ? button(portalUrl(portalToken), t("mail.client.ctaRate")) : ""}`, t("mail.footer"));
  return sendNotificationEmail({
    to: client.email, subject: t("mail.client.doneSubj", { fecha: formatFecha(job.fecha, lang) }),
    html, type: "job_completed",
  });
}

/** Envío del enlace del portal al cliente, a pedido desde su ficha. */
export function emailPortalLink({ client, url }) {
  if (!client?.email) return Promise.resolve(false);
  const t = tr(client.idioma || "es");
  const html = layout(t("mail.portal.title"), `
    <p>${t("mail.hi", { name: saludo(client) })}</p>
    <p>${t("mail.portal.body")}</p>
    ${button(url, t("mail.portal.cta"))}
    <p style="font-size:12.5px;color:#6B8A84;margin-top:18px">${t("mail.portal.note")}</p>`, t("mail.footer"));
  return sendNotificationEmail({ to: client.email, subject: t("mail.portal.subj"), html, type: "portal_link" });
}
