// IDs no adivinables (el original usaba Date.now(), enumerable).
export function newId(prefix = "") {
  const uuid = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  return prefix + uuid.replace(/-/g, "").slice(0, 20);
}
