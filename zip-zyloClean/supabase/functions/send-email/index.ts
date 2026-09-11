// Supabase Edge Function: send-email
// Envía notificaciones por email usando SMTP (Gmail)
// Deno runtime — usa npm: specifier para nodemailer

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.7";

const GMAIL_USER = Deno.env.get("GMAIL_USER") || "jorgezyloclean@gmail.com";
const GMAIL_APP_PASS = Deno.env.get("GMAIL_APP_PASS") || "lqai bspa mmim dwow";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASS,
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, html, type } = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos: to, subject, html" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const info = await transporter.sendMail({
      from: `"ZyloClean 🌿" <${GMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`Email enviado [${type || "general"}] → ${to} | ID: ${info.messageId}`);

    return new Response(
      JSON.stringify({ success: true, messageId: info.messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error enviando email:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
