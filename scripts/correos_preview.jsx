// Genera un HTML con todos los correos del sistema, para revisarlos sin mandar nada.
//   npm run correos   →  correos-preview.html
import { writeFileSync } from "node:fs";
import * as tpl from "../src/email/templates.js";
import { __demoEmails } from "../src/data/api.js";

const cliente = (o) => ({ nombre: "Fly Over Iceland", contactoHabitual: "Anna Sigurðardóttir", email: "ops@flyover.is", idioma: "es", ubicaciones: [{ id: "u1", direccion: "Fiskislóð 43, 101 Reykjavík" }], ...o });
const job = { id: "j1", fecha: "2026-09-26", hora: "19:00", duracion_estimada_min: 150 };
const ana = { id: "e2", nombre: "Ana Torres", email: "ana@zyloclean.test", idioma: "es" };
const sigrun = { id: "e4", nombre: "Sigrún Ólafsdóttir", email: "sigrun@zyloclean.test", idioma: "is" };

await tpl.emailPortalLink({ client: cliente(), url: tpl.portalUrl("TOKEN-DEMO") });
await tpl.emailPortalLink({ client: cliente({ nombre: "Kaffi Vínyl", contactoHabitual: "Ólafur", email: "kaffi@vinyl.is", idioma: "is" }), url: tpl.portalUrl("TOKEN-KAFFI") });
await tpl.emailJobAssignedToClient({ client: cliente({ nombre: "Laugavegur Apartments", contactoHabitual: "John", email: "host@lauga.is", idioma: "en" }), job, assignedStaff: [ana], portalToken: "TOKEN-LAUGA" });
await tpl.emailJobCompleted({ client: cliente(), job, horasLabel: "2h 10m", portalToken: "TOKEN-DEMO" });
await tpl.emailJobToStaff({ client: cliente(), job, assignedStaff: [ana], ubicacion: cliente().ubicaciones[0] });
await tpl.emailJobToStaff({ client: cliente(), job, assignedStaff: [sigrun], ubicacion: cliente().ubicaciones[0], modificado: true });

const secciones = [...__demoEmails()].reverse().map((e) => `
  <section><div class="meta"><b>${e.to}</b><span>${e.subject}</span><em>${e.type}</em></div>${e.html}</section>`).join("");

writeFileSync("correos-preview.html", `<!doctype html><html lang="es"><meta charset="utf-8"><title>Correos ZyloClean</title>
<style>body{margin:0;background:#EEF2F1;font-family:Inter,Arial,sans-serif;padding:24px}
h1{font-size:20px;margin:0 0 4px}p.sub{color:#5B706B;font-size:13px;margin:0 0 24px;max-width:620px}
section{max-width:620px;margin:0 auto 30px;border-radius:14px;overflow:hidden;box-shadow:0 2px 14px rgba(0,0,0,.08);background:#fff}
.meta{background:#0A1F1A;color:#fff;padding:10px 16px;display:flex;flex-wrap:wrap;gap:4px 14px;align-items:baseline;font-size:12.5px}
.meta b{font-size:13px}.meta span{opacity:.85}.meta em{margin-left:auto;opacity:.5;font-style:normal;font-size:11px}</style>
<h1>Correos del sistema — vista previa</h1>
<p class="sub">Cada correo sale en el idioma del destinatario (ficha del cliente / del empleado). Los botones llevan al portal del cliente o a la app del personal. En producción la dirección es la real, no localhost.</p>
${secciones}</html>`);
console.log(`✔ correos-preview.html — ${__demoEmails().length} correos`);
