// Modo claro / oscuro. Tres estados: light | dark | system. Se aplica como
// data-theme en <html>; los tokens viven en index.css.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const KEY = "zyloclean_theme";
const ThemeCtx = createContext({ theme: "system", resolved: "light", setTheme: () => {} });

function systemDark() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try { return localStorage.getItem(KEY) || "system"; } catch { return "system"; }
  });
  const [sysDark, setSysDark] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const fn = (e) => setSysDark(e.matches);
    mq.addEventListener?.("change", fn);
    return () => mq.removeEventListener?.("change", fn);
  }, []);

  const resolved = theme === "system" ? (sysDark ? "dark" : "light") : theme;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolved);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolved === "dark" ? "#0F1A17" : "#01664E");
  }, [resolved]);

  const setTheme = useCallback((t) => {
    setThemeState(t);
    try { localStorage.setItem(KEY, t); } catch { /* sin storage */ }
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() { return useContext(ThemeCtx); }
