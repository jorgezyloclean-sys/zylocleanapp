// Toasts sin acoplar componentes: un pequeño bus de eventos.
const listeners = new Set();

export function toast(msg, type = "success") {
  const t = { id: `${Date.now()}-${Math.random()}`, msg, type };
  listeners.forEach((fn) => fn(t));
}
export function onToast(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Ejecuta una operación async, muestra error si falla y devuelve ok/false. */
export async function run(fn, { ok, err = "Error al guardar" } = {}) {
  try {
    const r = await fn();
    if (ok) toast(ok);
    return r === undefined ? true : r;
  } catch (e) {
    console.error(e);
    toast(`${err}: ${e?.message || e}`, "error");
    return false;
  }
}
