// Supabase Edge Function: send-email
// Envía notificaciones internas por SMTP de Gmail (contraseña de aplicación).
//
// Seguridad:
//  - Solo usuarios autenticados que sean personal activo (admin u operativo).
//  - La contraseña vive ÚNICAMENTE en los secrets del proyecto:
//      supabase secrets set GMAIL_USER=... GMAIL_APP_PASS=...
//    Sin valor por defecto: si falta, la función falla en vez de mandar.
//  - Destinatarios limitados a correos que existan en `clients` o `staff`.
import nodemailer from "npm:nodemailer@6.9.7";
import { corsHeaders, json, requireStaff } from "../_shared/auth.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASS = Deno.env.get("GMAIL_APP_PASS");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  if (!GMAIL_USER || !GMAIL_APP_PASS) {
    return json({ error: "Correo no configurado (GMAIL_USER / GMAIL_APP_PASS)" }, 500);
  }

  const ctx = await requireStaff(req);
  if (!ctx) return json({ error: "No autorizado" }, 401);

  let body: { to?: string; subject?: string; html?: string; type?: string };
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const { to, subject, html, type } = body;
  if (!to || !subject || !html) return json({ error: "Faltan campos: to, subject, html" }, 400);

  // El destinatario tiene que ser un correo conocido por el sistema.
  const [{ data: c }, { data: s }] = await Promise.all([
    ctx.admin.from("clients").select("id").eq("email", to).limit(1),
    ctx.admin.from("staff").select("id").eq("email", to).limit(1),
  ]);
  if (!c?.length && !s?.length) return json({ error: "Destinatario no registrado" }, 403);

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS },
    });
    const info = await transporter.sendMail({
      from: `"ZyloClean" <${GMAIL_USER}>`,
      to, subject, html,
    });
    console.log(`Email [${type ?? "general"}] → ${to} por ${ctx.staff.id} | ${info.messageId}`);
    return json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error("Error enviando email:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
