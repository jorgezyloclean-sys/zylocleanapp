// i18n mínimo sin dependencias. `t(key, vars)` con fallback a español.
// El idioma vive en: staff.idioma (usuario logueado) → localStorage → navegador.
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import es from "./es";
import en from "./en";
import is from "./is";

export const LANGS = [
  { id: "es", label: "Español", short: "ES" },
  { id: "en", label: "English", short: "EN" },
  { id: "is", label: "Íslenska", short: "IS" },
];
const DICTS = { es, en, is };
const STORAGE_KEY = "zyloclean_lang";

export function detectLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DICTS[saved]) return saved;
  } catch { /* sin storage */ }
  const nav = (navigator.language || "es").slice(0, 2);
  return DICTS[nav] ? nav : "es";
}

const I18nCtx = createContext({ lang: "es", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children, initial }) {
  const [lang, setLangState] = useState(initial || detectLang());

  const setLang = useCallback((l) => {
    if (!DICTS[l]) return;
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* sin storage */ }
    document.documentElement.lang = l;
  }, []);

  const t = useCallback((key, vars) => {
    const dict = DICTS[lang] || es;
    let s = dict[key] ?? es[key] ?? key;
    if (vars) {
      if (vars.n === 1 && (dict[`${key}_one`] ?? es[`${key}_one`])) s = dict[`${key}_one`] ?? es[`${key}_one`];
      s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
    }
    return s;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useT() { return useContext(I18nCtx); }
