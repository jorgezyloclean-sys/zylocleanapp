// Carga las tablas (RLS decide qué ve cada rol) y las mantiene en vivo.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { MOCK, snapshot, subscribe } from "../dev/mock";

const TABLES = ["clients", "staff", "checklists", "jobs", "servicios_contratados", "registro_horas", "solicitudes", "portal_tokens", "mensajes", "recursos", "staff_nombres"];
const PK = { portal_tokens: "token" };
const NO_REALTIME = new Set(["staff_nombres"]); // vista: sin cambios en vivo, se recarga con el resto
const POLL_MS = 20000; // respaldo si el realtime no llega (móvil bloqueado, tabla sin publicar)

const empty = () => Object.fromEntries(TABLES.map((t) => [t, []]));

export function useAppData(enabled) {
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.all(TABLES.map((t) => supabase.from(t).select("*")));
    const next = empty();
    let firstError = null;
    results.forEach((r, i) => {
      if (r.error) {
        // Tablas sin política para el rol devuelven vacío, no error; un error real se muestra.
        // La vista staff_nombres puede no existir todavía (migración 0006 sin correr): no es bloqueante.
        if (NO_REALTIME.has(TABLES[i])) { console.warn(`[datos] ${TABLES[i]}: ${r.error.message}`); return; }
        firstError = firstError || `${TABLES[i]}: ${r.error.message}`;
      } else next[TABLES[i]] = r.data || [];
    });
    setData(next);
    setError(firstError);
    setLoading(false);
  }, []);

  // Recarga silenciosa (sin spinner) de una o todas las tablas.
  const refetch = useCallback(async (tables = TABLES) => {
    const results = await Promise.all(tables.map((t) => supabase.from(t).select("*")));
    setData((prev) => {
      const next = { ...prev };
      results.forEach((r, i) => { if (!r.error) next[tables[i]] = r.data || []; });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!enabled) { setData(empty()); setLoading(false); return; }
    if (MOCK) { setData(snapshot()); setLoading(false); return subscribe((s) => setData(s)); }
    let channel;
    // Respaldo: al volver a la pestaña se recarga todo; mientras está visible, los mensajes cada 20 s.
    const onVisible = () => { if (document.visibilityState === "visible") refetch(); };
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => { if (document.visibilityState === "visible") refetch(["mensajes"]); }, POLL_MS);
    load().then(() => {
      channel = supabase.channel("app-data");
      TABLES.filter((t) => !NO_REALTIME.has(t)).forEach((table) => {
        channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
          const pk = PK[table] || "id";
          setData((prev) => {
            const rows = prev[table];
            if (payload.eventType === "INSERT") {
              return rows.some((r) => r[pk] === payload.new[pk]) ? prev : { ...prev, [table]: [...rows, payload.new] };
            }
            if (payload.eventType === "UPDATE") {
              return { ...prev, [table]: rows.map((r) => (r[pk] === payload.new[pk] ? payload.new : r)) };
            }
            if (payload.eventType === "DELETE") {
              return { ...prev, [table]: rows.filter((r) => r[pk] !== payload.old[pk]) };
            }
            return prev;
          });
        });
      });
      channel.subscribe((status, err) => { if (status !== "SUBSCRIBED") console.warn("[realtime]", status, err?.message || ""); });
    });
    return () => { document.removeEventListener("visibilitychange", onVisible); clearInterval(timer); if (channel) supabase.removeChannel(channel); };
  }, [enabled, load, refetch]);

  /** Actualización optimista local (el realtime la confirma o `refresh` la corrige). */
  const patch = useCallback((table, row, remove = false) => {
    const pk = PK[table] || "id";
    setData((prev) => {
      const rows = prev[table];
      if (remove) return { ...prev, [table]: rows.filter((r) => r[pk] !== row[pk]) };
      const exists = rows.some((r) => r[pk] === row[pk]);
      return { ...prev, [table]: exists ? rows.map((r) => (r[pk] === row[pk] ? { ...r, ...row } : r)) : [...rows, row] };
    });
  }, []);

  return {
    clients: data.clients, staff: data.staff, checklists: data.checklists, jobs: data.jobs,
    servicios: data.servicios_contratados, registros: data.registro_horas,
    solicitudes: data.solicitudes, portalTokens: data.portal_tokens, mensajes: data.mensajes, recursos: data.recursos,
    // Nombres de todo el personal (vista): lo que un operativo necesita para saber quién escribió.
    staffNombres: data.staff_nombres,
    loading, error, refresh: load, patch,
  };
}
