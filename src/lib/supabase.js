import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if ((!url || !key) && import.meta.env.VITE_MOCK !== "1") {
  // Fallar en voz alta: sin esto la app parecería andar y nada se guardaría.
  throw new Error("Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env");
}

export const supabase = createClient(url || "https://demo.invalid", key || "demo", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
