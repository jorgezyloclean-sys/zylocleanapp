import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const mock = import.meta.env.VITE_MOCK === "1";

/** Nombre de las variables que faltan (vacío = configuración completa). */
export const configMissing = mock ? [] : [!url && "VITE_SUPABASE_URL", !key && "VITE_SUPABASE_ANON_KEY"].filter(Boolean);

// Con la config incompleta el cliente apunta a un host inválido: nada se guarda
// "por accidente" y App muestra una pantalla explicando qué falta.
export const supabase = createClient(url || "https://config-missing.invalid", key || "config-missing", {
  auth: { persistSession: !configMissing.length, autoRefreshToken: true, detectSessionInUrl: true },
});
