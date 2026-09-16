// Checklists en el idioma del usuario. Administración carga la plantilla en español;
// `traducciones` guarda { en: { nombre, tareas[] }, is: { ... } } alineado por índice.
// Una traducción vacía cae al texto en español, así una plantilla a medio traducir sigue siendo usable.

export const SOURCE_LANG = "es";

export function localizeChecklist(chk, lang) {
  if (!chk || lang === SOURCE_LANG) return chk;
  const tr = chk.traducciones?.[lang];
  if (!tr) return chk;
  return {
    ...chk,
    nombre: tr.nombre?.trim() || chk.nombre,
    tareas: (chk.tareas || []).map((task, i) => tr.tareas?.[i]?.trim() || task),
  };
}

export const localizeChecklists = (list, lang) => (list || []).map((c) => localizeChecklist(c, lang));

// Cuántas tareas + nombre tienen traducción cargada, para mostrar "3/6" en el editor.
export function translationCoverage(chk, lang) {
  const tr = chk?.traducciones?.[lang] || {};
  const total = (chk?.tareas || []).length + 1;
  const done = (tr.nombre?.trim() ? 1 : 0) + (chk?.tareas || []).filter((_, i) => tr.tareas?.[i]?.trim()).length;
  return { done, total };
}

// Aplica la misma operación de lista a las tareas y a cada traducción (mantiene la alineación).
export function mapTareas(chk, fn) {
  const traducciones = {};
  Object.entries(chk.traducciones || {}).forEach(([lang, tr]) => {
    const arr = (chk.tareas || []).map((_, i) => tr?.tareas?.[i] || "");
    traducciones[lang] = { ...tr, tareas: fn(arr, true) };
  });
  return { tareas: fn([...(chk.tareas || [])], false), traducciones };
}
