// Marca ZyloClean. SVG inline para que los colores sigan al tema
// (--brand-dark / --brand-light en index.css). Isotipo y logotipo.
import markSvg from "../assets/mark.svg?raw";
import wordmarkSvg from "../assets/wordmark.svg?raw";

export function Mark({ size = 28, style, className }) {
  return <span className={`brand-mark ${className || ""}`} style={{ display: "inline-flex", width: size, height: size, lineHeight: 0, ...style }} dangerouslySetInnerHTML={{ __html: markSvg }} />;
}

export function Wordmark({ height = 32, style, className }) {
  return <span className={`brand-wordmark ${className || ""}`} style={{ display: "inline-flex", height, lineHeight: 0, ...style }} dangerouslySetInnerHTML={{ __html: wordmarkSvg }} />;
}

/** Isotipo dentro de una pastilla (cabeceras del personal y del portal). */
export function MarkBadge({ size = 36 }) {
  return (
    <span className="brand-badge" style={{ width: size, height: size, borderRadius: size * 0.28, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "var(--brand-badge-bg, rgba(255,255,255,.92))" }}>
      <Mark size={size * 0.6} style={{ "--brand-dark": "#01664E", "--brand-light": "#45B593" }} />
    </span>
  );
}
