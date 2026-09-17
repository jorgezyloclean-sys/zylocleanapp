// Sesión de Supabase Auth + perfil de `staff` (rol, idioma).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { MOCK, mockApi } from "../dev/mock";

export function useAuth() {
  const [session, setSession] = useState(MOCK ? null : undefined); // undefined = cargando
  const [profile, setProfile] = useState(null);      // fila de staff
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    if (MOCK) return undefined;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => alive && setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => { if (alive) setSession(s ?? null); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let alive = true;
    if (MOCK) { if (session) { const p = session.mockStaffId ? mockApi.find("staff", (s) => s.id === session.mockStaffId) : mockApi.profile(); setProfile(p); } else setProfile(null); return () => {}; }
    if (!session?.user) { setProfile(null); setProfileError(null); return; }
    (async () => {
      const { data, error } = await supabase.from("staff").select("*").eq("auth_user_id", session.user.id).maybeSingle();
      if (!alive) return;
      if (error) { setProfileError(error.message); setProfile(null); return; }
      if (!data || !data.activo) { setProfileError("notStaff"); setProfile(null); return; }
      setProfileError(null); setProfile(data);
    })();
    return () => { alive = false; };
  }, [session?.user?.id]);

  const login = useCallback(async (email, password) => {
    if (MOCK) {
      // demo: cualquier contraseña; el correo elige la persona (admin por defecto).
      // Vale el correo exacto o solo lo que va antes de la @ (ana@lo-que-sea → Ana).
      const mail = (email || "").trim().toLowerCase();
      const user = mail.split("@")[0];
      const s = mockApi.find("staff", (x) => x.email?.toLowerCase() === mail)
        || mockApi.find("staff", (x) => x.email?.toLowerCase().split("@")[0] === user || x.nombre.toLowerCase().split(" ")[0] === user)
        || mockApi.profile();
      setSession({ user: { id: s.auth_user_id || "mock" }, mockStaffId: s.id }); return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    if (MOCK) { setSession(null); setProfile(null); return; }
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const setIdioma = useCallback(async (idioma) => {
    if (!MOCK) await supabase.rpc("set_my_idioma", { p_idioma: idioma });
    setProfile((p) => (p ? { ...p, idioma } : p));
  }, []);

  return { session, profile, profileError, login, logout, setIdioma };
}
