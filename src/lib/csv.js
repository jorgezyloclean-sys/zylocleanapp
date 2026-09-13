// Export CSV compatible con Excel en español/islandés (BOM UTF-8, ; como separador).
export function toCSV(rows, columns, { sep = ";" } = {}) {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "number" ? String(v).replace(".", ",") : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => esc(c.label)).join(sep);
  const body = rows.map((r) => columns.map((c) => esc(typeof c.value === "function" ? c.value(r) : r[c.value])).join(sep));
  return "﻿" + [head, ...body].join("\r\n");
}

export function downloadFile(filename, content, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
