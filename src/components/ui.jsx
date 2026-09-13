// Primitivas de UI. Todos los colores salen de tokens CSS (ver index.css) para
// que el modo oscuro funcione sin tocar cada componente.
import { useEffect, useRef, useState } from "react";
import {
  X, CheckCircle2, AlertTriangle, Bell, Clock, Activity, Circle, Star, XCircle,
  Sun, Moon, Languages, Inbox,
} from "lucide-react";
import { onToast } from "../lib/toast";
import { useT, LANGS } from "../i18n/index.jsx";
import { useTheme } from "../lib/theme.jsx";
import { signedUrl } from "../lib/storage";
import { durationLabel, initials } from "../lib/format";
import { periodPresets } from "../lib/dates";

/** Tokens como variables CSS, usables en estilos inline. */
export const C = {
  primary: "var(--primary)", mid: "var(--primary-mid)", bright: "var(--primary-bright)",
  pale: "var(--primary-pale)", glow: "var(--primary-glow)", onPrimary: "var(--on-primary)",
  ink: "var(--ink)", muted: "var(--muted)", muted2: "var(--muted-2)",
  bg: "var(--bg)", surface: "var(--surface)", surface2: "var(--surface-2)", surface3: "var(--surface-3)",
  border: "var(--border)", borderSubtle: "var(--border-subtle)",
  amber: "var(--amber)", amberInk: "var(--amber-ink)", amberPale: "var(--amber-pale)", amberBorder: "var(--amber-border)",
  danger: "var(--danger)", dangerInk: "var(--danger-ink)", dangerPale: "var(--danger-pale)", dangerBorder: "var(--danger-border)",
  success: "var(--success)", successInk: "var(--success-ink)", successPale: "var(--success-pale)", successBorder: "var(--success-border)",
  info: "var(--info)", infoPale: "var(--info-pale)",
  neutralInk: "var(--neutral-ink)", neutralPale: "var(--neutral-pale)", neutralBorder: "var(--neutral-border)",
};
export const FONT_DISPLAY = "'Space Grotesk', sans-serif";
export const FONT_MONO = "'IBM Plex Mono', monospace";

/* ------------------------------------------------------------------ Toasts */
export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => onToast((t) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), t.type === "error" ? 6000 : 3500);
  }), []);
  if (!toasts.length) return null;
  return (
    <div className="toast-container" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === "success" && <CheckCircle2 size={16} />}
          {t.type === "error" && <AlertTriangle size={16} />}
          {t.type === "info" && <Bell size={16} />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- Modal */
export function Modal({ title, subtitle, onClose, children, footer, wide, gradient }) {
  const { t } = useT();
  const tClose = () => t("common.close");
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="modal-overlay animate-fadeIn" onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
      <div className="modal-box animate-scaleIn" style={{
        maxWidth: wide ? 760 : 580, width: "100%", maxHeight: "90vh", borderRadius: 16,
        overflow: "hidden", display: "flex", flexDirection: "column",
        border: `1px solid ${C.border}`, boxShadow: "var(--shadow-xl)",
      }}>
        <div style={{
          padding: "20px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexShrink: 0,
          ...(gradient ? { background: "var(--modal-head-bg, linear-gradient(135deg, var(--primary), var(--primary-mid)))", color: "var(--modal-head-fg, var(--on-primary))", borderBottom: "1px solid var(--modal-head-border, transparent)" } : { borderBottom: `1px solid ${C.borderSubtle}` }),
        }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, letterSpacing: "-.2px", lineHeight: 1.3, color: gradient ? "var(--modal-head-fg, var(--on-primary))" : C.ink }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.4, color: gradient ? "inherit" : C.muted, opacity: gradient ? .8 : 1 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="icon-btn" aria-label={tClose()}
            style={{ background: gradient ? "var(--modal-head-btn, rgba(255,255,255,.15))" : C.surface3, color: gradient ? "var(--modal-head-fg, var(--on-primary))" : C.muted, flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && (
          <div style={{ padding: "14px 24px", borderTop: `1px solid ${C.borderSubtle}`, display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0, background: C.surface2 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** Diálogo de confirmación (reemplaza window.confirm). */
export function ConfirmDialog({ open, title, body, confirmLabel, danger, onConfirm, onCancel, busy }) {
  const { t } = useT();
  if (!open) return null;
  return (
    <Modal title={title} onClose={onCancel}
      footer={<>
        <button className="btn-ghost" onClick={onCancel} disabled={busy}>{t("common.cancel")}</button>
        <button className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm} disabled={busy}>
          {busy ? t("common.loading") : (confirmLabel || t("common.confirm"))}
        </button>
      </>}>
      <p style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.5 }}>{body}</p>
    </Modal>
  );
}

/** Hook: `const [confirm, dialog] = useConfirm(); await confirm({title, body})` */
export function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = (opts) => new Promise((resolve) => setState({ ...opts, resolve }));
  const dialog = state ? (
    <ConfirmDialog open title={state.title} body={state.body} confirmLabel={state.confirmLabel} danger={state.danger}
      onConfirm={() => { state.resolve(true); setState(null); }}
      onCancel={() => { state.resolve(false); setState(null); }} />
  ) : null;
  return [confirm, dialog];
}

/* -------------------------------------------------------------------- Form */
export function Field({ label, children, hint, required, error, htmlFor }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={htmlFor} style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, lineHeight: 1.35, display: "flex", alignItems: "center", gap: 3 }}>
        {label}{required && <span style={{ color: C.danger }}>*</span>}
      </label>
      {children}
      {error ? <p role="alert" style={{ fontSize: 11.5, color: C.dangerInk, fontWeight: 500 }}>{error}</p>
        : hint ? <p style={{ fontSize: 11.5, color: C.muted2, lineHeight: 1.4 }}>{hint}</p> : null}
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.ink, cursor: "pointer", minHeight: 36 }}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--primary)" }} />
      {label}
    </label>
  );
}

export function Segmented({ value, onChange, options, ariaLabel }) {
  return (
    <div className="seg" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <button key={o.id} role="tab" aria-selected={value === o.id} className={value === o.id ? "active" : ""} onClick={() => onChange(o.id)}>
            {Icon && <Icon size={14} />}{o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ Badges */
const ESTADO_STYLE = {
  programado:   { bg: C.neutralPale, color: C.neutralInk, border: C.neutralBorder, Icon: Clock },
  en_curso:     { bg: C.amberPale,   color: C.amberInk,   border: C.amberBorder,   Icon: Activity },
  finalizado:   { bg: C.successPale, color: C.successInk, border: C.successBorder, Icon: CheckCircle2 },
  no_realizado: { bg: C.dangerPale,  color: C.dangerInk,  border: C.dangerBorder,  Icon: XCircle },
  incidente:    { bg: C.dangerPale,  color: C.dangerInk,  border: C.dangerBorder,  Icon: AlertTriangle },
  activo:       { bg: C.successPale, color: C.successInk, border: C.successBorder, Icon: CheckCircle2 },
  inactivo:     { bg: C.neutralPale, color: C.neutralInk, border: C.neutralBorder, Icon: Circle },
};
export const ESTADO_DOT = {
  programado: "var(--neutral-ink)", en_curso: "var(--amber)", finalizado: "var(--success)", no_realizado: "var(--danger)",
};

export function StatusBadge({ estado, size = "md", label }) {
  const { t } = useT();
  const m = ESTADO_STYLE[estado] || ESTADO_STYLE.programado;
  const Icon = m.Icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: size === "sm" ? "2px 8px" : "4px 10px",
      borderRadius: 100, background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      fontSize: size === "sm" ? 10.5 : 11.5, fontWeight: 600, letterSpacing: ".02em", whiteSpace: "nowrap",
    }}>
      <Icon size={size === "sm" ? 10 : 12} />{label || t(`estado.${estado}`)}
    </span>
  );
}

export function Pill({ children, tone = "primary", icon: Icon }) {
  const tones = {
    primary: { bg: C.pale, color: C.primary, border: "transparent" },
    amber: { bg: C.amberPale, color: C.amberInk, border: C.amberBorder },
    danger: { bg: C.dangerPale, color: C.dangerInk, border: C.dangerBorder },
    neutral: { bg: C.neutralPale, color: C.neutralInk, border: C.neutralBorder },
    success: { bg: C.successPale, color: C.successInk, border: C.successBorder },
  }[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: tones.bg, color: tones.color, border: `1px solid ${tones.border}`, whiteSpace: "nowrap" }}>
      {Icon && <Icon size={10} />}{children}
    </span>
  );
}

export function StarRating({ value, empty, size = 12 }) {
  const { t } = useT();
  if (value === null || value === undefined) {
    return <span style={{ fontSize: 11, color: C.muted2, fontStyle: "italic" }}>{empty ?? t("emp.unrated")}</span>;
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }} aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} fill={s <= Math.round(value) ? "var(--amber)" : "none"} color={s <= Math.round(value) ? "var(--amber)" : "var(--border)"} />
      ))}
      <span className="tabular" style={{ fontSize: 11, color: C.muted, marginLeft: 4, fontWeight: 600 }}>{value}</span>
    </span>
  );
}

export function Avatar({ name = "?", size = 36, bg = C.pale, color = C.primary }) {
  return (
    <div aria-hidden style={{
      width: size, height: size, borderRadius: "50%", background: bg, color, display: "flex", alignItems: "center",
      justifyContent: "center", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: size * 0.35, flexShrink: 0,
    }}>{initials(name)}</div>
  );
}

export function ProgressRing({ value, size = 60, stroke = 6 }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} role="img" aria-label={`${value}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--primary-bright)" strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .9s cubic-bezier(.16,1,.3,1)" }} />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fontSize={size * 0.22} fontFamily={FONT_MONO} fontWeight="500" fill="var(--ink)">{value}%</text>
    </svg>
  );
}

export function ProgressBar({ value, height = 8 }) {
  return (
    <div className="progress-track" style={{ height }} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function LiveTimer({ startTime }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return <span className="tabular" style={{ fontFamily: FONT_MONO }}>{durationLabel(now - new Date(startTime).getTime())}</span>;
}

export function EmptyState({ icon: Icon = Inbox, title, body, action }) {
  return (
    <div className="empty">
      <Icon size={32} />
      <p style={{ fontWeight: 600, color: C.ink, fontSize: 14 }}>{title}</p>
      {body && <p style={{ marginTop: 4 }}>{body}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export function Banner({ tone = "warn", icon: Icon = AlertTriangle, children }) {
  return <div className={`banner ${tone}`}><Icon size={15} style={{ flexShrink: 0, marginTop: 1 }} /><div>{children}</div></div>;
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="page-header" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(1.1rem, 3.5vw, 1.5rem)", fontWeight: 700, color: C.ink, letterSpacing: "-.4px", lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>{action}</div>}
    </div>
  );
}

export function KpiCard({ icon: Icon, label, value, sub, tone = C.primary, delay = 0 }) {
  return (
    <div className="stat-card animate-fadeUp" style={{ animationDelay: `${delay}ms` }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, marginBottom: 14, background: C.pale, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={19} color={tone} />
      </div>
      <p className="kpi-value">{value}</p>
      <p className="kpi-label">{label}</p>
      {sub && <p className="kpi-sub" style={{ color: tone }}>{sub}</p>}
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.muted, fontSize: 13, padding: 24, justifyContent: "center" }}>
      <span className="animate-spin" style={{ width: 16, height: 16, border: `2px solid ${C.border}`, borderTopColor: C.primary, borderRadius: "50%", display: "inline-block" }} />
      {label}
    </div>
  );
}

/* ----------------------------------------------------------- Fotos firmadas */
export function SignedImg({ bucket, path, alt = "", style, onClick }) {
  const [url, setUrl] = useState(null);
  useEffect(() => { let alive = true; signedUrl(bucket, path).then((u) => alive && setUrl(u)); return () => { alive = false; }; }, [bucket, path]);
  if (!url) return <div style={{ ...style, background: C.surface3, borderRadius: 8 }} aria-hidden />;
  return <img src={url} alt={alt} loading="lazy" style={style} onClick={onClick} />;
}

export function PhotoLink({ bucket, path, children }) {
  const [url, setUrl] = useState(null);
  useEffect(() => { let alive = true; signedUrl(bucket, path).then((u) => alive && setUrl(u)); return () => { alive = false; }; }, [bucket, path]);
  return <a href={url || "#"} target="_blank" rel="noopener noreferrer" style={{ display: "block", position: "relative" }}>{children}</a>;
}

/* ------------------------------------------------------ Selector de período */
export function PeriodPicker({ value, onChange }) {
  const { t } = useT();
  const presets = periodPresets();
  const opts = [
    { id: "hoy", label: t("period.today") }, { id: "semana", label: t("period.week") }, { id: "mes", label: t("period.month") },
    { id: "mes_pasado", label: t("period.lastMonth") }, { id: "trimestre", label: t("period.quarter") }, { id: "custom", label: t("period.range") },
  ];
  const active = opts.find((o) => o.id !== "custom" && presets[o.id].from === value.from && presets[o.id].to === value.to)?.id || "custom";
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
      <Segmented ariaLabel={t("period.label")} value={active} options={opts}
        onChange={(id) => { if (id !== "custom") onChange(presets[id]); }} />
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="date" className="input-base" style={{ width: 150 }} value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} aria-label={t("common.from")} />
        <span style={{ color: C.muted, fontSize: 12 }}>→</span>
        <input type="date" className="input-base" style={{ width: 150 }} value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} aria-label={t("common.to")} />
      </div>
    </div>
  );
}

/* ------------------------------------------------- Idioma y tema (toolbar) */
export function LangSwitch({ compact, onChangeExtra }) {
  const { lang, setLang, t } = useT();
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }} title={t("common.language")}>
      <Languages size={14} color="currentColor" style={{ opacity: .7 }} />
      <select value={lang} onChange={(e) => { setLang(e.target.value); onChangeExtra?.(e.target.value); }} aria-label={t("common.language")}
        style={{ background: "transparent", border: "none", color: "inherit", font: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        {LANGS.map((l) => <option key={l.id} value={l.id} style={{ color: "#000" }}>{compact ? l.short : l.label}</option>)}
      </select>
    </label>
  );
}

export function ThemeSwitch() {
  const { resolved, setTheme } = useTheme();
  const { t } = useT();
  const dark = resolved === "dark";
  const label = dark ? t("common.theme.light") : t("common.theme.dark");
  return (
    <button type="button" className="icon-btn" onClick={() => setTheme(dark ? "light" : "dark")} title={label} aria-label={label}
      style={{ background: "var(--surface-3)", color: "var(--muted)", width: 36, height: 36 }}>
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

/** Autofocus + Enter para inputs de una línea. */
export function useAutoFocus() {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return ref;
}
