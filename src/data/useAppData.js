// Carga las tablas (RLS decide qué ve cada rol) y las mantiene en vivo.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { MOCK, snapshot, subscribe } from "../dev/mock";

const TABLES = ["clients", "staff", "checklists", "jobs", "servicios_contratados", "registro_horas", "solicitudes", "portal_tokens"];
const PK = { portal_tokens: "token" };

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
        firstError = firstError || `${TABLES[i]}: ${r.error.message}`;
      } else next[TABLES[i]] = r.data || [];
    });
    setData(next);
    setError(firstError);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) { setData(empty()); setLoading(false); return; }
    if (MOCK) { setData(snapshot()); setLoading(false); return subscribe((s) => setData(s)); }
    let channel;
    load().then(() => {
      channel = supabase.channel("app-data");
      TABLES.forEach((table) => {
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
      channel.subscribe();
    });
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [enabled, load]);

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
    solicitudes: data.solicitudes, portalTokens: data.portal_tokens,
    loading, error, refresh: load, patch,
  };
}
