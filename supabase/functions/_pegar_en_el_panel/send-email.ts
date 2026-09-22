// send-email — VERSIÓN DE UN SOLO ARCHIVO, para pegar en el panel de Supabase
// (Edge Functions → send-email → editar → pegar → Deploy). Es la misma lógica que
// supabase/functions/send-email/index.ts, con el _shared/auth.ts incorporado para
// no depender de la CLI.
//
// Reemplaza a la versión del prototipo, que NO verificaba quién llamaba: con la
// anon key (pública, va en el JavaScript de la web) cualquiera podía mandar correos
// desde la cuenta de Gmail de la empresa.
//
// Requiere los secrets GMAIL_USER y GMAIL_APP_PASS en el proyecto.
import nodemailer from "npm:nodemailer@6.9.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASS = Deno.env.get("GMAIL_APP_PASS");

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/** Quien llama tiene que ser personal activo. Sin eso, no se manda nada. */
async function requireStaff(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const admin = serviceClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  const { data: staff } = await admin
    .from("staff").select("id, nombre, rol, activo, email")
    .eq("auth_user_id", user.id).maybeSingle();
  if (!staff || !staff.activo) return null;
  return { user, staff, admin };
}

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

  // El destinatario tiene que ser un correo que ya esté en la base.
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
    const info = await transporter.sendMail({ from: `"ZyloClean" <${GMAIL_USER}>`, to, subject, html });
    console.log(`Email [${type ?? "general"}] → ${to} por ${ctx.staff.id} | ${info.messageId}`);
    return json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error("Error enviando email:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
