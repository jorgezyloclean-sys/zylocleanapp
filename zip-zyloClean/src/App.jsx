import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient";
import {
  LayoutDashboard, Users, UserCog, CalendarDays, ClipboardCheck,
  BarChart3, LogOut, Plus, X, Pencil, Trash2, Phone,
  Wifi, ShieldAlert, Camera, ChevronRight,
  CheckCircle2, Circle, AlertTriangle, Search, Building2, Sparkles,
  Clock, TrendingUp, Star, Languages, KeyRound, Lock, User,
  Bell, ChevronDown, Zap, Heart, Package,
  RefreshCw, Send, ThumbsUp, Calendar, ArrowRight, CheckCheck,
  Truck, Shield, Award, Activity,
  FileText, Settings, Eye,
  MessageSquare, Smile, Frown, Meh,
  History, MapPin, ImageIcon,
} from "lucide-react";
import zyloLogo from "./assets/zylo-logo-header.svg";
import zylo from "./assets/zylo.svg";
import Logo from "./assets/logo-cropped.svg";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart,
} from "recharts";

const C = {
  primary: "#01664E",
  mid: "#018060",
  bright: "#45B593",
  pale: "#E8F7F3",
  glow: "rgba(69,181,147,.25)",
  amber: "#E8943A",
  danger: "#D04040",
  ink: "#0A1F1A",
  muted: "#6B8A84",
};

const SERVICE_TYPES = [
  "Limpieza comercial / oficinas",
  "Limpieza de locales / retail",
  "Limpieza industrial",
  "Renta de corta estancia (Airbnb)",
  "Limpieza de mudanza",
  "Asociación de propietarios",
  "Post-construcción",
];

const PIE_COLORS = [C.primary, C.amber, C.danger];

const DEMO_USERS = {
  admin: { user: "admin", pass: "zylo2026", nombre: "Administración" },
  personal: { user: "ana", pass: "1234", nombre: "Ana Torres", empleadoId: "e1" },
};
function formatDuration(ms) {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function jobsForClient(jobs, clientId) {
  return jobs.filter((j) => j.clienteId === clientId);
}
function jobsForStaff(jobs, staffId) {
  return jobs.filter((j) => j.empleados && j.empleados.includes(staffId));
}
function avgRating(jobsList) {
  const rated = jobsList.filter((j) => typeof j.rating === "number" && j.rating > 0);
  if (!rated.length) return null;
  return Math.round((rated.reduce((s, j) => s + j.rating, 0) / rated.length) * 10) / 10;
}
function complianceRate(jobsList) {
  if (!jobsList.length) return 0;
  const completed = jobsList.filter((j) => j.estado === "completo").length;
  return Math.round((completed / jobsList.length) * 100);
}
function jobHours(job) {
  if (!job.horaInicio || !job.horaFin) return 0;
  return (new Date(job.horaFin) - new Date(job.horaInicio)) / 3_600_000;
}
function jobDate(job) {
  return job.created_at ? new Date(job.created_at) : null;
}
function monthLabel(date) {
  return date.toLocaleDateString("es-AR", { month: "short" }).replace(".", "");
}

function LiveTimer({ startTime }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono-data">{formatDuration(now - new Date(startTime).getTime())}</span>;
}
let _addToast = () => { };
function useToastSetter(fn) { _addToast = fn; }
function toast(msg, type = "success") { _addToast({ msg, type, id: Date.now() }); }

async function sendNotificationEmail({ to, subject, html, type = "general" }) {
  if (!to) return;
  try {
    await supabase.functions.invoke("send-email", {
      body: { to, subject, html, type },
    });
  } catch (err) {
    console.warn("[Email] Error enviando notificación:", err);
  }
}

function emailJobAssigned({ client, job, assignedStaff }) {
  const staffNames = assignedStaff.map(s => s.nombre).join(", ") || "Tu equipo de limpieza";

  const COLORS = {
    bg: "#F2F8F6",
    surface: "#FFFFFF",
    surfaceSoft: "#E8F7F3",
    primary: "#01664E",
    primaryDark: "#0A1F1A",
    textMuted: "#6B8A84",
  };

  const detailRow = (icon, label, value) => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #D5EDE7;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 28px; font-size: 16px; vertical-align: middle;">${icon}</td>
            <td style="vertical-align: middle;">
              <div style="font-size: 11px; font-weight: 600; color: ${COLORS.textMuted}; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px;">
                ${label}
              </div>
              <div style="font-size: 14px; font-weight: 600; color: ${COLORS.primaryDark};">
                ${value}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: ${COLORS.bg}; border-radius: 16px; overflow: hidden;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #01664E, #018060); padding: 32px; text-align: center;">
        <h1 style="color: #fff; font-size: 22px; font-weight: 700; margin: 0 0 6px;">🌿 ZyloClean</h1>
        <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 0; letter-spacing: 0.02em;">
          NOTIFICACIÓN DE SERVICIO
        </p>
      </div>

      <!-- Body -->
      <div style="background: ${COLORS.surface}; padding: 32px;">
        <h2 style="color: ${COLORS.primaryDark}; font-size: 18px; font-weight: 700; margin: 0 0 8px;">
          ¡Hola, ${client.nombre}! 👋
        </h2>
        <p style="color: ${COLORS.textMuted}; font-size: 14px; line-height: 1.6; margin: 0 0 22px;">
          Te confirmamos que hemos programado una visita de limpieza para vos.
        </p>

        <!-- Details card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="background: ${COLORS.surfaceSoft}; border-radius: 12px; padding: 4px 20px;">
          ${detailRow("📅", "Fecha", job.fecha)}
          ${detailRow("🕐", "Hora", job.hora)}
          <tr><td style="padding: 10px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width: 28px; font-size: 16px; vertical-align: middle;">👥</td>
                <td style="vertical-align: middle;">
                  <div style="font-size: 11px; font-weight: 600; color: ${COLORS.textMuted}; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px;">
                    Equipo
                  </div>
                  <div style="font-size: 14px; font-weight: 600; color: ${COLORS.primaryDark};">
                    ${staffNames}
                  </div>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>

        <p style="color: ${COLORS.textMuted}; font-size: 13px; line-height: 1.6; margin: 22px 0 0;">
          Si tenés alguna consulta, no dudes en contactarnos. ¡Nos vemos pronto! ✨
        </p>
      </div>

      <!-- Footer -->
      <div style="background: ${COLORS.surfaceSoft}; padding: 16px 32px; text-align: center;">
        <p style="color: ${COLORS.primary}; font-size: 12px; margin: 0; font-weight: 500;">
          ZyloClean — Servicio profesional de limpieza
        </p>
      </div>
    </div>
  `;

  return sendNotificationEmail({
    to: client.email,
    subject: `✅ Limpieza programada — ${job.fecha} a las ${job.hora}`,
    html,
    type: "job_assigned",
  });
}

function emailJobCompleted({ client, job }) {
  const duration = job.horaInicio && job.horaFin
    ? `${((new Date(job.horaFin) - new Date(job.horaInicio)) / 3600000).toFixed(1)} horas`
    : "";
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #F2F8F6; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #01664E, #45B593); padding: 28px 32px; text-align: center;">
        <h1 style="color: #fff; font-size: 22px; font-weight: 700; margin: 0 0 6px;">🌿 ZyloClean</h1>
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0;">¡Servicio completado!</p>
      </div>
      <div style="background: #fff; padding: 28px 32px; text-align: center;">
        <div style="width: 72px; height: 72px; background: #E8F7F3; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 32px;">✅</div>
        <h2 style="color: #0A1F1A; font-size: 20px; font-weight: 700; margin: 0 0 8px;">¡Tu limpieza está lista!</h2>
        <p style="color: #6B8A84; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          El equipo de ZyloClean terminó de limpiar tu espacio el día <strong>${job.fecha}</strong>.
          ${duration ? `Duración total: <strong>${duration}</strong>.` : ""}
        </p>
        <div style="background: #E8F7F3; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; text-align: left;">
          <p style="color: #01664E; font-size: 13px; font-weight: 600; margin: 0;">💬 ¿Cómo fue tu experiencia?</p>
          <p style="color: #6B8A84; font-size: 13px; margin: 6px 0 0;">Podés calificar el servicio accediendo a tu portal de cliente.</p>
        </div>
        <p style="color: #6B8A84; font-size: 13px;">¡Gracias por confiar en ZyloClean! 🙏</p>
      </div>
      <div style="background: #E8F7F3; padding: 16px 32px; text-align: center;">
        <p style="color: #01664E; font-size: 12px; margin: 0; font-weight: 500;">ZyloClean — Servicio profesional de limpieza</p>
      </div>
    </div>
  `;
  return sendNotificationEmail({ to: client.email, subject: `🎉 ¡Tu limpieza del ${job.fecha} está completa!`, html, type: "job_completed" });
}

function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useToastSetter((t) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3500);
  });
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
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

function Confetti({ active }) {
  if (!active) return null;
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    bg: [C.bright, C.amber, "#fff", C.primary, "#FFD700"][Math.floor(Math.random() * 5)],
    delay: `${Math.random() * 1}s`,
    size: `${6 + Math.random() * 8}px`,
  }));
  return (
    <>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{ left: p.left, background: p.bg, animationDelay: p.delay, width: p.size, height: p.size }}
        />
      ))}
    </>
  );
}

function ProgressRing({ value, size = 60, stroke = 6, color = C.bright, bg = "#E8F7F3" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke={bg} strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .9s cubic-bezier(.16,1,.3,1)" }}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fontSize={size * 0.22}
        fontFamily="'IBM Plex Mono',monospace" fontWeight="500" fill={C.ink}>
        {value}%
      </text>
    </svg>
  );
}

function StatusBadge({ estado, size = "md" }) {
  const map = {
    completo: { label: "Completo", bg: "#EDFBF2", color: "#1A7A42", border: "#A8E8C0", Icon: CheckCircle2 },
    en_curso: { label: "En curso", bg: "#FDF3E7", color: "#B86810", border: "#F5C882", Icon: Activity },
    pendiente: { label: "Pendiente", bg: "#F4F6F5", color: "#6B8A84", border: "#D0DDD9", Icon: Clock },
    incidente: { label: "Incidente", bg: "#FEF0F0", color: "#C03030", border: "#F5AAAA", Icon: AlertTriangle },
    activo: { label: "Activo", bg: "#EDFBF2", color: "#1A7A42", border: "#A8E8C0", Icon: CheckCircle2 },
    inactivo: { label: "Inactivo", bg: "#F4F6F5", color: "#6B8A84", border: "#D0DDD9", Icon: Circle },
  };
  const m = map[estado] || map.pendiente;
  const Icon = m.Icon;
  const pad = size === "sm" ? "2px 8px" : "4px 10px";
  const fs = size === "sm" ? 10 : 11;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: pad, borderRadius: 100,
      background: m.bg, color: m.color,
      border: `1px solid ${m.border}`,
      fontSize: fs, fontWeight: 600, letterSpacing: ".02em",
      whiteSpace: "nowrap",
    }}>
      <Icon size={size === "sm" ? 10 : 12} />
      {m.label}
    </span>
  );
}

function StarRating({ value, empty = "Sin calificar" }) {
  if (value === null || value === undefined) {
    return <span style={{ fontSize: 11, color: "#B0C8C0", fontStyle: "italic" }}>{empty}</span>;
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={12}
          fill={s <= Math.round(value) ? C.amber : "none"}
          color={s <= Math.round(value) ? C.amber : "#C8D8D4"}
        />
      ))}
      <span style={{ fontSize: 11, color: C.muted, marginLeft: 4, fontWeight: 600 }}>{value}</span>
    </span>
  );
}

function Avatar({ name, size = 36, bg = C.pale, color = C.primary }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
      fontSize: size * 0.35, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function Modal({ title, subtitle, onClose, children, footer, wide, gradient }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fn);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="modal-overlay animate-fadeIn"
      style={{ background: "rgba(10,31,26,.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal-box animate-scaleIn"
        style={{
          maxWidth: wide ? 720 : 580,
          width: "100%",
          maxHeight: "88vh",
          borderRadius: 14,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 1px 2px rgba(10,31,26,.06), 0 16px 40px rgba(10,31,26,.16)",
          border: "1px solid #E4EEEA",
        }}
      >
        <div
          style={{
            padding: "22px 28px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 20,
            flexShrink: 0,
            ...(gradient
              ? { background: `linear-gradient(135deg, ${C.primary}, ${C.mid})`, color: "#fff" }
              : { borderBottom: "1px solid #EEF3F1" }),
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h3 style={{
              fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 700,
              letterSpacing: "-.2px", lineHeight: 1.3,
              color: gradient ? "#fff" : C.ink,
            }}>
              {title}
            </h3>
            {subtitle && (
              <p style={{
                fontSize: 12.5, marginTop: 4, lineHeight: 1.4,
                color: gradient ? "rgba(255,255,255,.75)" : C.muted,
              }}>
                {subtitle}
              </p>
            )}
          </div>

          <button onClick={onClose} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer",
            flexShrink: 0, marginTop: 2,
            background: gradient ? "rgba(255,255,255,.15)" : "#F2F8F6",
            color: gradient ? "#fff" : C.muted,
            transition: "background .15s",
          }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
          {children}
        </div>

        {footer && (
          <div style={{
            padding: "16px 28px",
            borderTop: "1px solid #EEF3F1",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            flexShrink: 0,
            background: "#FAFCFB",
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, hint, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <label style={{
        fontSize: 12.5,
        fontWeight: 600,
        color: C.ink,
        lineHeight: 1.35,
        minHeight: 34,
        display: "flex",
        alignItems: "flex-end",
      }}>
        {label}
        {required && <span style={{ color: C.danger, marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11.5, color: "#9BBAB4", lineHeight: 1.4, marginTop: 2 }}>{hint}</p>}
    </div>
  );
}

function FormRow({ columns = 2, children }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: "18px 16px",
      alignItems: "start",
    }}>
      {children}
    </div>
  );
}

function LoginScreen({ onLogin, staff }) {
  const [role, setRole] = useState("admin");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const roles = [
    { id: "admin", label: "Admin", icon: UserCog, color: "#01664E" },
    { id: "personal", label: "Personal", icon: Users, color: "#018060" },
  ];

  function handleSubmit(e) {
    e.preventDefault();
    if (!user.trim() || !pass.trim()) { setError("Completá usuario y contraseña."); return; }

    if (role === "admin") {
      const demo = DEMO_USERS.admin;
      if (user === demo.user && pass === demo.pass) {
        setLoading(true);
        setTimeout(() => { setError(""); onLogin({ role: "admin", nombre: demo.nombre }); }, 800);
      } else {
        setError("Usuario o contraseña incorrectos.");
      }
      return;
    }

    const match = staff.find((s) => s.usuario === user && s.password === pass);
    if (match) {
      setLoading(true);
      setTimeout(() => { setError(""); onLogin({ role: "personal", nombre: match.nombre, empleadoId: match.id }); }, 800);
    } else {
      setError("Usuario o contraseña incorrectos.");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: `#FCFCFB`,
      padding: 16, position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: -120, left: -80, width: 400, height: 400,
          borderRadius: "50%", background: C.primary, opacity: .18, filter: "blur(80px)"
        }} />
        <div style={{
          position: "absolute", bottom: -100, right: -60, width: 360, height: 360,
          borderRadius: "50%", background: C.bright, opacity: .12, filter: "blur(80px)"
        }} />
        <div style={{
          position: "absolute", top: "40%", right: "10%", width: 200, height: 200,
          borderRadius: "50%", background: C.amber, opacity: .08, filter: "blur(60px)"
        }} />
      </div>

      <div className="animate-fadeUp" style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src={zyloLogo} alt="ZyloClean"
            style={{ marginBottom: 14, filter: `drop-shadow(0 12px 40px ${C.glow})` }} />
          <p style={{ color: "rgba(255,255,255,.45)", fontSize: 13, marginTop: 4 }}>
            Panel de gestión operativa • Demo
          </p>
        </div>

        <div style={{
          background: "rgba(255,255,255,.96)", borderRadius: 22,
          boxShadow: "0 24px 80px rgba(0,0,0,.25)",
          padding: 28,
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
            background: "#F2F8F6", borderRadius: 14, padding: 6, marginBottom: 24,
          }}>
            {roles.map((r) => {
              const Icon = r.icon;
              const active = role === r.id;
              return (
                <button key={r.id} type="button"
                  onClick={() => { setRole(r.id); setError(""); setUser(""); setPass(""); }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                    padding: "10px 4px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: active ? "#fff" : "transparent",
                    color: active ? r.color : "#8AADA6",
                    boxShadow: active ? "0 2px 8px rgba(0,0,0,.08)" : "none",
                    fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 600,
                    transition: "all .2s",
                  }}>
                  <Icon size={17} />
                  {r.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Usuario">
              <div style={{ position: "relative" }}>
                <User size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted }} />
                <input className="input-base" value={user} onChange={(e) => setUser(e.target.value)}
                  placeholder={DEMO_USERS[role].user} style={{ paddingLeft: 36 }} />
              </div>
            </Field>
            <Field label="Contraseña">
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted }} />
                <input type="password" className="input-base" value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••" style={{ paddingLeft: 36 }} />
              </div>
            </Field>

            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.danger, fontSize: 12, fontWeight: 500 }}>
                <AlertTriangle size={13} /> {error}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}
              style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
              {loading ? <RefreshCw size={15} className="animate-spin" /> : <KeyRound size={15} />}
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { id: "dashboard", label: "Panel", icon: LayoutDashboard },
  { id: "clientes", label: "Clientes", icon: Building2 },
  { id: "personal", label: "Personal", icon: Users },
  { id: "programacion", label: "Programación", icon: CalendarDays },
  { id: "checklists", label: "Checklists", icon: ClipboardCheck },
  { id: "reportes", label: "Reportes", icon: BarChart3 },
];

function AdminShell({ session, onLogout, children, page, setPage }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F2F8F6" }}>
      {mobileMenuOpen && (
        <div
          className="admin-mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`admin-sidebar ${mobileMenuOpen ? "admin-sidebar--open" : ""}`} style={{
        width: collapsed ? 68 : 224,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "0 4px", marginBottom: 28,
          overflow: "hidden",
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img src={Logo} alt="ZyloClean" style={{ height: 20 }} />
          </div>
          {!collapsed && (
            <div className="animate-fadeIn">
              <img src={zylo} alt="ZyloClean" style={{ height: 18 }} />
              <p style={{ fontSize: 10, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".1em" }}>Panel Admin</p>
            </div>
          )}
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => { setPage(item.id); setMobileMenuOpen(false); }}
                className={`nav-item ${active ? "active" : ""}`}
                title={collapsed ? item.label : undefined}
                style={{ justifyContent: collapsed ? "center" : "flex-start" }}>
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && active && <ChevronRight size={13} style={{ marginLeft: "auto", color: C.bright, opacity: .8 }} />}
              </button>
            );
          })}
        </nav>

        {!collapsed && (
          <div style={{
            background: "rgba(255,255,255,.06)", borderRadius: 14,
            padding: "12px 14px", marginTop: 12,
          }} className="animate-fadeIn">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Avatar name={session.nombre} size={32} bg={C.primary} color="#fff" />
              <div style={{ overflow: "hidden" }}>
                <p style={{ color: "#fff", fontWeight: 600, fontSize: 12, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {session.nombre}
                </p>
                <p style={{ color: "rgba(255,255,255,.4)", fontSize: 10 }}>Administración</p>
              </div>
            </div>
            <button onClick={onLogout} style={{
              display: "flex", width: "100%", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,.08)", border: "none", borderRadius: 10,
              padding: "7px 10px", color: "rgba(255,255,255,.6)", fontSize: 12,
              fontWeight: 500, cursor: "pointer", transition: "all .15s",
              fontFamily: "'Inter',sans-serif",
            }}>
              <LogOut size={13} /> Cerrar sesión
            </button>
          </div>
        )}

        <button onClick={() => setCollapsed(!collapsed)} className="sidebar-collapse-btn">
          <ChevronRight size={12} color={C.muted} style={{ transform: collapsed ? "" : "rotate(180deg)", transition: "transform .2s" }} />
        </button>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header className="admin-mobile-header">
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 40, height: 40, borderRadius: 10, border: "none",
              background: C.pale, color: C.primary, cursor: "pointer",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <img src={zyloLogo} alt="ZyloClean" style={{ height: 28 }} />
          <button onClick={onLogout} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 40, height: 40, borderRadius: 10, border: "none",
            background: "#FEF0F0", color: C.danger, cursor: "pointer",
          }}>
            <LogOut size={16} />
          </button>
        </header>

        <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }} className="admin-main">
          {children}
        </main>
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div
      className="page-header"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 24,
      }}
    >
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "clamp(1.1rem, 3.5vw, 1.5rem)", fontWeight: 700, color: C.ink, letterSpacing: "-.4px", lineHeight: 1.2 }}>
          {title}
        </h1>
        {subtitle && <p style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{subtitle}</p>}
      </div>
      {action && (
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {action}
        </div>
      )}
    </div>
  );
}

function Dashboard({ clients, staff, jobs }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((v) => v + 1), 5000); return () => clearInterval(t); }, []);

  const kpis = [
    { label: "Clientes activos", value: clients.length, icon: Building2, color: C.primary, sub: "+1 este mes" },
    { label: "Trabajos hoy", value: jobs.length, icon: Clock, color: C.bright, sub: `${jobs.filter(j => j.estado === "en_curso").length} en curso` },
    { label: "Personal en calle", value: staff.length, icon: Users, color: "#5B7CED", sub: "Todos disponibles" },
    { label: "Incidentes abiertos", value: jobs.filter((j) => j.estado === "incidente").length, icon: ShieldAlert, color: C.danger, sub: "Requiere atención" },
  ];

  const completados = jobs.filter(j => j.estado === "completo").length;
  const avg = jobs.length > 0 ? Math.round((completados / jobs.length) * 100) : 0;

  const recentRatings = useMemo(() => {
    return jobs
      .filter((j) => typeof j.rating === "number" && j.rating > 0)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5);
  }, [jobs]);

  const overallAvgRating = avgRating(jobs);
  const openIncidents = jobs.filter((j) => j.estado === "incidente");

  return (
    <div>
      <PageHeader
        title="Panel general"
        subtitle={`Estado de la operación — ${new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}`}
        action={
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: C.pale, borderRadius: 10, padding: "6px 14px", fontSize: 12, color: C.primary, fontWeight: 600
          }}>
            <div className="live-dot" style={{ width: 8, height: 8 }} />
            En vivo
          </div>
        }
      />

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={`stat-card animate-fadeUp delay-${i * 75}`}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, marginBottom: 14,
                background: `${k.color}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={19} color={k.color} />
              </div>
              <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 28, fontWeight: 500, color: C.ink, lineHeight: 1 }}>{k.value}</p>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{k.label}</p>
              <p style={{ fontSize: 11, color: k.color, marginTop: 6, fontWeight: 500 }}>{k.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="dashboard-body-grid">
        <div className="card animate-fadeUp delay-150">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 700, color: C.ink }}>Trabajos de hoy</h3>
            <span style={{ fontSize: 11, color: C.muted, background: "#F2F8F6", padding: "3px 10px", borderRadius: 20 }}>
              {new Date().toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {jobs.map((job, i) => {
              const client = clients.find((c) => c.id === job.clienteId);
              const emps = job.empleados ? job.empleados.map(eid => staff.find(s => s.id === eid)).filter(Boolean) : [];
              const empsText = emps.length > 0 ? emps.map(e => e.nombre).join(", ") : "Sin asignar";

              const checkedCount = job.tareasCompletadas ? Object.values(job.tareasCompletadas).filter(Boolean).length : 0;
              const cumplimiento = job.estado === "completo" ? 100 : (checkedCount > 0 ? 50 : 0);

              return (
                <div key={job.id} className={`animate-fadeUp`} style={{
                  animationDelay: `${i * 60}ms`,
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 14px", borderRadius: 14,
                  border: `1.5px solid ${job.estado === "incidente" ? "#F5AAAA" : job.estado === "en_curso" ? "#F5C882" : "#E8F0ED"}`,
                  background: job.estado === "incidente" ? "#FEF8F8" : job.estado === "en_curso" ? "#FDF8EE" : "#fff",
                }}>
                  <span className="font-mono-data" style={{ fontSize: 12, color: C.muted, width: 44, flexShrink: 0 }}>{job.hora}</span>
                  <Avatar name={client?.nombre || "?"} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {client?.nombre || "Cliente Eliminado"}
                    </p>
                    <p style={{ fontSize: 11, color: C.muted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{empsText}</p>
                    {job.motivo && (
                      <p style={{ fontSize: 11, color: C.danger, marginTop: 2, fontWeight: 500 }}>⚠ {job.motivo}</p>
                    )}
                  </div>
                  {job.rating ? (
                    <StarRating value={job.rating} />
                  ) : null}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <StatusBadge estado={job.estado} />
                    {cumplimiento > 0 && (
                      <div style={{ width: 80 }}>
                        <div className="progress-track" style={{ height: 4 }}>
                          <div className="progress-fill" style={{ width: `${cumplimiento}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {jobs.length === 0 && (
              <p style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: 20 }}>No hay trabajos programados para hoy.</p>
            )}
          </div>

          {openIncidents.length > 0 && (
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid #EAF4F1" }}>
              <h4 style={{
                display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700,
                color: C.danger, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".04em"
              }}>
                <ShieldAlert size={14} /> Incidentes que requieren atención
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {openIncidents.map((job) => {
                  const client = clients.find((c) => c.id === job.clienteId);
                  return (
                    <div key={job.id} style={{
                      display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px",
                      borderRadius: 12, background: "#FEF8F8", border: "1px solid #F5C0C0",
                    }}>
                      <AlertTriangle size={15} color={C.danger} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{client?.nombre || "Cliente eliminado"}</p>
                        <p style={{ fontSize: 12, color: C.danger, marginTop: 1 }}>{job.motivo || "Sin descripción"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card animate-fadeUp delay-225">
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 14 }}>
              Cumplimiento hoy
            </h3>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <ProgressRing value={avg} size={100} stroke={9} />
              <p style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>Promedio de tareas completadas</p>
            </div>
          </div>

          <div className="card animate-fadeUp delay-262">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: C.ink }}>
                Satisfacción de clientes
              </h3>
              {overallAvgRating && <StarRating value={overallAvgRating} />}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentRatings.length === 0 && (
                <p style={{ fontSize: 12, color: C.muted }}>Todavía no hay calificaciones de clientes.</p>
              )}
              {recentRatings.map((job) => {
                const client = clients.find((c) => c.id === job.clienteId);
                return (
                  <div key={job.id} style={{
                    display: "flex", flexDirection: "column", gap: 3,
                    padding: "8px 10px", borderRadius: 10,
                    background: job.rating <= 2 ? "#FEF8F8" : "#FAFCFB",
                    border: `1px solid ${job.rating <= 2 ? "#F5C0C0" : "#EAF4F1"}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{client?.nombre || "Cliente"}</span>
                      <StarRating value={job.rating} />
                    </div>
                    {job.comentario && (
                      <p style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>"{job.comentario}"</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card animate-fadeUp delay-300">
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 12 }}>
              Destacados del mes
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {staff.filter((s) => s.destacado).map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={s.nombre} size={34} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{s.nombre}</p>
                    <p style={{ fontSize: 11, color: C.muted }}>{s.tipo}</p>
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    background: "#FDF3E7", borderRadius: 8, padding: "3px 8px"
                  }}>
                    <Star size={11} fill={C.amber} color={C.amber} />
                    <span style={{ fontSize: 11, color: C.amber, fontWeight: 700 }}>Top</span>
                  </div>
                </div>
              ))}
              {staff.filter((s) => s.destacado).length === 0 && (
                <p style={{ fontSize: 12, color: C.muted }}>Nadie marcado como destacado todavía.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientsPage({ clients, setClients, checklists, jobs, staff }) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [view, setView] = useState("cards");

  const filtered = useMemo(() =>
    clients.filter((c) =>
      c.nombre.toLowerCase().includes(query.toLowerCase()) ||
      c.rubro.toLowerCase().includes(query.toLowerCase())
    ), [clients, query]);

  async function saveClient(form) {
    const isNew = modal.mode === "new";
    const data = isNew
      ? { ...form, rating: 5, totalVisitas: 0, proximaVisita: "A coordinar" }
      : { ...form, id: modal.client.id };

    if (isNew) setClients([...clients, data]);
    else setClients(clients.map(c => c.id === data.id ? data : c));

    await supabase.from('clients').upsert(data);
    toast(isNew ? "Cliente creado exitosamente" : "Cliente actualizado");
    setModal(null);
  }

  async function deleteClient(id, nombre) {
    if (confirm(`¿Eliminar a ${nombre}?`)) {
      setClients(clients.filter((c) => c.id !== id));
      await supabase.from('clients').delete().eq('id', id);
      toast("Cliente eliminado", "error");
    }
  }

  const emptyClient = {
    nombre: "", rubro: "", servicio: SERVICE_TYPES[0],
    frecuencia: { activa: false, tipo: "semanal", dias: [], diaDelMes: "", notas: "" },
    ubicaciones: [{ id: `u${Date.now()}`, direccion: "", mapsLink: "" }],
    contactoHabitual: "", contactoEmergencia: "", acceso: "", productos: "",
    discrecion: "", wifi: "", m2: "", estado: "activo", formal: true,
    kennitala: "",
    email: "",
    fotosReferencia: [],
    checklistId: "t-comercial", addonChecklist: "", notas: "",
  };

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${clients.length} clientes en cartera`}
        action={
          <button className="btn-primary" onClick={() => setModal({ mode: "new", client: { ...emptyClient, id: `c${Date.now()}` } })}>
            <Plus size={15} /> Nuevo cliente
          </button>
        }
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }} className="animate-fadeUp">
        <div style={{ position: "relative", width: 280 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted }} />
          <input className="input-base" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente o rubro…" style={{ paddingLeft: 36 }} />
        </div>
        <div style={{ display: "flex", gap: 4, background: "#F2F8F6", borderRadius: 10, padding: 4 }}>
          {[{ id: "cards", icon: Activity }, { id: "table", icon: FileText }].map(({ id, icon: Icon }) => (
            <button key={id} onClick={() => setView(id)} style={{
              padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer",
              background: view === id ? "#fff" : "transparent",
              color: view === id ? C.primary : C.muted,
              boxShadow: view === id ? "0 1px 4px rgba(0,0,0,.08)" : "none",
              transition: "all .15s",
            }}><Icon size={15} /></button>
          ))}
        </div>
      </div>

      {view === "cards" && (
        <div className="clients-grid">
          {filtered.map((c, i) => {
            const cJobs = jobsForClient(jobs, c.id);
            const realRating = avgRating(cJobs);
            const displayRating = realRating ?? c.rating ?? null;
            const visitCount = cJobs.length || c.totalVisitas || 0;
            return (
              <div key={c.id} className={`card animate-fadeUp`}
                style={{ animationDelay: `${i * 50}ms`, cursor: "pointer", transition: "all .2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(1,102,78,.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                onClick={() => setModal({ mode: "view", client: c })}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <Avatar name={c.nombre} size={44} />
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={(e) => { e.stopPropagation(); setModal({ mode: "edit", client: c }); }}
                      style={{ padding: 6, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: C.muted, transition: "all .15s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = C.pale; e.currentTarget.style.color = C.primary; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; }}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteClient(c.id, c.nombre); }}
                      style={{ padding: 6, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: C.muted, transition: "all .15s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF0F0"; e.currentTarget.style.color = C.danger; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{c.nombre}</p>
                <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{c.rubro}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <StarRating value={displayRating} />
                  <span style={{ fontSize: 11, color: "#C0D8D2" }}>·</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{visitCount} visitas</span>
                </div>
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <StatusBadge estado={c.estado} size="sm" />
                  {!c.formal && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                      background: "#FDF3E7", color: C.amber, border: `1px solid #F5C882`
                    }}>
                      Sin contrato
                    </span>
                  )}
                  <FrequencyBadge frecuencia={c.frecuencia} />
                </div>
                <div style={{
                  marginTop: 12, paddingTop: 12, borderTop: "1px solid #EAF4F1",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <span style={{ fontSize: 11, color: C.muted }}>{c.servicio.split(" / ")[0]}</span>
                  <span style={{ fontSize: 11, color: C.primary, fontWeight: 600 }}>{c.m2} m²</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "table" && (
        <div style={{ overflow: "hidden", borderRadius: 18, border: "1px solid #D8EDE7", background: "#fff" }}
          className="animate-fadeIn">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Frecuencia</th>
                <th>Rating real</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const cJobs = jobsForClient(jobs, c.id);
                const displayRating = avgRating(cJobs) ?? c.rating ?? null;
                return (
                  <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => setModal({ mode: "view", client: c })}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={c.nombre} size={32} />
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 13, color: C.ink }}>{c.nombre}</p>
                          <p style={{ fontSize: 11, color: C.muted }}>{c.rubro}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: C.muted }}>{c.servicio}</td>
                    <td style={{ fontSize: 12, color: C.muted }}>{frecuenciaLabel(c.frecuencia)}</td>
                    <td><StarRating value={displayRating} /></td>
                    <td><StatusBadge estado={c.estado} size="sm" /></td>
                    <td>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setModal({ mode: "edit", client: c })} style={{
                          padding: "5px 8px", borderRadius: 8, border: "none",
                          background: "transparent", cursor: "pointer", color: C.muted,
                        }}><Pencil size={14} /></button>
                        <button onClick={() => deleteClient(c.id, c.nombre)} style={{
                          padding: "5px 8px", borderRadius: 8, border: "none",
                          background: "transparent", cursor: "pointer", color: C.muted,
                        }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal?.mode === "view" && (
        <ClientDetailModal client={modal.client} jobs={jobs} staff={staff}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ mode: "edit", client: modal.client })} />
      )}
      {(modal?.mode === "new" || modal?.mode === "edit") && (
        <Modal
          title={modal.mode === "new" ? "Nuevo cliente" : `Editar — ${modal.client.nombre}`}
          onClose={() => setModal(null)} wide gradient>
          <ClientForm initial={modal.client} onSave={saveClient} onCancel={() => setModal(null)} checklists={checklists} />
        </Modal>
      )}
    </div>
  );
}

function ClientDetailModal({ client, onClose, onEdit, jobs, staff }) {
  const cJobs = useMemo(() =>
    jobsForClient(jobs, client.id).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
    [jobs, client.id]);
  const realRating = avgRating(cJobs);
  const compliance = complianceRate(cJobs);
  const displayRating = realRating ?? client.rating ?? null;
  const ubicaciones = Array.isArray(client.ubicaciones) ? client.ubicaciones : [];

  const rows = [
    ["Rubro", client.rubro],
    ["Servicio", client.servicio],
    ["Frecuencia", frecuenciaLabel(client.frecuencia)],
    ["Kennitala", client.kennitala || "—"],
    ["Tamaño", `${client.m2} m²`],
    ["Contacto habitual", client.contactoHabitual],
    ["Contacto emergencia", client.contactoEmergencia],
    ["Acceso", client.acceso],
    ["Productos permitidos", client.productos],
    ["Discreción", client.discrecion],
    ["Wifi", client.wifi],
    ["Próxima visita", client.proximaVisita],
    ["Checklist", client.checklistId],
    ["Notas", client.notas || "—"],
  ];
  return (
    <Modal title={client.nombre} onClose={onClose} wide gradient>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <Avatar name={client.nombre} size={52} />
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <StatusBadge estado={client.estado} />
              {!client.formal && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
                  background: "#FDF3E7", color: C.amber, border: `1px solid #F5C882`
                }}>
                  Sin contrato formal
                </span>
              )}
              <FrequencyBadge frecuencia={client.frecuencia} />
            </div>
            <StarRating value={displayRating} />
            <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{cJobs.length || client.totalVisitas || 0} visitas totales</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
          <div style={{ background: C.pale, borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
            <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, fontWeight: 600, color: C.primary }}>{compliance}%</p>
            <p style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Cumplimiento</p>
          </div>
          <div style={{ background: C.pale, borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
            <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, fontWeight: 600, color: C.primary }}>
              {cJobs.filter(j => j.estado === "incidente").length}
            </p>
            <p style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Incidentes</p>
          </div>
          <div style={{ background: C.pale, borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
            <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, fontWeight: 600, color: C.primary }}>
              {cJobs.filter(j => typeof j.rating === "number").length}
            </p>
            <p style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Calificaciones</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginBottom: 20 }}>
          {rows.map(([label, value]) => (
            <div key={label}>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: C.muted, marginBottom: 2 }}>{label}</p>
              <p style={{ fontSize: 13, color: C.ink }}>{value}</p>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 20 }}>
          <h4 style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700,
            color: C.ink, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".04em"
          }}>
            <MapPin size={14} /> Ubicaciones ({ubicaciones.length})
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ubicaciones.length === 0 && <p style={{ fontSize: 12, color: C.muted }}>Sin ubicaciones cargadas.</p>}
            {ubicaciones.map((u, i) => (
              <div key={u.id || i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                padding: "9px 12px", borderRadius: 10, background: "#FAFCFB", border: "1px solid #EAF4F1",
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.direccion || `Ubicación ${i + 1}`}
                  </p>
                </div>
                {u.mapsLink && (
                  <a href={u.mapsLink} target="_blank" rel="noopener noreferrer" className="btn-ghost"
                    style={{ fontSize: 11, padding: "5px 10px", flexShrink: 0 }}>
                    <MapPin size={12} /> Ver en Maps
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {Array.isArray(client.fotosReferencia) && client.fotosReferencia.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h4 style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700,
              color: C.ink, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".04em"
            }}>
              <ImageIcon size={14} /> Fotos de referencia
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 8 }}>
              {client.fotosReferencia.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" style={{ position: "relative" }}>
                  <img src={f.url} alt={f.descripcion || ""} style={{
                    width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, border: "1px solid #D8EDE7"
                  }} />
                  <span style={{
                    position: "absolute", bottom: 3, left: 3, right: 3,
                    fontSize: 9, fontWeight: 700, color: "#fff", background: "rgba(10,31,26,.65)",
                    borderRadius: 5, padding: "1px 5px", textAlign: "center",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{TIPO_FOTO_LABEL[f.tipo] || "Otro"}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <h4 style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700,
            color: C.ink, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".04em"
          }}>
            <History size={14} /> Historial de visitas
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
            {cJobs.length === 0 && <p style={{ fontSize: 12, color: C.muted }}>Sin visitas registradas todavía.</p>}
            {cJobs.map((job) => {
              const emps = (job.empleados || []).map(eid => staff.find(s => s.id === eid)).filter(Boolean);
              const hrs = jobHours(job);
              return (
                <div key={job.id} style={{
                  display: "flex", flexDirection: "column", gap: 4,
                  padding: "9px 12px", borderRadius: 10, background: "#FAFCFB", border: "1px solid #EAF4F1",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>
                      {job.fecha} — {job.hora}{hrs > 0 ? ` · ${hrs.toFixed(1)}h` : ""}
                    </span>
                    <StatusBadge estado={job.estado} size="sm" />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: C.muted }}>{emps.map(e => e.nombre).join(", ") || "Sin asignar"}</span>
                    <StarRating value={job.rating ?? null} empty="—" />
                  </div>
                  {job.comentario && (
                    <p style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>"{job.comentario}"</p>
                  )}
                  {job.motivo && (
                    <p style={{ fontSize: 11, color: C.danger, fontWeight: 500 }}>⚠ {job.motivo}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid #EAF4F1" }}>
          <button className="btn-ghost" style={{ color: C.primary, background: C.pale }} onClick={() => {
            const link = `${window.location.origin}/?portal=${client.id}`;
            navigator.clipboard.writeText(link);
            toast("Enlace copiado al portapapeles!");
          }}>
            <Building2 size={14} /> Copiar Enlace del Portal
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-ghost" onClick={onClose}>Cerrar</button>
            <button className="btn-primary" onClick={onEdit}><Pencil size={14} /> Editar</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ClientForm({ initial, onSave, onCancel, checklists }) {
  const [form, setForm] = useState({
    ...initial,
    frecuencia: initial.frecuencia && typeof initial.frecuencia === "object"
      ? initial.frecuencia
      : { activa: false, tipo: "semanal", dias: [], diaDelMes: "", notas: typeof initial.frecuencia === "string" ? initial.frecuencia : "" },
    ubicaciones: Array.isArray(initial.ubicaciones) && initial.ubicaciones.length
      ? initial.ubicaciones
      : [{ id: `u${Date.now()}`, direccion: "", mapsLink: "" }],
    fotosReferencia: Array.isArray(initial.fotosReferencia) ? initial.fotosReferencia : [],
    kennitala: initial.kennitala || "",
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="form-grid-2">
        <Field label="Nombre del cliente">
          <input required className="input-base" value={form.nombre} onChange={set("nombre")} placeholder="Ej: Fly Over Iceland" />
        </Field>
        <Field label="Rubro">
          <input className="input-base" value={form.rubro} onChange={set("rubro")} placeholder="Ej: Entretenimiento" />
        </Field>
      </div>
      <Field label="Email del cliente" hint="Se usará para enviar notificaciones de servicio">
        <input type="email" className="input-base" value={form.email || ""} onChange={set("email")} placeholder="cliente@ejemplo.com" />
      </Field>
      <div className="form-grid-2">
        <Field label="Tipo de servicio">
          <select className="input-base" value={form.servicio} onChange={set("servicio")}>
            {SERVICE_TYPES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Kennitala (DNI/Pasaporte islandés)" hint="Formato: XXXXXX-XXXX">
          <input className="input-base" value={form.kennitala}
            onChange={(e) => setForm({ ...form, kennitala: formatKennitala(e.target.value) })}
            placeholder="120184-2380" maxLength={11} />
        </Field>
      </div>

      <Field label="Frecuencia de visitas">
        <FrequencyField value={form.frecuencia} onChange={(frecuencia) => setForm({ ...form, frecuencia })} />
      </Field>

      <Field label="Ubicaciones">
        <LocationsField value={form.ubicaciones} onChange={(ubicaciones) => setForm({ ...form, ubicaciones })} />
      </Field>

      <div className="form-grid-2">
        <Field label="Contacto habitual">
          <input className="input-base" value={form.contactoHabitual} onChange={set("contactoHabitual")} />
        </Field>
        <Field label="Contacto emergencia">
          <input className="input-base" value={form.contactoEmergencia} onChange={set("contactoEmergencia")} />
        </Field>
      </div>
      <Field label="Acceso al lugar">
        <input className="input-base" value={form.acceso} onChange={set("acceso")} placeholder="Llave, código, en persona…" />
      </Field>

      <Field label="Fotos de referencia" hint="Ej: dónde se guarda la llave, roturas o incidencias existentes">
        <ClientPhotosField clientId={form.id} value={form.fotosReferencia}
          onChange={(fotosReferencia) => setForm({ ...form, fotosReferencia })} />
      </Field>

      <div className="form-grid-3">
        <Field label="Tamaño (m²)">
          <input type="number" className="input-base" value={form.m2} onChange={set("m2")} />
        </Field>
        <Field label="Ubicaciones (cantidad)">
          <input type="number" min={1} className="input-base" value={form.ubicaciones.length} disabled />
        </Field>
        <Field label="Wifi">
          <input className="input-base" value={form.wifi} onChange={set("wifi")} placeholder="Sí / No" />
        </Field>
      </div>
      <Field label="Checklist estándar">
        <select className="input-base" value={form.checklistId} onChange={set("checklistId")}>
          {checklists.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
      </Field>
      <Field label="Notas internas">
        <textarea rows={2} className="input-base" value={form.notas} onChange={set("notas")} style={{ resize: "vertical" }} />
      </Field>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.ink, cursor: "pointer" }}>
        <input type="checkbox" checked={form.formal} onChange={(e) => setForm({ ...form, formal: e.target.checked })} />
        Contrato / relación formal
      </label>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8 }}>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary">Guardar cliente</button>
      </div>
    </form>
  );
}

const FRECUENCIA_TIPOS = [
  { id: "semanal", label: "Semanal" },
  { id: "quincenal", label: "Quincenal" },
  { id: "mensual", label: "Mensual" },
  { id: "personalizado", label: "Personalizado" },
];

function frecuenciaLabel(frecuencia) {
  if (!frecuencia) return "Sin frecuencia fija";
  if (typeof frecuencia === "string") return frecuencia || "Sin frecuencia fija";
  if (!frecuencia.activa) return "No es cliente frecuente";
  const { tipo, dias = [], diaDelMes, notas } = frecuencia;
  if (tipo === "personalizado") return notas ? `Personalizado — ${notas}` : "Personalizado";
  if (tipo === "mensual") return diaDelMes ? `Mensual, día ${diaDelMes}` : "Mensual";
  if (tipo === "semanal") return dias.length ? `Semanal — ${dias.join(", ")}` : "Semanal";
  if (tipo === "quincenal") return dias.length ? `Quincenal — ${dias.join(", ")}` : "Quincenal";
  return "Frecuente";
}

function FrequencyBadge({ frecuencia }) {
  const isFreq = frecuencia && typeof frecuencia === "object" && frecuencia.activa;
  if (!isFreq) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
      background: C.pale, color: C.primary, border: `1px solid #BFE6DA`,
    }}>
      <RefreshCw size={10} /> {frecuenciaLabel(frecuencia)}
    </span>
  );
}

function FrequencyField({ value, onChange }) {
  const v = value || { activa: false, tipo: "semanal", dias: [], diaDelMes: "", notas: "" };

  function toggleDia(dia) {
    const dias = v.dias.includes(dia) ? v.dias.filter((d) => d !== dia) : [...v.dias, dia];
    onChange({ ...v, dias });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12, borderRadius: 12, border: "1px solid #D8EDE7", background: "#FAFCFB" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.ink, cursor: "pointer" }}>
        <input type="checkbox" checked={v.activa} onChange={(e) => onChange({ ...v, activa: e.target.checked })} />
        Es un cliente frecuente (visitas recurrentes)
      </label>

      {v.activa && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FRECUENCIA_TIPOS.map((t) => (
              <button key={t.id} type="button" onClick={() => onChange({ ...v, tipo: t.id })}
                style={{
                  padding: "6px 12px", borderRadius: 20, cursor: "pointer",
                  border: `1px solid ${v.tipo === t.id ? C.primary : "#D8EDE7"}`,
                  background: v.tipo === t.id ? C.primary : "#fff",
                  color: v.tipo === t.id ? "#fff" : C.ink,
                  fontSize: 12, fontWeight: 600, fontFamily: "'Inter',sans-serif", transition: "all .15s",
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {(v.tipo === "semanal" || v.tipo === "quincenal") && (
            <div>
              <p style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                Días de la semana {v.tipo === "quincenal" ? "(cada 2 semanas)" : ""}
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DIAS.map((dia) => (
                  <button key={dia} type="button" onClick={() => toggleDia(dia)}
                    style={{
                      width: 40, height: 32, borderRadius: 8, cursor: "pointer",
                      border: `1px solid ${v.dias.includes(dia) ? C.primary : "#D8EDE7"}`,
                      background: v.dias.includes(dia) ? C.primary : "#fff",
                      color: v.dias.includes(dia) ? "#fff" : C.ink,
                      fontSize: 12, fontWeight: 600, fontFamily: "'Inter',sans-serif", transition: "all .15s",
                    }}>
                    {dia}
                  </button>
                ))}
              </div>
            </div>
          )}

          {v.tipo === "mensual" && (
            <Field label="Día del mes">
              <input type="number" min={1} max={31} className="input-base" value={v.diaDelMes}
                onChange={(e) => onChange({ ...v, diaDelMes: e.target.value })} placeholder="Ej: 15" />
            </Field>
          )}

          {v.tipo === "personalizado" && (
            <Field label="Descripción de la frecuencia">
              <input className="input-base" value={v.notas}
                onChange={(e) => onChange({ ...v, notas: e.target.value })}
                placeholder="Ej: cada 3 semanas, los lunes" />
            </Field>
          )}

          <div style={{ fontSize: 11, color: C.primary, fontWeight: 600 }}>
            {frecuenciaLabel(v)}
          </div>
        </div>
      )}
    </div>
  );
}

function LocationsField({ value, onChange }) {
  const ubicaciones = value && value.length ? value : [{ id: `u${Date.now()}`, direccion: "", mapsLink: "" }];

  function update(id, patch) {
    onChange(ubicaciones.map((u) => u.id === id ? { ...u, ...patch } : u));
  }
  function addLocation() {
    onChange([...ubicaciones, { id: `u${Date.now()}`, direccion: "", mapsLink: "" }]);
  }
  function removeLocation(id) {
    if (ubicaciones.length <= 1) return;
    onChange(ubicaciones.filter((u) => u.id !== id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {ubicaciones.map((u, i) => (
        <div key={u.id} style={{
          display: "flex", gap: 8, alignItems: "flex-start",
          padding: 10, borderRadius: 10, border: "1px solid #D8EDE7", background: "#FAFCFB",
        }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <input className="input-base" value={u.direccion}
              onChange={(e) => update(u.id, { direccion: e.target.value })}
              placeholder={`Dirección de ubicación ${i + 1}`} />
            <input className="input-base" value={u.mapsLink}
              onChange={(e) => update(u.id, { mapsLink: e.target.value })}
              placeholder="Enlace de Google Maps (opcional)" />
          </div>
          <button type="button" onClick={() => removeLocation(u.id)} disabled={ubicaciones.length <= 1}
            style={{
              padding: 8, borderRadius: 8, border: "none", cursor: ubicaciones.length <= 1 ? "not-allowed" : "pointer",
              background: "transparent", color: ubicaciones.length <= 1 ? "#D8EDE7" : C.danger, marginTop: 4,
            }}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button type="button" onClick={addLocation} className="btn-ghost" style={{ alignSelf: "flex-start", fontSize: 12 }}>
        <Plus size={13} /> Agregar ubicación
      </button>
    </div>
  );
}

const TIPO_FOTO_LABEL = { llave: "Llave / acceso", incidencia: "Incidencia", otro: "Otro" };

function ClientPhotosField({ clientId, value, onChange }) {
  const fotos = value || [];
  const [uploading, setUploading] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState("llave");

  async function handleUpload(file) {
    if (!file || !clientId) return;
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${clientId}-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('client-photos').upload(fileName, file);
    if (error) {
      toast("Error al subir la foto", "error");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('client-photos').getPublicUrl(fileName);
    onChange([...fotos, { url: urlData.publicUrl, tipo: tipoSeleccionado, descripcion: "" }]);
    toast("Foto agregada");
    setUploading(false);
  }

  function removeFoto(i) {
    onChange(fotos.filter((_, idx) => idx !== i));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {fotos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))", gap: 8 }}>
          {fotos.map((f, i) => (
            <div key={i} style={{ position: "relative" }}>
              <img src={f.url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, border: "1px solid #D8EDE7" }} />
              <span style={{
                position: "absolute", bottom: 3, left: 3, right: 3,
                fontSize: 8, fontWeight: 700, color: "#fff", background: "rgba(10,31,26,.65)",
                borderRadius: 4, padding: "1px 4px", textAlign: "center",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{TIPO_FOTO_LABEL[f.tipo] || "Otro"}</span>
              <button type="button" onClick={() => removeFoto(i)} style={{
                position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%",
                background: C.danger, border: "2px solid #fff", display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer", padding: 0,
              }}>
                <X size={10} color="#fff" strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <select className="input-base" style={{ width: 160 }} value={tipoSeleccionado}
          onChange={(e) => setTipoSeleccionado(e.target.value)}>
          <option value="llave">Llave / acceso</option>
          <option value="incidencia">Incidencia</option>
          <option value="otro">Otro</option>
        </select>
        <label style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10,
          border: "1.5px solid #D8EDE7", background: "#fff", color: C.muted, fontSize: 12, fontWeight: 500,
          cursor: clientId ? "pointer" : "not-allowed", fontFamily: "'Inter',sans-serif",
        }}>
          <Camera size={14} /> {uploading ? "Subiendo…" : "Agregar foto"}
          <input type="file" accept="image/*" style={{ display: "none" }} disabled={!clientId || uploading}
            onChange={(e) => handleUpload(e.target.files[0])} />
        </label>
      </div>
    </div>
  );
}

function formatKennitala(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
}

function StaffPage({ staff, setStaff, jobs }) {
  const [modal, setModal] = useState(null);

  async function save(form) {
    const isNew = modal.mode === "new";
    const data = isNew ? { ...form, id: `e${Date.now()}` } : { ...form, id: modal.item.id };
    if (isNew) setStaff([...staff, data]);
    else setStaff(staff.map((s) => s.id === data.id ? data : s));

    await supabase.from('staff').upsert(data);
    toast(isNew ? "Personal agregado" : "Personal actualizado");
    setModal(null);
  }

  async function remove(id, nombre) {
    if (confirm(`¿Eliminar a ${nombre}?`)) {
      setStaff(staff.filter((s) => s.id !== id));
      await supabase.from('staff').delete().eq('id', id);
      toast("Personal eliminado", "error");
    }
  }

  const emptyStaff = { nombre: "", tipo: "Fijo", idiomas: [], pago: "Por hora", telefono: "", señal: "buena", destacado: false, trabajosEsteMes: 0, cumplimiento: 100, usuario: "", password: "", email: "" };

  const señalColor = { buena: "#2DA05A", limitada: C.amber, sin_señal: C.danger };

  return (
    <div>
      <PageHeader title="Personal" subtitle={`${staff.length} personas en el equipo`}
        action={
          <button className="btn-primary" onClick={() => setModal({ mode: "new", item: emptyStaff })}>
            <Plus size={15} /> Agregar personal
          </button>
        }
      />
      <div className="clients-grid">
        {staff.map((s, i) => {
          const sJobs = jobsForStaff(jobs, s.id);
          const realCumplimiento = sJobs.length ? complianceRate(sJobs) : s.cumplimiento;
          const realRating = avgRating(sJobs);
          const trabajosCompletados = sJobs.filter(j => j.estado === "completo").length;
          return (
            <div key={s.id} className={`card animate-fadeUp`} style={{ animationDelay: `${i * 80}ms`, transition: "all .2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(1,102,78,.12)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ position: "relative" }}>
                  <Avatar name={s.nombre} size={48} />
                  {s.destacado && (
                    <div style={{
                      position: "absolute", bottom: -4, right: -4,
                      width: 18, height: 18, borderRadius: "50%",
                      background: C.amber, border: "2px solid #fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Star size={9} fill="#fff" color="#fff" />
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => setModal({ mode: "edit", item: s })} style={{
                    padding: 6, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: C.muted
                  }}><Pencil size={14} /></button>
                  <button onClick={() => remove(s.id, s.nombre)} style={{
                    padding: 6, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: C.muted
                  }}><Trash2 size={14} /></button>
                </div>
              </div>

              <p style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{s.nombre}</p>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{s.tipo} · {s.pago}</p>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <StarRating value={realRating} empty="Sin calificaciones" />
                <span style={{ fontSize: 11, color: "#C0D8D2" }}>·</span>
                <span style={{ fontSize: 11, color: C.muted }}>{trabajosCompletados} trabajos</span>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>CUMPLIMIENTO</span>
                  <span style={{ fontSize: 10, color: C.primary, fontWeight: 700 }}>{realCumplimiento}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${realCumplimiento}%` }} />
                </div>
              </div>

              <div style={{
                marginTop: 12, display: "flex", flexDirection: "column", gap: 6,
                paddingTop: 12, borderTop: "1px solid #EAF4F1"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.muted }}>
                  <Languages size={13} /> {s.idiomas.join(", ") || "—"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.muted }}>
                  <Phone size={13} /> {s.telefono || "—"}
                </div>

                <div>
                  <span style={{ fontSize: 12, color: C.muted }}>kennitala:</span>
                  <span style={{ fontSize: 12, color: C.ink, fontWeight: 600, marginLeft: 4 }}>{s.kennitala || "—"}</span>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <Modal title={modal.mode === "new" ? "Agregar personal" : `Editar — ${modal.item.nombre}`}
          onClose={() => setModal(null)} gradient>
          <StaffForm initial={modal.item} onSave={save} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}

function StaffForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...initial, idiomasStr: initial.idiomas?.join(", ") || "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const handleSubmit = (e) => {
    e.preventDefault();
    const { idiomasStr, ...rest } = form;
    onSave({ ...rest, idiomas: idiomasStr.split(",").map((s) => s.trim()).filter(Boolean) });
  };
  return (
    <form onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field label="Nombre completo">
        <input required className="input-base" value={form.nombre} onChange={set("nombre")} />
      </Field>
      <div className="form-grid-2">
        <Field label="Tipo de vínculo">
          <select className="input-base" value={form.tipo} onChange={set("tipo")}>
            <option>Fijo</option><option>Temporada</option><option>Por hora</option>
          </select>
        </Field>
        <Field label="Forma de pago">
          <select className="input-base" value={form.pago} onChange={set("pago")}>
            <option>Por hora</option><option>Sueldo fijo</option><option>Por trabajo</option>
          </select>
        </Field>
      </div>
      <Field label="Idiomas (separados por coma)">
        <input className="input-base" value={form.idiomasStr} onChange={set("idiomasStr")} placeholder="Español, Inglés" />
      </Field>
      <Field label="Email del personal" hint="Se usará para futuras notificaciones">
        <input type="email" className="input-base" value={form.email || ""} onChange={set("email")} placeholder="empleado@ejemplo.com" />
      </Field>
      <div className="form-grid-2">
        <Field label="Usuario (para iniciar sesión)">
          <input className="input-base" value={form.usuario || ""} onChange={set("usuario")} placeholder="Ej: jperez" />
        </Field>
        <Field label="Contraseña">
          <input className="input-base" value={form.password || ""} onChange={set("password")} placeholder="Contraseña de acceso" />
        </Field>
      </div>
      <div className="form-grid-2">
        <Field label="Teléfono">
          <input className="input-base" value={form.telefono} onChange={set("telefono")} />
        </Field>
        <Field label="Kennitala (DNI/Pasaporte islandés)" hint="Formato: XXXXXX-XXXX">
          <input className="input-base" value={form.kennitala}
            onChange={(e) => setForm({ ...form, kennitala: formatKennitala(e.target.value) })}
            placeholder="120184-2380" maxLength={11} />
        </Field>

      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.ink, cursor: "pointer" }}>
        <input type="checkbox" checked={form.destacado} onChange={(e) => setForm({ ...form, destacado: e.target.checked })} />
        Marcar como empleado destacado del mes
      </label>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8 }}>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary">Guardar</button>
      </div>
    </form>
  );
}

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function parseFechaJob(fechaStr) {
  if (!fechaStr) return null;
  const s = fechaStr.trim().toLowerCase();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (s === "hoy") return new Date(hoy);
  if (s === "mañana" || s === "manana") {
    const d = new Date(hoy);
    d.setDate(d.getDate() + 1);
    return d;
  }
  const match = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (match) {
    const [, dd, mm, yy] = match;
    const year = yy ? (yy.length === 2 ? 2000 + parseInt(yy) : parseInt(yy)) : hoy.getFullYear();
    const d = new Date(year, parseInt(mm) - 1, parseInt(dd));
    d.setHours(0, 0, 0, 0);
    return isNaN(d) ? null : d;
  }
  return null;
}
function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isoKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const ESTADO_DOT = {
  completo: "#1A7A42", en_curso: "#B86810", pendiente: "#6B8A84", incidente: "#C03030",
};

function formatFechaDisplay(d) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
  if (sameDay(d, hoy)) return "Hoy";
  if (sameDay(d, manana)) return "Mañana";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function DateField({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const parsed = parseFechaJob(value);
    const d = parsed || new Date();
    d.setDate(1);
    return d;
  });
  const wrapRef = useRef(null);
  const hoy = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const selected = useMemo(() => parseFechaJob(value), [value]);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const celdas = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(start.getDate() - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  function pick(d) {
    onChange(formatFechaDisplay(d));
    setOpen(false);
  }

  const mesLabel = cursor.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input-base"
        style={{
          display: "flex", alignItems: "center", gap: 8,
          textAlign: "left", cursor: "pointer",
          color: value ? C.ink : C.muted,
        }}
      >
        <CalendarDays size={15} color={C.muted} style={{ flexShrink: 0 }} />
        {value || "Seleccioná una fecha"}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50,
          width: 300, background: "#fff", borderRadius: 14,
          border: "1px solid #E4EEEA", boxShadow: "0 12px 32px rgba(10,31,26,.16)",
          padding: 14,
        }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <button type="button" onClick={() => pick(new Date(hoy))}
              className="btn-ghost" style={{ flex: 1, fontSize: 12, justifyContent: "center", padding: "6px 0" }}>
              Hoy
            </button>
            <button type="button" onClick={() => { const d = new Date(hoy); d.setDate(d.getDate() + 1); pick(d); }}
              className="btn-ghost" style={{ flex: 1, fontSize: 12, justifyContent: "center", padding: "6px 0" }}>
              Mañana
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button type="button" onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
              style={{ border: "none", background: "#F2F8F6", borderRadius: 8, padding: 5, cursor: "pointer", color: C.muted, display: "flex" }}>
              <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} />
            </button>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, textTransform: "capitalize" }}>{mesLabel}</span>
            <button type="button" onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
              style={{ border: "none", background: "#F2F8F6", borderRadius: 8, padding: 5, cursor: "pointer", color: C.muted, display: "flex" }}>
              <ChevronRight size={14} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
            {DIAS.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: C.muted, padding: "2px 0" }}>
                {d[0]}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
            {celdas.map((d) => {
              const enMes = d.getMonth() === cursor.getMonth();
              const esHoy = sameDay(d, hoy);
              const esSeleccionado = selected && sameDay(d, selected);
              return (
                <button
                  key={isoKey(d)}
                  type="button"
                  onClick={() => pick(d)}
                  style={{
                    width: "100%", aspectRatio: "1", border: "none", cursor: "pointer",
                    borderRadius: 8, fontSize: 12, fontWeight: esSeleccionado ? 700 : 500,
                    background: esSeleccionado ? C.primary : "transparent",
                    color: esSeleccionado ? "#fff" : !enMes ? "#C0D0CB" : esHoy ? C.primary : C.ink,
                    outline: esHoy && !esSeleccionado ? `1.5px solid ${C.primary}` : "none",
                    outlineOffset: -1.5,
                    transition: "background .12s",
                  }}
                  onMouseEnter={(e) => { if (!esSeleccionado) e.currentTarget.style.background = "#F2F8F6"; }}
                  onMouseLeave={(e) => { if (!esSeleccionado) e.currentTarget.style.background = "transparent"; }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SchedulePage({ clients, staff, jobs, setJobs, checklists }) {
  const [dispatchModal, setDispatchModal] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [editJobForm, setEditJobForm] = useState({ clienteId: "", empleados: [], fecha: "Hoy", hora: "08:00", checklistId: "", ubicacionId: "" });
  const [view, setView] = useState("lista");
  const [form, setForm] = useState({ clienteId: "", empleados: [], fecha: "Hoy", hora: "08:00", checklistId: checklists[0]?.id || "", ubicacionId: "" });
  const [checklistModal, setChecklistModal] = useState(null);
  const selectedClient = clients.find((c) => c.id === form.clienteId);
  const selectedClientUbicaciones = selectedClient && Array.isArray(selectedClient.ubicaciones) ? selectedClient.ubicaciones : [];

  async function handleDispatch(e) {
    e.preventDefault();
    if (!form.clienteId || form.empleados.length === 0 || !form.checklistId) {
      toast("Completa todos los campos obligatorios", "error");
      return;
    }
    const newJob = {
      id: "j" + Date.now(),
      clienteId: form.clienteId,
      empleados: form.empleados,
      fecha: form.fecha,
      hora: form.hora,
      estado: "pendiente",
      checklistId: form.checklistId,
      ubicacionId: form.ubicacionId || null,
      tareasCompletadas: {},
      notas: "",
      rating: null
    };
    setJobs([...jobs, newJob]);
    await supabase.from('jobs').insert(newJob);
    setDispatchModal(false);
    toast("Trabajo despachado con éxito!");

    const assignedClient = clients.find(c => c.id === form.clienteId);
    if (assignedClient?.email) {
      const assignedStaffMembers = form.empleados.map(eid => staff.find(s => s.id === eid)).filter(Boolean);
      emailJobAssigned({ client: assignedClient, job: newJob, assignedStaff: assignedStaffMembers });
      toast(`📧 Notificación enviada a ${assignedClient.email}`, "info");
    }
  }

  function toggleEmpleado(id) {
    if (form.empleados.includes(id)) {
      setForm({ ...form, empleados: form.empleados.filter(e => e !== id) });
    } else {
      setForm({ ...form, empleados: [...form.empleados, id] });
    }
  }
  function toggleEmpleadosEdit(id) {
    if (editJobForm.empleados.includes(id)) {
      setEditJobForm({ ...editJobForm, empleados: editJobForm.empleados.filter(e => e !== id) });
    } else {
      setEditJobForm({ ...editJobForm, empleados: [...editJobForm.empleados, id] });
    }
  }
  async function toggleCheckAdmin(job, idx, done) {
    const tareasCompletadas = { ...(job.tareasCompletadas || {}), [idx]: !done };
    const nextEstado = job.estado === "pendiente" ? "en_curso" : job.estado;
    const updatedJob = { ...job, tareasCompletadas, estado: nextEstado };
    setJobs(jobs.map(j => j.id === job.id ? updatedJob : j));
    await supabase.from('jobs').update({ tareasCompletadas, estado: nextEstado }).eq('id', job.id);
    setChecklistModal(updatedJob);
  }

  async function markDoneAdmin(job) {
    const updatedJob = { ...job, estado: "completo" };
    setJobs(jobs.map(j => j.id === job.id ? updatedJob : j));
    await supabase.from('jobs').update({ estado: "completo" }).eq('id', job.id);
    toast("Trabajo marcado como completado");
    setChecklistModal(null);
  }

  function startEditJob(job) {
    setEditJob(job);
    setEditJobForm({
      clienteId: job.clienteId,
      empleados: job.empleados,
      fecha: job.fecha,
      hora: job.hora,
      checklistId: job.checklistId,
      ubicacionId: job.ubicacionId || "",
    });
    setDispatchModal(false);
  }

  async function handleEditJob(e) {
    e.preventDefault();
    if (!editJobForm.clienteId || editJobForm.empleados.length === 0 || !editJobForm.checklistId || !editJobForm.ubicacionId) {
      toast("Completa todos los campos obligatorios", "error");
      return;
    }
    const updatedJob = {
      ...editJob,
      clienteId: editJobForm.clienteId,
      empleados: editJobForm.empleados,
      fecha: editJobForm.fecha,
      hora: editJobForm.hora,
      checklistId: editJobForm.checklistId,
      ubicacionId: editJobForm.ubicacionId,
    };
    setJobs(jobs.map(j => j.id === editJob.id ? updatedJob : j));
    await supabase.from('jobs').update({
      clienteId: updatedJob.clienteId,
      empleados: updatedJob.empleados,
      fecha: updatedJob.fecha,
      hora: updatedJob.hora,
      checklistId: updatedJob.checklistId,
      ubicacionId: updatedJob.ubicacionId,
    }).eq('id', editJob.id);
    toast("Trabajo actualizado");
    setEditJob(null);
  }

  async function deleteJob(id, cNombre) {
    if (confirm(`¿Eliminar trabajo de ${cNombre}?`)) {
      setJobs(jobs.filter(j => j.id !== id));
      await supabase.from('jobs').delete().eq('id', id);
      toast("Trabajo eliminado", "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Despacho y Programación"
        subtitle="Asigna trabajos a uno o múltiples empleados."
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 4, background: "#F2F8F6", borderRadius: 10, padding: 4 }}>
              {[
                { id: "lista", label: "Lista", icon: FileText },
                { id: "calendario", label: "Calendario", icon: CalendarDays },
              ].map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setView(id)} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: view === id ? "#fff" : "transparent",
                  color: view === id ? C.primary : C.muted,
                  boxShadow: view === id ? "0 1px 4px rgba(0,0,0,.08)" : "none",
                  fontSize: 12.5, fontWeight: 600, fontFamily: "'Inter',sans-serif",
                  transition: "all .15s",
                }}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={() => setDispatchModal(true)}>
              <Plus size={15} /> Despachar Trabajo
            </button>
          </div>
        }
      />

      {view === "lista" ? (
        <div style={{ display: "grid", gap: 14 }}>
          {jobs.map(job => {
            const c = clients.find(cl => cl.id === job.clienteId);
            const emps = job.empleados.map(eid => staff.find(s => s.id === eid)).filter(Boolean);
            const chk = checklists.find(ch => ch.id === job.checklistId);

            return (
              <div key={job.id} className="card animate-fadeUp schedule-card">
                <div className="schedule-card-left">
                  <Avatar name={c?.nombre || "?"} size={44} />
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{c?.nombre || "Cliente Eliminado"}</p>
                    {(() => {
                      const loc = c && Array.isArray(c.ubicaciones) ? c.ubicaciones.find(u => u.id === job.ubicacionId) : null;
                      return loc?.direccion ? (
                        <p style={{ fontSize: 11, color: C.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                          <MapPin size={10} /> {loc.direccion}
                        </p>
                      ) : (
                        <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{job.fecha} — {job.hora}</p>
                      );
                    })()}
                    <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{job.fecha} — {job.hora}</p>
                  </div>
                </div>

                <div className="schedule-card-center">
                  <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", marginBottom: 6 }}>Equipo Asignado</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {emps.map(emp => (
                      <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 6, background: C.pale, padding: "4px 10px", borderRadius: 20 }}>
                        <Avatar name={emp.nombre} size={20} />
                        <span style={{ fontSize: 12, color: C.primary, fontWeight: 500 }}>{emp.nombre}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="schedule-card-right">
                  <div style={{ marginBottom: 6, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <StatusBadge estado={job.estado} size="sm" />
                    {job.rating ? <StarRating value={job.rating} /> : null}
                    <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                      <button className="btn-ghost" style={{ fontSize: 10, padding: "4px 8px" }}
                        onClick={() => { setEditJob(job); setEditJobForm({ clienteId: job.clienteId, empleados: job.empleados, fecha: job.fecha, hora: job.hora, checklistId: job.checklistId }); }}>
                        <Pencil size={11} /> Editar
                      </button>
                      <button className="btn-ghost" style={{ fontSize: 10, padding: "4px 8px" }}
                        onClick={() => setChecklistModal(job)}>
                        <ClipboardCheck size={11} /> Checklist
                      </button>
                      <button className="btn-ghost" style={{ fontSize: 10, padding: "4px 8px", color: C.danger }}
                        onClick={() => deleteJob(job.id, c?.nombre || "este trabajo")}>
                        <Trash2 size={11} /> Eliminar
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: C.muted }}>Checklist: {chk?.nombre}</p>
                </div>
              </div>
            );
          })}
          {jobs.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: 40, color: C.muted }}>
              No hay trabajos programados.
            </div>
          )}
        </div>
      ) : (
        <ScheduleCalendarView
          jobs={jobs} clients={clients} staff={staff}
          onOpenChecklist={setChecklistModal}
        />
      )}

      {dispatchModal && (
        <Modal title="Despachar Nuevo Trabajo" onClose={() => setDispatchModal(false)} wide gradient>
          <form onSubmit={handleDispatch} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-grid-2">
              <Field label="Cliente">
                <select required className="input-base" value={form.clienteId} onChange={e => setForm({ ...form, clienteId: e.target.value, ubicacionId: "" })}>
                  <option value="">Selecciona un cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </Field>
              <Field label="Checklist a utilizar">
                <select required className="input-base" value={form.checklistId} onChange={e => setForm({ ...form, checklistId: e.target.value })}>
                  {checklists.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Local / Ubicación">
              <select required className="input-base" value={form.ubicacionId} onChange={e => setForm({ ...form, ubicacionId: e.target.value })} disabled={!form.clienteId}>
                <option value="">Selecciona un local…</option>
                {selectedClientUbicaciones.map(u => (
                  <option key={u.id} value={u.id}>{u.direccion || `Local ${u.id}`}</option>
                ))}
              </select>
              {selectedClientUbicaciones.length === 0 && form.clienteId && (
                <p style={{ fontSize: 11, color: C.amber, marginTop: 4 }}>Este cliente no tiene locales cargados. Agregalos en la ficha del cliente.</p>
              )}
            </Field>

            {selectedClient && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "8px 10px", borderRadius: 10, background: C.pale }}>
                <FrequencyBadge frecuencia={selectedClient.frecuencia} />
                {!selectedClient.frecuencia?.activa && (
                  <span style={{ fontSize: 11, color: C.primary }}>Este cliente no tiene frecuencia recurrente configurada.</span>
                )}
              </div>
            )}

            <div className="form-grid-2">
              <Field label="Fecha">
                <DateField value={form.fecha} onChange={(fecha) => setForm({ ...form, fecha })} />
              </Field>
              <Field label="Hora">
                <input required type="time" className="input-base" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} />
              </Field>
            </div>

            <Field label="Empleados Asignados (Múltiple)">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: 10, border: "1px solid #D8EDE7", borderRadius: 12, background: "#fafcfb" }}>
                {staff.map(s => (
                  <button type="button" key={s.id} onClick={() => toggleEmpleado(s.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, cursor: "pointer", border: "1px solid",
                      background: form.empleados.includes(s.id) ? C.primary : "#fff",
                      color: form.empleados.includes(s.id) ? "#fff" : C.ink,
                      borderColor: form.empleados.includes(s.id) ? C.primary : "#D8EDE7",
                      transition: "all .2s"
                    }}>
                    <Avatar name={s.nombre} size={20} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{s.nombre}</span>
                    {form.empleados.includes(s.id) && <CheckCircle2 size={14} />}
                  </button>
                ))}
              </div>
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid #EAF4F1" }}>
              <button type="button" className="btn-ghost" onClick={() => setDispatchModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Asignar Trabajo</button>
            </div>
          </form>
        </Modal>
      )}
      {editJob && (
        <Modal title="Editar Trabajo" onClose={() => setEditJob(null)} wide gradient>
          <form onSubmit={handleEditJob} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-grid-2">
              <Field label="Cliente">
                <select required className="input-base" value={editJobForm.clienteId} onChange={e => setEditJobForm({ ...editJobForm, clienteId: e.target.value, ubicacionId: "" })}>
                  <option value="">Selecciona un cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </Field>
              <Field label="Checklist a utilizar">
                <select required className="input-base" value={editJobForm.checklistId} onChange={e => setEditJobForm({ ...editJobForm, checklistId: e.target.value })}>
                  {checklists.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Local / Ubicación">
              <select required className="input-base" value={editJobForm.ubicacionId} onChange={e => setEditJobForm({ ...editJobForm, ubicacionId: e.target.value })} disabled={!editJobForm.clienteId}>
                <option value="">Selecciona un local…</option>
                {Array.isArray(clients.find(c => c.id === editJobForm.clienteId)?.ubicaciones) && clients.find(c => c.id === editJobForm.clienteId).ubicaciones.map(u => (
                  <option key={u.id} value={u.id}>{u.direccion || `Local ${u.id}`}</option>
                ))}
              </select>
            </Field>

            {clients.find(c => c.id === editJobForm.clienteId) && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "8px 10px", borderRadius: 10, background: C.pale }}>
                <FrequencyBadge frecuencia={clients.find(c => c.id === editJobForm.clienteId).frecuencia} />
                {!clients.find(c => c.id === editJobForm.clienteId).frecuencia?.activa && (
                  <span style={{ fontSize: 11, color: C.primary }}>Este cliente no tiene frecuencia recurrente configurada.</span>
                )}
              </div>
            )}

            <div className="form-grid-2">
              <Field label="Fecha">
                <DateField value={editJobForm.fecha} onChange={(fecha) => setEditJobForm({ ...editJobForm, fecha })} />
              </Field>
              <Field label="Hora">
                <input required type="time" className="input-base" value={editJobForm.hora} onChange={e => setEditJobForm({ ...editJobForm, hora: e.target.value })} />
              </Field>
            </div>

            <Field label="Empleados Asignados (Múltiple)">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: 10, border: "1px solid #D8EDE7", borderRadius: 12, background: "#fafcfb" }}>
                {staff.map(s => (
                  <button type="button" key={s.id} onClick={() => toggleEmpleadosEdit(s.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, cursor: "pointer", border: "1px solid",
                      background: editJobForm.empleados.includes(s.id) ? C.primary : "#fff",
                      color: editJobForm.empleados.includes(s.id) ? "#fff" : C.ink,
                      borderColor: editJobForm.empleados.includes(s.id) ? C.primary : "#D8EDE7",
                      transition: "all .2s"
                    }}>
                    <Avatar name={s.nombre} size={20} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{s.nombre}</span>
                    {editJobForm.empleados.includes(s.id) && <CheckCircle2 size={14} />}
                  </button>
                ))}
              </div>
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid #EAF4F1" }}>
              <button type="button" className="btn-ghost" onClick={() => setEditJob(null)}>Cancel</button>
              <button type="submit" className="btn-primary">Guardar cambios</button>
            </div>
          </form>
        </Modal>
      )}
      {checklistModal && (() => {
        const job = jobs.find(j => j.id === checklistModal.id) || checklistModal;
        const c = clients.find(cl => cl.id === job.clienteId);
        const chk = checklists.find(ch => ch.id === job.checklistId);
        const done = Object.values(job.tareasCompletadas || {}).filter(Boolean).length;
        const total = chk?.tareas.length || 0;
        const progress = total ? Math.round((done / total) * 100) : 0;

        return (
          <Modal title={`Checklist — ${c?.nombre || "Cliente"}`} onClose={() => setChecklistModal(null)} gradient>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <StatusBadge estado={job.estado} />
                {job.horaInicio && !job.horaFin && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.primary, fontWeight: 700 }}>
                    <Clock size={13} /> En curso desde hace <LiveTimer startTime={job.horaInicio} />
                  </div>
                )}
                {job.horaInicio && job.horaFin && (
                  <div style={{ fontSize: 12, color: C.muted }}>
                    ⏱️ Duración total: <strong>{formatDuration(new Date(job.horaFin) - new Date(job.horaInicio))}</strong>
                  </div>
                )}
                <span style={{ fontSize: 12, color: C.primary, fontWeight: 700 }}>{progress}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              {job.rating ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 10, background: C.pale }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.primary }}>Calificación del cliente</span>
                  <StarRating value={job.rating} />
                </div>
              ) : null}
              {job.comentario && (
                <p style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>"{job.comentario}"</p>
              )}
              {job.fotos && job.fotos.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {job.fotos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover", border: "1px solid #D8EDE7" }} />
                    </a>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {chk?.tareas.map((t, i) => {
                  const isDone = !!job.tareasCompletadas?.[i];
                  return (
                    <button key={i} className={`checklist-item ${isDone ? "checked" : ""}`}
                      onClick={() => toggleCheckAdmin(job, i, isDone)}>
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                        background: isDone ? C.primary : "#fff",
                        border: `2px solid ${isDone ? C.primary : "#D8EDE7"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isDone && <CheckCircle2 size={13} color="#fff" />}
                      </div>
                      <span style={{ fontSize: 13, color: isDone ? C.muted : C.ink, flex: 1, textAlign: "left" }}>{t}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 12, borderTop: "1px solid #EAF4F1" }}>
                <button className="btn-ghost" onClick={() => setChecklistModal(null)}>Cerrar</button>
                <button className="btn-primary" disabled={progress < 100} onClick={() => markDoneAdmin(job)}>
                  <CheckCheck size={14} /> Marcar completado
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

function ScheduleCalendarView({ jobs, clients, staff, onOpenChecklist }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [dayModal, setDayModal] = useState(null);
  const hoy = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const jobsPorDia = useMemo(() => {
    const map = {};
    let sinFecha = 0;
    jobs.forEach((j) => {
      const d = parseFechaJob(j.fecha);
      if (!d) { sinFecha++; return; }
      const key = isoKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(j);
    });
    return { map, sinFecha };
  }, [jobs]);

  const celdas = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(start.getDate() - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  function goMonth(delta) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }
  function goToday() {
    const d = new Date(); d.setDate(1); setCursor(d);
  }

  const mesLabel = cursor.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => goMonth(-1)} className="btn-ghost" style={{ padding: "7px 10px" }}>
            <ChevronRight size={15} style={{ transform: "rotate(180deg)" }} />
          </button>
          <h3 style={{
            fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, color: C.ink,
            textTransform: "capitalize", minWidth: 160, textAlign: "center",
          }}>
            {mesLabel}
          </h3>
          <button onClick={() => goMonth(1)} className="btn-ghost" style={{ padding: "7px 10px" }}>
            <ChevronRight size={15} />
          </button>
        </div>
        <button onClick={goToday} className="btn-ghost" style={{ fontSize: 12 }}>Hoy</button>
      </div>

      {jobsPorDia.sinFecha > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
          fontSize: 11.5, color: C.muted, background: "#FDF3E7", borderRadius: 10, padding: "7px 12px",
          border: "1px solid #F5D9A8",
        }}>
          <AlertTriangle size={13} color={C.amber} />
          {jobsPorDia.sinFecha} {jobsPorDia.sinFecha === 1 ? "trabajo tiene" : "trabajos tienen"} una fecha que no pude ubicar en el calendario. Revisalos en la vista Lista.
        </div>
      )}

      <div className="calendar-scroll-wrapper">
        <div className="calendar-scroll-inner" style={{ border: "1px solid #E4EEEA", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid #E4EEEA" }}>
            {DIAS.map((d) => (
              <div key={d} style={{
                padding: "9px 0", textAlign: "center", fontSize: 11, fontWeight: 700,
                color: C.muted, textTransform: "uppercase", letterSpacing: ".04em",
                background: "#FAFCFB",
              }}>{d}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateRows: "repeat(6,1fr)" }}>
            {Array.from({ length: 6 }, (_, week) => (
              <div key={week} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
                {celdas.slice(week * 7, week * 7 + 7).map((d) => {
                  const enMes = d.getMonth() === cursor.getMonth();
                  const esHoy = sameDay(d, hoy);
                  const jobsDia = jobsPorDia.map[isoKey(d)] || [];
                  const visibles = jobsDia.slice(0, 3);
                  const resto = jobsDia.length - visibles.length;

                  return (
                    <div key={isoKey(d)}
                      onClick={() => jobsDia.length > 0 && setDayModal(d)}
                      style={{
                        minHeight: 96, padding: "6px 6px 8px",
                        borderRight: "1px solid #EEF3F1", borderBottom: "1px solid #EEF3F1",
                        background: enMes ? "#fff" : "#FAFCFB",
                        cursor: jobsDia.length > 0 ? "pointer" : "default",
                        transition: "background .12s",
                      }}
                      onMouseEnter={(e) => { if (jobsDia.length) e.currentTarget.style.background = "#F5FAF8"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = enMes ? "#fff" : "#FAFCFB"; }}
                    >
                      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
                        <span style={{
                          width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                          borderRadius: "50%", fontSize: 11.5, fontWeight: esHoy ? 700 : 500,
                          color: esHoy ? "#fff" : enMes ? C.ink : "#B0C4BE",
                          background: esHoy ? C.primary : "transparent",
                        }}>
                          {d.getDate()}
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {visibles.map((job) => {
                          const c = clients.find(cl => cl.id === job.clienteId);
                          return (
                            <div key={job.id}
                              onClick={(e) => { e.stopPropagation(); onOpenChecklist(job); }}
                              style={{
                                display: "flex", alignItems: "center", gap: 4,
                                fontSize: 10.5, padding: "2px 5px", borderRadius: 5,
                                background: C.pale, color: C.primary, fontWeight: 600,
                                overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                                cursor: "pointer",
                              }}>
                              <span style={{
                                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                                background: ESTADO_DOT[job.estado] || C.muted,
                              }} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                {job.hora} {c?.nombre || "Cliente"}
                              </span>
                            </div>
                          );
                        })}
                        {resto > 0 && (
                          <span style={{ fontSize: 10, color: C.muted, paddingLeft: 5, fontWeight: 600 }}>
                            +{resto} más
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {dayModal && (
        <Modal
          title={dayModal.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
          onClose={() => setDayModal(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(jobsPorDia.map[isoKey(dayModal)] || [])
              .slice()
              .sort((a, b) => (a.hora || "").localeCompare(b.hora || ""))
              .map((job) => {
                const c = clients.find(cl => cl.id === job.clienteId);
                const emps = job.empleados.map(eid => staff.find(s => s.id === eid)).filter(Boolean);
                return (
                  <button key={job.id}
                    onClick={() => { setDayModal(null); onOpenChecklist(job); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                      padding: "10px 12px", borderRadius: 10, border: "1px solid #EAF4F1",
                      background: "#FAFCFB", cursor: "pointer",
                    }}>
                    <span className="font-mono-data" style={{ fontSize: 12, color: C.muted, width: 42, flexShrink: 0 }}>{job.hora}</span>
                    <Avatar name={c?.nombre || "?"} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{c?.nombre || "Cliente Eliminado"}</p>
                      <p style={{ fontSize: 11, color: C.muted }}>{emps.map(e => e.nombre).join(", ") || "Sin asignar"}</p>
                    </div>
                    <StatusBadge estado={job.estado} size="sm" />
                  </button>
                );
              })}
          </div>
        </Modal>
      )}
    </div>
  );
}

function ChecklistsPage({ checklists, setChecklists }) {
  const [activeId, setActiveId] = useState(checklists[0]?.id || "");
  const [newTask, setNewTask] = useState("");
  const active = checklists.find(c => c.id === activeId);

  async function addTask() {
    if (!newTask.trim() || !active) return;
    const updated = { ...active, tareas: [...active.tareas, newTask.trim()] };
    setChecklists(checklists.map(c => c.id === activeId ? updated : c));
    await supabase.from('checklists').update({ tareas: updated.tareas }).eq('id', activeId);
    setNewTask("");
    toast("Tarea agregada al checklist");
  }

  async function removeTask(idx) {
    const updated = { ...active, tareas: active.tareas.filter((_, i) => i !== idx) };
    setChecklists(checklists.map(c => c.id === activeId ? updated : c));
    await supabase.from('checklists').update({ tareas: updated.tareas }).eq('id', activeId);
  }

  async function createNewChecklist() {
    const id = "t-" + Date.now();
    const newChecklist = { id, nombre: "Nuevo Checklist", tareas: [] };
    setChecklists([...checklists, newChecklist]);
    await supabase.from('checklists').insert(newChecklist);
    setActiveId(id);
    toast("Nuevo checklist creado");
  }
  async function deleteChecklist(id, nombre) {
    if (confirm(`¿Eliminar el checklist "${nombre}"?`)) {
      const remaining = checklists.filter(c => c.id !== id);
      setChecklists(remaining);
      await supabase.from('checklists').delete().eq('id', id);
      if (activeId === id) setActiveId(remaining[0]?.id || "");
      toast("Checklist eliminado", "error");
    }
  }
  return (
    <div>
      <div className="page-header-row">
        <PageHeader title="Checklists" subtitle="El estándar que convierte tu conocimiento en instrucciones repetibles." />
        <button className="btn-primary ckeck-button" onClick={createNewChecklist}>
          <Plus size={15} /> Nuevo Checklist
        </button>
      </div>

      <div className="checklists-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {checklists.map((t) => (
            <button key={t.id} onClick={() => setActiveId(t.id)}
              style={{
                padding: "14px 16px", borderRadius: 14, border: "none", cursor: "pointer", textAlign: "left",
                background: activeId === t.id ? C.primary : "#fff",
                color: activeId === t.id ? "#fff" : C.ink,
                border: `1.5px solid ${activeId === t.id ? C.primary : "#D8EDE7"}`,
                transition: "all .2s", fontFamily: "'Inter',sans-serif",
                boxShadow: activeId === t.id ? `0 4px 16px ${C.glow}` : "none",
              }}>
              <p style={{ fontWeight: 700, fontSize: 13 }}>{t.nombre}</p>
              <p style={{ fontSize: 11, marginTop: 3, opacity: activeId === t.id ? .75 : .55 }}>{t.tareas.length} tareas</p>
            </button>
          ))}
        </div>

        {active ? (
          <div className="card animate-fadeIn">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 15 }}>
              <input
                className="input-base"
                value={active.nombre}
                onChange={(e) => setChecklists(checklists.map(c => c.id === activeId ? { ...c, nombre: e.target.value } : c))}
                onBlur={async (e) => await supabase.from('checklists').update({ nombre: e.target.value }).eq('id', activeId)}
                style={{ fontSize: 18, fontWeight: 700, border: "none", padding: "4px 0", background: "transparent", color: C.ink }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontSize: 12, color: C.primary, fontWeight: 600,
                  background: C.pale, padding: "4px 12px", borderRadius: 20
                }}>
                  {active.tareas.length}
                </span>
                <button onClick={() => deleteChecklist(active.id, active.nombre)} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 10, border: "1.5px solid #F5AAAA",
                  background: "#FEF8F8", color: C.danger, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  fontFamily: "'Inter',sans-serif",
                }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <ol style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {active.tareas.map((t, i) => (
                <li key={i} className="animate-fadeUp"
                  style={{
                    animationDelay: `${i * 40}ms`, display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 14px", borderRadius: 12,
                    border: "1.5px solid #EAF4F1", background: "#FAFCFB"
                  }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                    background: C.pale, color: C.primary,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 500,
                  }}>{i + 1}</span>

                  <input
                    style={{ flex: 1, fontSize: 13, color: C.ink, border: "none", background: "transparent" }}
                    value={t}
                    onChange={(e) => setChecklists(checklists.map(c =>
                      c.id === activeId ? { ...c, tareas: c.tareas.map((tarea, idx) => idx === i ? e.target.value : tarea) } : c
                    ))}
                  />

                  <button onClick={() => removeTask(i)}
                    style={{
                      padding: 4, borderRadius: 6, border: "none", background: "transparent",
                      cursor: "pointer", color: "#C0D8D2", transition: "color .15s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = C.danger}
                    onMouseLeave={(e) => e.currentTarget.style.color = "#C0D8D2"}>
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ol>

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <input className="input-base" value={newTask} onChange={(e) => setNewTask(e.target.value)}
                placeholder="Agregar nueva tarea…"
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                style={{ flex: 1 }} />
              <button className="btn-primary" onClick={addTask}>
                <Plus size={15} /> Agregar
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
            Selecciona o crea un checklist para editar.
          </div>
        )}
      </div>
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { borderRadius: 12, border: "1px solid #D8EDE7", boxShadow: "0 4px 16px rgba(0,0,0,.08)", fontSize: 12 },
};

function ReportsPage({ staff, jobs, clients }) {
  const horasPorCliente = useMemo(() => {
    const map = {};
    jobs.forEach((j) => {
      const hrs = jobHours(j);
      if (!hrs) return;
      const client = clients.find((c) => c.id === j.clienteId);
      const key = client?.nombre || "Otro";
      map[key] = (map[key] || 0) + hrs;
    });
    return Object.entries(map)
      .map(([cliente, horas]) => ({ cliente, horas: Math.round(horas * 10) / 10 }))
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 8);
  }, [jobs, clients]);

  const cumplimientoPie = useMemo(() => {
    const completo = jobs.filter((j) => j.estado === "completo").length;
    const pendiente = jobs.filter((j) => j.estado === "pendiente" || j.estado === "en_curso").length;
    const incidente = jobs.filter((j) => j.estado === "incidente").length;
    return [
      { name: "Completo", value: completo },
      { name: "Pendiente / en curso", value: pendiente },
      { name: "Incidente", value: incidente },
    ].filter((d) => d.value > 0);
  }, [jobs]);

  const tendenciaMensual = useMemo(() => {
    const map = {};
    jobs.forEach((j) => {
      const d = jobDate(j);
      if (!d) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!map[key]) map[key] = { mes: monthLabel(d), trabajos: 0, order: d.getFullYear() * 12 + d.getMonth() };
      map[key].trabajos += 1;
    });
    return Object.values(map).sort((a, b) => a.order - b.order);
  }, [jobs]);

  const overallRating = avgRating(jobs);

  return (
    <div>
      <PageHeader title="Reportes" subtitle="Para saber qué contratos son rentables y quién rinde mejor." />
      <div className="reports-grid">
        <div className="card animate-fadeUp" style={{ overflow: "hidden" }}>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 16 }}>
            Horas reales por cliente
          </h3>
          {horasPorCliente.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={horasPorCliente} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAF4F1" vertical={false} />
                <XAxis dataKey="cliente" tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} width={32} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="horas" fill={C.primary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "40px 0" }}>
              Todavía no hay trabajos con hora de inicio y fin registradas.
            </p>
          )}
        </div>

        <div className="card animate-fadeUp delay-75" style={{ overflow: "hidden" }}>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 16 }}>
            Cumplimiento de checklists
          </h3>
          {cumplimientoPie.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                  <Pie data={cumplimientoPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={4}>
                    {cumplimientoPie.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                {cumplimientoPie.map((entry, i) => (
                  <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span style={{ fontSize: 11, color: C.muted }}>{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "40px 0" }}>Sin trabajos registrados todavía.</p>
          )}
        </div>

        <div className="card animate-fadeUp delay-150" style={{ overflow: "hidden" }}>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 16 }}>
            Tendencia mensual — trabajos
          </h3>
          {tendenciaMensual.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={tendenciaMensual} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id="gradTrab" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.bright} stopOpacity={.25} />
                    <stop offset="95%" stopColor={C.bright} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAF4F1" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="trabajos" stroke={C.bright} strokeWidth={2.5} fill="url(#gradTrab)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "40px 0" }}>Sin datos suficientes todavía.</p>
          )}
        </div>

        <div className="card animate-fadeUp delay-225" style={{ overflow: "hidden" }}>
          <h3 style={{
            fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 4,
            display: "flex", alignItems: "center", gap: 8
          }}>
            <TrendingUp size={16} color={C.primary} /> Ranking de personal
          </h3>
          {overallRating && (
            <p style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
              Calificación promedio general: <StarRating value={overallRating} />
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
            {[...staff]
              .map((s) => {
                const sJobs = jobsForStaff(jobs, s.id);
                return { ...s, realCumplimiento: sJobs.length ? complianceRate(sJobs) : s.cumplimiento, realRating: avgRating(sJobs) };
              })
              .sort((a, b) => b.realCumplimiento - a.realCumplimiento)
              .map((s, i) => {
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div key={s.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: 12,
                    border: "1.5px solid #EAF4F1", background: "#FAFCFB",
                    minWidth: 0,
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{medals[i] || `#${i + 1}`}</span>
                    <Avatar name={s.nombre} size={32} />
                    <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.nombre}</p>
                      <div style={{ width: 100, marginTop: 4 }}>
                        <div className="progress-track" style={{ height: 4 }}>
                          <div className="progress-fill" style={{ width: `${s.realCumplimiento}%` }} />
                        </div>
                      </div>
                    </div>
                    <StarRating value={s.realRating} empty="—" />
                    <span style={{ fontSize: 12, color: C.primary, fontWeight: 700, flexShrink: 0 }}>{s.realCumplimiento}%</span>
                    {s.destacado && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                        background: "#FDF3E7", color: C.amber, flexShrink: 0,
                      }}>★ Top</span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployeeView({ session, onLogout, clients, jobs, setJobs, checklists }) {
  const empId = session.empleadoId || session.id;
  const misTrabajos = jobs.filter((j) => j.empleados && j.empleados.includes(empId));
  const trabajosHoy = misTrabajos.filter((j) => j.estado !== "completo");
  const historial = useMemo(() =>
    misTrabajos.filter((j) => j.estado === "completo")
      .sort((a, b) => new Date(b.horaFin || b.created_at || 0) - new Date(a.horaFin || a.created_at || 0)),
    [misTrabajos]);
  const [tab, setTab] = useState("hoy");
  const [doneJob, setDoneJob] = useState(null);
  const [incidentModal, setIncidentModal] = useState(null);
  const [incidentText, setIncidentText] = useState("");
  const [incidentPhoto, setIncidentPhoto] = useState(null);
  const [openInfoJobId, setOpenInfoJobId] = useState(null);

  const misStats = useMemo(() => ({
    cumplimiento: complianceRate(misTrabajos),
    rating: avgRating(misTrabajos),
    completados: historial.length,
  }), [misTrabajos, historial]);

  function getProgress(job) {
    const template = checklists.find(c => c.id === job.checklistId);
    if (!template || !template.tareas.length) return 0;
    const total = template.tareas.length;
    const done = Object.values(job.tareasCompletadas || {}).filter(Boolean).length;
    return Math.round((done / total) * 100);
  }

  async function handleStartJob(job) {
    const horaInicio = new Date().toISOString();
    const updatedJob = { ...job, horaInicio, estado: "en_curso" };
    setJobs(jobs.map(j => j.id === job.id ? updatedJob : j));
    await supabase.from('jobs').update({ horaInicio, estado: "en_curso" }).eq('id', job.id);
    toast("¡Trabajo iniciado! Cronómetro en marcha ⏱️");
  }

  async function handleMarkDone(job) {
    setDoneJob(job.id);
    const horaFin = new Date().toISOString();
    const updatedJob = { ...job, estado: "completo", horaFin };
    setJobs(jobs.map(j => j.id === job.id ? updatedJob : j));
    await supabase.from('jobs').update({ estado: "completo", horaFin }).eq('id', job.id);
    toast("¡Trabajo marcado como completado! 🎉");
    setTimeout(() => setDoneJob(null), 3000);

    const clienteDelTrabajo = clients.find(c => c.id === job.clienteId);
    if (clienteDelTrabajo?.email) {
      emailJobCompleted({ client: clienteDelTrabajo, job: updatedJob });
    }
  }

  async function toggleCheck(job, idx, done) {
    const tareasCompletadas = { ...(job.tareasCompletadas || {}), [idx]: !done };
    const nextEstado = job.estado === "pendiente" ? "en_curso" : job.estado;
    const updatedJob = { ...job, tareasCompletadas, estado: nextEstado };
    setJobs(jobs.map(j => j.id === job.id ? updatedJob : j));
    await supabase.from('jobs').update({ tareasCompletadas, estado: nextEstado }).eq('id', job.id);
  }

  async function handleCheckAll(job, totalTareas) {
    const updates = {};
    for (let i = 0; i < totalTareas; i++) updates[i] = true;
    const nextEstado = job.estado === "pendiente" ? "en_curso" : job.estado;
    const updatedJob = { ...job, tareasCompletadas: updates, estado: nextEstado };
    setJobs(jobs.map(j => j.id === job.id ? updatedJob : j));
    await supabase.from('jobs').update({ tareasCompletadas: updates, estado: nextEstado }).eq('id', job.id);
  }

  async function handlePhotoUpload(job, file) {
    if (!file) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${job.id}-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('job-photos').upload(fileName, file);
    if (error) { toast("Error al subir la foto", "error"); return; }
    const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(fileName);
    const fotos = [...(job.fotos || []), urlData.publicUrl];
    const updatedJob = { ...job, fotos };
    setJobs(jobs.map(j => j.id === job.id ? updatedJob : j));
    await supabase.from('jobs').update({ fotos }).eq('id', job.id);
    toast("Foto agregada al trabajo 📸");
  }

  async function handleRemovePhoto(job, urlToRemove) {
    const fotos = (job.fotos || []).filter(url => url !== urlToRemove);
    const updatedJob = { ...job, fotos };
    setJobs(jobs.map(j => j.id === job.id ? updatedJob : j));
    await supabase.from('jobs').update({ fotos }).eq('id', job.id);
    try {
      const fileName = urlToRemove.split('/').pop();
      await supabase.storage.from('job-photos').remove([fileName]);
    } catch (e) { }
    toast("Foto eliminada");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F2F8F6" }}>
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px",
        background: `linear-gradient(135deg, ${C.primary}, ${C.mid})`,
        color: "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.2)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15 }}>
              Hola, {session.nombre.split(" ")[0]} 👋
            </p>
            <p style={{ fontSize: 11, opacity: .7 }}>
              {trabajosHoy.length} {trabajosHoy.length === 1 ? "trabajo pendiente" : "trabajos pendientes"} hoy
            </p>
          </div>
        </div>
        <button onClick={onLogout} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,.15)", border: "none", borderRadius: 10,
          padding: "8px 14px", color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer",
          fontFamily: "'Inter',sans-serif",
        }}>
          <LogOut size={13} /> Salir
        </button>
      </header>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 16px 0" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10,
          background: "#fff", borderRadius: 16, padding: 14, border: "1px solid #D8EDE7",
          boxShadow: "0 2px 8px rgba(0,0,0,.04)",
        }} className="animate-fadeUp">
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, fontWeight: 600, color: C.primary }}>{misStats.cumplimiento}%</p>
            <p style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Cumplimiento</p>
          </div>
          <div style={{ textAlign: "center", borderLeft: "1px solid #EAF4F1", borderRight: "1px solid #EAF4F1" }}>
            <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, fontWeight: 600, color: C.primary }}>
              {misStats.rating ?? "—"}
            </p>
            <p style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Rating promedio</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, fontWeight: 600, color: C.primary }}>{misStats.completados}</p>
            <p style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Completados</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, background: "#E8F0ED", borderRadius: 10, padding: 4, marginTop: 12 }}>
          {[{ id: "hoy", label: `Hoy (${trabajosHoy.length})`, icon: Clock }, { id: "historial", label: `Historial (${historial.length})`, icon: History }].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer",
                background: active ? "#fff" : "transparent",
                color: active ? C.primary : C.muted,
                boxShadow: active ? "0 1px 4px rgba(0,0,0,.08)" : "none",
                fontSize: 12, fontWeight: 600, fontFamily: "'Inter',sans-serif", transition: "all .15s",
              }}>
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {tab === "hoy" && trabajosHoy.map((job, ji) => {
          const cliente = clients.find((c) => c.id === job.clienteId);
          const template = checklists.find(c => c.id === job.checklistId);
          const progress = getProgress(job);
          const isCompleted = doneJob === job.id;
          const showInfo = openInfoJobId === job.id;

          return (
            <div key={job.id} className={`animate-fadeUp`} style={{ animationDelay: `${ji * 80}ms` }}>
              <div style={{
                borderRadius: 18, background: "#fff", overflow: "hidden",
                border: "1px solid #D8EDE7",
                boxShadow: isCompleted ? `0 0 0 2px ${C.bright}, 0 8px 24px ${C.glow}` : "0 2px 8px rgba(0,0,0,.06)",
                transition: "box-shadow .3s",
              }}>
                <div style={{
                  padding: "16px 18px",
                  background: isCompleted
                    ? `linear-gradient(135deg, ${C.primary}, ${C.bright})`
                    : "linear-gradient(135deg, #F8FDFB, #F2F8F6)",
                  borderBottom: "1px solid #EAF4F1",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={cliente?.nombre || "?"} size={38}
                        bg={isCompleted ? "rgba(255,255,255,.2)" : C.pale}
                        color={isCompleted ? "#fff" : C.primary} />
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, color: isCompleted ? "#fff" : C.ink }}>{cliente?.nombre}</p>
                        {(() => {
                          const loc = cliente && Array.isArray(cliente.ubicaciones) ? cliente.ubicaciones.find(u => u.id === job.ubicacionId) : null;
                          return loc?.direccion ? (
                            <p style={{ fontSize: 11, color: isCompleted ? "rgba(255,255,255,.8)" : C.muted, marginTop: 1, display: "flex", alignItems: "center", gap: 4 }}>
                              <MapPin size={10} /> {loc.direccion}
                            </p>
                          ) : null;
                        })()}
                        <p style={{ fontSize: 11, color: isCompleted ? "rgba(255,255,255,.7)" : C.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                          🕐 {job.hora}
                          {cliente?.rubro && <><span style={{ opacity: .5 }}>·</span> {cliente.rubro}</>}
                        </p>
                      </div>
                    </div>
                    {isCompleted ? (
                      <CheckCheck size={24} color="#fff" className="animate-checkBounce" />
                    ) : (
                      <StatusBadge estado={job.estado} />
                    )}
                  </div>

                  {!isCompleted && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>
                          Progreso
                        </span>
                        <span style={{ fontSize: 11, color: C.primary, fontWeight: 700 }}>{progress}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {cliente && !isCompleted && (
                  <div style={{ padding: "0 18px", marginTop: 10 }}>
                    <button
                      onClick={() => setOpenInfoJobId(showInfo ? null : job.id)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "10px 12px", borderRadius: 10,
                        background: showInfo ? C.pale : "#F8FDFB",
                        border: `1px solid ${showInfo ? C.bright : "#D8EDE7"}`,
                        cursor: "pointer", transition: "all .2s",
                        fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 600, color: C.primary,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <MapPin size={15} /> Información del lugar
                      </span>
                      <ChevronRight size={16} style={{ transform: showInfo ? "rotate(90deg)" : "", transition: "transform .2s" }} />
                    </button>

                    {showInfo && (
                      <div className="animate-fadeIn" style={{
                        marginTop: 10, padding: "14px", borderRadius: 12,
                        background: "#FAFCFB", border: "1px solid #D8EDE7",
                      }}>
                        {(() => {
                          const loc = cliente && Array.isArray(cliente.ubicaciones)
                            ? cliente.ubicaciones.find(u => u.id === job.ubicacionId)
                            : null;
                          return loc ? (
                            <div style={{ marginBottom: 10 }}>
                              <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: C.muted, marginBottom: 6 }}>Ubicación del trabajo</p>
                              <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "8px 10px", borderRadius: 8, background: "#fff",
                                border: "1px solid #EAF4F1",
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                  <MapPin size={14} color={C.primary} />
                                  <span style={{ fontSize: 12, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {loc.direccion || `Local ${loc.id}`}
                                  </span>
                                </div>
                                {loc.mapsLink && (
                                  <a href={loc.mapsLink} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: 11, color: C.primary, fontWeight: 600, textDecoration: "none", flexShrink: 0, marginLeft: 8 }}>
                                    Abrir
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : null;
                        })()}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {[
                            { icon: KeyRound, label: "Acceso", value: cliente.acceso },
                            { icon: Wifi, label: "Wifi", value: cliente.wifi },
                            { icon: Phone, label: "Contacto", value: cliente.contactoHabitual },
                            { icon: Phone, label: "Emergencia", value: cliente.contactoEmergencia },
                            { icon: Package, label: "Productos", value: cliente.productos },
                            { icon: Eye, label: "Discreción", value: cliente.discrecion },
                          ].filter(item => item.value).map((item, idx) => {
                            const Icon = item.icon;
                            return (
                              <div key={idx} style={{
                                display: "flex", alignItems: "flex-start", gap: 8,
                                padding: "8px 10px", borderRadius: 8, background: "#fff",
                                border: "1px solid #EAF4F1",
                              }}>
                                <Icon size={14} color={C.primary} style={{ marginTop: 2, flexShrink: 0 }} />
                                <div>
                                  <p style={{ fontSize: 10, fontWeight: 600, color: C.muted }}>{item.label}</p>
                                  <p style={{ fontSize: 12, color: C.ink }}>{item.value}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {Array.isArray(cliente.fotosReferencia) && cliente.fotosReferencia.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: C.muted, marginBottom: 6 }}>
                              Fotos de referencia
                            </p>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 8 }}>
                              {cliente.fotosReferencia.map((foto, idx) => (
                                <a key={idx} href={foto.url} target="_blank" rel="noopener noreferrer"
                                  style={{ textAlign: "center", textDecoration: "none" }}>
                                  <img src={foto.url} alt={TIPO_FOTO_LABEL[foto.tipo] || "Referencia"}
                                    style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, border: "1px solid #D8EDE7" }} />
                                  <span style={{ fontSize: 9, display: "block", color: C.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {TIPO_FOTO_LABEL[foto.tipo] || "Otro"}
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!isCompleted && !job.horaInicio && (
                  <button onClick={() => handleStartJob(job)} style={{
                    width: "calc(100% - 36px)", margin: "12px 18px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "11px 0", borderRadius: 10, border: "none",
                    background: `linear-gradient(135deg, ${C.primary}, ${C.bright})`,
                    color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    fontFamily: "'Inter',sans-serif",
                  }}>
                    <Clock size={15} /> Iniciar Trabajo
                  </button>
                )}

                {!isCompleted && job.horaInicio && (
                  <div style={{ margin: "12px 18px 0", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.primary, fontWeight: 700 }}>
                    <Clock size={13} /> En curso: <LiveTimer startTime={job.horaInicio} />
                  </div>
                )}

                {!isCompleted && job.horaInicio && (
                  <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase" }}>Checklist: {template?.nombre}</span>
                      <button onClick={() => handleCheckAll(job, template?.tareas.length || 0)} style={{
                        padding: "4px 8px", borderRadius: 6, border: "none", background: C.pale, color: C.primary, fontSize: 10, fontWeight: 600, cursor: "pointer"
                      }}>
                        Completar Todo
                      </button>
                    </div>
                    {template?.tareas.map((t, i) => {
                      const done = !!job.tareasCompletadas?.[i];
                      return (
                        <button key={i} className={`checklist-item ${done ? "checked" : ""}`}
                          onClick={() => toggleCheck(job, i, done)}>
                          <div style={{
                            width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                            background: done ? C.primary : "#fff",
                            border: `2px solid ${done ? C.primary : "#D8EDE7"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all .2s",
                          }}>
                            {done && <CheckCircle2 size={13} color="#fff" className="animate-checkBounce" />}
                          </div>
                          <span style={{ fontSize: 13, color: done ? C.muted : C.ink, flex: 1 }}>
                            {t}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {job.fotos && job.fotos.length > 0 && (
                  <div style={{ padding: "0 18px 14px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {job.fotos.map((url, i) => (
                      <div key={i} style={{ position: "relative" }}>
                        <img src={url} alt="" style={{
                          width: 48, height: 48, borderRadius: 8, objectFit: "cover",
                          border: "1px solid #D8EDE7",
                        }} />
                        <button onClick={() => handleRemovePhoto(job, url)} style={{
                          position: "absolute", top: -6, right: -6,
                          width: 18, height: 18, borderRadius: "50%",
                          background: C.danger, border: "2px solid #fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", padding: 0,
                        }}>
                          <X size={10} color="#fff" strokeWidth={3} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {!isCompleted && (
                  <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid #EAF4F1" }}>
                    <label style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "9px 0", borderRadius: 10, border: "1.5px solid #D8EDE7",
                      background: "#fff", color: C.muted, fontSize: 12, fontWeight: 500, cursor: "pointer",
                      fontFamily: "'Inter',sans-serif",
                    }}>
                      <Camera size={14} /> Foto {job.fotos?.length > 0 && `(${job.fotos.length})`}
                      <input type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                        onChange={(e) => handlePhotoUpload(job, e.target.files[0])} />
                    </label>
                    <button onClick={() => setIncidentModal(job)} style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "9px 0", borderRadius: 10, border: "1.5px solid #F5AAAA",
                      background: "#FEF8F8", color: C.danger, fontSize: 12, fontWeight: 500, cursor: "pointer",
                      fontFamily: "'Inter',sans-serif",
                    }}>
                      <AlertTriangle size={14} /> Incidente
                    </button>
                    <button onClick={() => handleMarkDone(job)} disabled={progress < 100}
                      style={{
                        flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "9px 0", borderRadius: 10, border: "none",
                        background: progress >= 100 ? `linear-gradient(135deg,${C.primary},${C.bright})` : "#E8F0ED",
                        color: progress >= 100 ? "#fff" : "#9BBAB4",
                        fontSize: 12, fontWeight: 600, cursor: progress >= 100 ? "pointer" : "not-allowed",
                        fontFamily: "'Inter',sans-serif",
                        transition: "all .2s",
                      }}>
                      <CheckCheck size={14} /> Terminado
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {tab === "hoy" && trabajosHoy.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: C.muted }}>
            <CheckCircle2 size={36} color={C.bright} style={{ margin: "0 auto 12px" }} />
            <p style={{ fontWeight: 600 }}>No tenés trabajos pendientes.</p>
          </div>
        )}

        {tab === "historial" && historial.map((job, ji) => {
          const cliente = clients.find((c) => c.id === job.clienteId);
          const hrs = jobHours(job);
          return (
            <div key={job.id} className="card animate-fadeUp" style={{ animationDelay: `${ji * 60}ms`, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={cliente?.nombre || "?"} size={36} />
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{cliente?.nombre || "Cliente"}</p>
                    <p style={{ fontSize: 11, color: C.muted }}>{job.fecha} — {job.hora}{hrs > 0 ? ` · ${hrs.toFixed(1)}h` : ""}</p>
                  </div>
                </div>
                <StarRating value={job.rating ?? null} empty="Sin calificar" />
              </div>
              {job.comentario && (
                <p style={{ fontSize: 12, color: C.muted, fontStyle: "italic", marginTop: 8 }}>"{job.comentario}"</p>
              )}
            </div>
          );
        })}
        {tab === "historial" && historial.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: C.muted }}>
            <History size={36} color={C.bright} style={{ margin: "0 auto 12px" }} />
            <p style={{ fontWeight: 600 }}>Todavía no completaste trabajos.</p>
          </div>
        )}
      </div>

      {incidentModal && (
        <Modal title="Reportar incidente" onClose={() => { setIncidentModal(null); setIncidentPhoto(null); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ padding: 12, borderRadius: 12, background: "#FEF0F0", color: C.danger, fontSize: 12, fontWeight: 500 }}>
              <AlertTriangle size={13} style={{ display: "inline", marginRight: 6 }} />
              {incidentModal.clienteId && clients && clients.find(c => c.id === incidentModal.clienteId)?.nombre}
            </div>
            <Field label="Descripción del incidente">
              <textarea className="input-base" rows={3} value={incidentText}
                onChange={(e) => setIncidentText(e.target.value)}
                placeholder="Describí qué pasó…" style={{ resize: "vertical" }} />
            </Field>

            <Field label="Foto del incidente (opcional)">
              <div style={{
                display: "flex", flexDirection: "column", gap: 8,
                padding: 10, borderRadius: 10, border: "1.5px dashed #D8EDE7",
                background: "#FAFCFB",
              }}>
                {!incidentPhoto ? (
                  <label style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "12px", cursor: "pointer", color: C.muted,
                    fontSize: 12, fontWeight: 500, fontFamily: "'Inter',sans-serif",
                  }}>
                    <Camera size={16} /> Hacé clic para adjuntar una foto
                    <input type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                      onChange={(e) => setIncidentPhoto(e.target.files[0])} />
                  </label>
                ) : (
                  <div style={{ position: "relative", display: "inline-block", alignSelf: "flex-start" }}>
                    <img src={URL.createObjectURL(incidentPhoto)} alt="Vista previa"
                      style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 8, border: "1px solid #D8EDE7" }} />
                    <button onClick={() => setIncidentPhoto(null)} style={{
                      position: "absolute", top: -6, right: -6,
                      width: 20, height: 20, borderRadius: "50%",
                      background: C.danger, border: "2px solid #fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", padding: 0,
                    }}>
                      <X size={12} color="#fff" strokeWidth={3} />
                    </button>
                  </div>
                )}
              </div>
            </Field>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => { setIncidentModal(null); setIncidentPhoto(null); }}>
                Cancelar
              </button>
              <button className="btn-danger" style={{ flex: 1, justifyContent: "center" }}
                onClick={async () => {
                  let fotoUrl = null;
                  if (incidentPhoto) {
                    const fileExt = incidentPhoto.name.split('.').pop();
                    const fileName = `incident-${incidentModal.id}-${Date.now()}.${fileExt}`;
                    const { error } = await supabase.storage.from('job-photos').upload(fileName, incidentPhoto);
                    if (!error) {
                      const { data } = supabase.storage.from('job-photos').getPublicUrl(fileName);
                      fotoUrl = data.publicUrl;
                    }
                  }
                  const fotosIncidente = [...(incidentModal.fotosincidente || []), fotoUrl].filter(Boolean);
                  const updatedJob = {
                    ...incidentModal,
                    estado: "incidente",
                    motivo: incidentText,
                    fotosincidente: fotosIncidente
                  };
                  setJobs(jobs.map(j => j.id === incidentModal.id ? updatedJob : j));
                  await supabase.from('jobs').update({
                    estado: "incidente",
                    motivo: incidentText,
                    fotosincidente: fotosIncidente
                  }).eq('id', incidentModal.id);
                  setIncidentModal(null);
                  setIncidentText("");
                  setIncidentPhoto(null);
                  toast("Incidente reportado", "error");
                }}>
                <Send size={14} /> Reportar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const JOB_TIMELINE = [
  { id: "t1", label: "Programado", icon: Calendar, key: "scheduled" },
  { id: "t2", label: "En camino", icon: Truck, key: "heading" },
  { id: "t3", label: "Limpiando", icon: Sparkles, key: "cleaning" },
  { id: "t4", label: "¡Listo! ✓", icon: CheckCheck, key: "done" },
];

function ClientPortalView({ client, jobs, checklists, staff, setJobs }) {
  const clientJobs = useMemo(() =>
    jobsForClient(jobs, client.id).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
    [jobs, client.id]);
  const activeJob = clientJobs.find(j => j.estado !== "completo") || clientJobs[0];
  const pastJobs = clientJobs.filter(j => j.id !== activeJob?.id && j.estado === "completo");
  const checklist = activeJob ? checklists.find(c => c.id === activeJob.checklistId) : null;
  const [showConfetti, setShowConfetti] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [comentario, setComentario] = useState("");
  const [requestModal, setRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ tipo: "", notas: "", fecha: "" });
  const [showHistory, setShowHistory] = useState(false);
  const prevEstadoRef = useRef(activeJob?.estado);

  const realRating = avgRating(clientJobs);

  useEffect(() => {
    setRatingValue(0);
    setComentario("");
  }, [activeJob?.id]);

  useEffect(() => {
    if (activeJob && prevEstadoRef.current !== "completo" && activeJob.estado === "completo") {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    prevEstadoRef.current = activeJob?.estado;
  }, [activeJob?.estado]);

  async function submitRating() {
    if (ratingValue === 0) { toast("Elegí una calificación primero", "error"); return; }
    const updatedJob = { ...activeJob, rating: ratingValue, comentario };
    setJobs(jobs.map(j => j.id === activeJob.id ? updatedJob : j));
    await supabase.from('jobs').update({ rating: ratingValue, comentario }).eq('id', activeJob.id);
    toast("¡Gracias por tu valoración!");
  }

  const assignedStaff = activeJob?.empleados ? activeJob.empleados.map(eid => staff.find(s => s.id === eid)).filter(Boolean) : [];

  if (!activeJob) {
    return (
      <div style={{ minHeight: "100vh", background: "#F2F8F6", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <CheckCircle2 size={48} color={C.bright} style={{ marginBottom: 16 }} />
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: C.ink }}>Todo al día</h2>
        <p style={{ color: C.muted, marginTop: 8 }}>No tienes limpiezas programadas en este momento.</p>
      </div>
    );
  }

  const timelineStep = activeJob.estado === "completo" ? 3
    : (activeJob.estado === "en_curso" || activeJob.estado === "incidente") ? 2
      : 0;
  const isCompleted = activeJob.estado === "completo";

  const progress = checklist?.tareas.length
    ? Math.round((Object.values(activeJob.tareasCompletadas || {}).filter(Boolean).length / checklist.tareas.length) * 100)
    : (isCompleted ? 100 : 0);

  return (
    <div style={{ minHeight: "100vh", background: "#F2F8F6", paddingBottom: 40 }}>
      <Confetti active={showConfetti} />

      <header style={{
        background: `linear-gradient(135deg, ${C.primary} 0%, ${C.mid} 60%, ${C.bright} 100%)`,
        padding: "0 20px", position: "sticky", top: 0, zIndex: 30,
        boxShadow: "0 4px 20px rgba(1,102,78,.25)",
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,.2)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Sparkles size={16} color="#fff" />
            </div>
            <div>
              <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: "#fff" }}>
                {client.nombre}
              </p>
              {client.ubicaciones?.[0]?.direccion && (
                <p style={{ fontSize: 10, color: "rgba(255,255,255,.7)", marginTop: 2 }}>
                  <MapPin size={10} style={{ display: "inline", marginRight: 4 }} />
                  {client.ubicaciones[0].direccion}
                </p>
              )}
              <p style={{ fontSize: 10, color: "rgba(255,255,255,.65)" }}>Portal de Cliente en Vivo</p>
            </div>
          </div>
          {pastJobs.length > 0 && (
            <button onClick={() => setShowHistory(true)} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,.18)", border: "none", borderRadius: 10,
              padding: "7px 12px", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer",
              fontFamily: "'Inter',sans-serif",
            }}>
              <History size={13} /> Historial
            </button>
          )}
        </div>
      </header>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>

        <div className="portal-hero animate-fadeUp">
          <div style={{ position: "relative", zIndex: 1 }}>
            <p style={{ fontSize: 11, opacity: .65, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>
              Estado de tu servicio
            </p>
            <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
              {isCompleted ? "¡Tu limpieza está lista! 🎉" :
                activeJob.estado === "incidente" ? "Hay una novedad con tu visita ⚠️" :
                  activeJob.estado === "en_curso" ? "Limpiando ahora mismo ✨" :
                    "Visita programada para hoy"}
              {activeJob.estado === "en_curso" && activeJob.horaInicio && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
                  <Clock size={14} /> Tiempo en el lugar: <LiveTimer startTime={activeJob.horaInicio} />
                </div>
              )}
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
              {assignedStaff.map(emp => (
                <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.2)", padding: "4px 10px", borderRadius: 20 }}>
                  <Avatar name={emp.nombre} size={20} />
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{emp.nombre}</span>
                  {emp.idiomas?.length > 0 && (
                    <span style={{ fontSize: 10, opacity: .8 }}>· {emp.idiomas.join(", ")}</span>
                  )}
                </div>
              ))}
              {realRating && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.2)", padding: "4px 10px", borderRadius: 20 }}>
                  <Star size={13} fill="#FFD700" color="#FFD700" />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{realRating} promedio</span>
                </div>
              )}
            </div>

            {!isCompleted && (
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <div className="live-dot" />
                <span style={{ fontSize: 12, fontWeight: 500 }}>En tiempo real</span>
              </div>
            )}
          </div>
        </div>

        {activeJob.estado === "incidente" && (
          <div className="card animate-fadeUp" style={{ borderColor: "#F5AAAA", background: "#FEF8F8" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.danger, fontWeight: 600, fontSize: 13 }}>
              <AlertTriangle size={16} /> El equipo reportó una novedad
            </div>
            <p style={{ fontSize: 13, color: C.ink, marginTop: 6 }}>{activeJob.motivo}</p>
            {activeJob.fotosincidente?.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8, marginTop: 10 }}>
                {activeJob.fotosincidente.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`Incidente ${i + 1}`} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, border: "1px solid #F5AAAA" }} />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="card animate-fadeUp delay-75">
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 18 }}>
            Estado de la visita
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {JOB_TIMELINE.map((step, i) => {
              const done = i < timelineStep;
              const active = i === timelineStep;
              const Icon = step.icon;
              return (
                <div key={step.id} className={`timeline-step ${done ? "done" : ""} ${active ? "active" : ""}`}
                  style={{ paddingBottom: i < JOB_TIMELINE.length - 1 ? 24 : 0 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: done ? C.primary : active ? C.pale : "#F4F6F5",
                    border: `2px solid ${done ? C.primary : active ? C.bright : "#D8EDE7"}`,
                    boxShadow: active ? `0 0 0 4px ${C.glow}` : "none",
                    transition: "all .4s",
                    animation: active ? "glowPulse 2s ease-in-out infinite" : "none",
                    zIndex: 1, position: "relative",
                  }}>
                    {done ? (
                      <CheckCircle2 size={18} color="#fff" />
                    ) : (
                      <Icon size={16} color={active ? C.primary : "#B0C8C0"} />
                    )}
                  </div>
                  <div style={{ paddingTop: 6 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 700,
                      color: done ? C.primary : active ? C.ink : "#B0C8C0",
                    }}>{step.label}</p>
                    {active && (
                      <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                        Progreso: {progress}% completado
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {checklist && (activeJob.estado === "en_curso" || isCompleted) && (
          <div className="card animate-fadeUp delay-150">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: C.ink }}>
                Detalle del servicio
              </h3>
              <span style={{ fontSize: 12, color: C.primary, fontWeight: 700 }}>{progress}%</span>
            </div>
            <div className="progress-track" style={{ marginBottom: 12 }}>
              <div className="progress-fill" style={{ width: `${progress}%`, transition: "width .3s" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {checklist.tareas.map((t, i) => {
                const isChecked = !!activeJob.tareasCompletadas?.[i];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: isChecked ? 0.6 : 1 }}>
                    {isChecked
                      ? <CheckCircle2 size={14} color={C.bright} />
                      : <Circle size={14} color="#C0D8D2" />
                    }
                    <span style={{ color: isChecked ? C.muted : C.ink, textDecoration: isChecked ? "line-through" : "none" }}>{t}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="card animate-scaleIn" style={{ textAlign: "center" }}>
            <CheckCheck size={36} color={C.bright} style={{ margin: "0 auto 12px" }} />
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 4 }}>
              ¡Limpieza completada!
            </h3>
            {activeJob.horaInicio && activeJob.horaFin && (
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
                ⏱️ Duración total: <strong style={{ color: C.ink }}>{formatDuration(new Date(activeJob.horaFin) - new Date(activeJob.horaInicio))}</strong>
              </p>
            )}
            {!activeJob.rating ? (
              <>
                <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>¿Cómo calificarías el servicio de hoy?</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: ratingValue > 0 ? 18 : 0, flexWrap: "wrap" }}>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button key={v} onClick={() => setRatingValue(v)} style={{
                      width: 48, height: 48, borderRadius: 14, border: "none",
                      background: v <= ratingValue ? C.pale : "#F4F6F5", cursor: "pointer", transition: "all .15s",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.12)"; e.currentTarget.style.background = v <= ratingValue ? C.pale : "#E8F0ED"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.background = v <= ratingValue ? C.pale : "#F4F6F5"; }}>
                      <Star size={24} fill={v <= ratingValue ? C.amber : "none"} color={v <= ratingValue ? C.amber : "#C8D8D4"} />
                    </button>
                  ))}
                </div>

                {ratingValue === 0 && (
                  <p style={{ fontSize: 11.5, color: C.amber, marginTop: 8, fontWeight: 600, textAlign: "center" }}>
                    Seleccioná una calificación para continuar
                  </p>
                )}

                {ratingValue > 0 && (
                  <div className="animate-fadeUp" style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
                    <Field label="Contanos más (opcional)">
                      <textarea className="input-base" rows={2} value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        placeholder="¿Cómo fue tu experiencia?" style={{ resize: "vertical" }} />
                    </Field>
                    <button className="btn-primary" style={{ justifyContent: "center" }} onClick={submitRating}>
                      <Send size={14} /> Enviar valoración
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 10 }}>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <Star key={v} size={22} fill={v <= activeJob.rating ? C.amber : "none"} color={v <= activeJob.rating ? C.amber : "#C8D8D4"} />
                  ))}
                </div>
                {activeJob.comentario && (
                  <p style={{ fontSize: 13, color: C.ink, fontStyle: "italic", margin: "0 auto 12px", maxWidth: 320 }}>
                    "{activeJob.comentario}"
                  </p>
                )}
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: C.pale, borderRadius: 12, padding: "10px 20px",
                  color: C.primary, fontWeight: 600, fontSize: 13
                }}>
                  <Heart size={16} fill={C.bright} color={C.bright} />
                  ¡Gracias por tu valoración!
                </div>
              </div>
            )}
          </div>
        )}

        {activeJob.fotos && activeJob.fotos.length > 0 && (
          <div className="card animate-fadeUp delay-150">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: C.ink }}>
                Fotos del trabajo
              </h3>
              <span style={{ fontSize: 11, color: C.muted, background: "#F2F8F6", padding: "3px 10px", borderRadius: 20 }}>
                {activeJob.fotos.length} {activeJob.fotos.length === 1 ? "foto" : "fotos"}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8 }}>
              {activeJob.fotos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="animate-fadeUp" style={{ animationDelay: `${i * 60}ms`, display: "block" }}>
                  <img src={url} alt={`Foto ${i + 1}`} style={{
                    width: "100%", aspectRatio: "1", objectFit: "cover",
                    borderRadius: 10, border: "1px solid #EAF4F1",
                  }} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {requestModal && (
        <Modal title="Solicitar servicio extra" onClose={() => setRequestModal(false)} gradient>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Tipo de servicio">
              <select className="input-base" value={requestForm.tipo}
                onChange={(e) => setRequestForm({ ...requestForm, tipo: e.target.value })}>
                <option value="">Seleccioná un servicio…</option>
                {SERVICE_TYPES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Fecha preferida">
              <input type="date" className="input-base" value={requestForm.fecha}
                onChange={(e) => setRequestForm({ ...requestForm, fecha: e.target.value })} />
            </Field>
            <Field label="Notas adicionales">
              <textarea className="input-base" rows={3} value={requestForm.notas}
                onChange={(e) => setRequestForm({ ...requestForm, notas: e.target.value })}
                placeholder="Indicá qué necesitás…" style={{ resize: "vertical" }} />
            </Field>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setRequestModal(false)}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 2, justifyContent: "center" }}
                onClick={() => {
                  setRequestModal(false);
                  setRequestForm({ tipo: "", notas: "", fecha: "" });
                  toast("¡Solicitud enviada! Te contactamos pronto 🙌");
                }}>
                <Send size={14} /> Enviar solicitud
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showHistory && (
        <Modal title="Historial de visitas" onClose={() => setShowHistory(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 420, overflowY: "auto" }}>
            {pastJobs.length === 0 && <p style={{ fontSize: 12, color: C.muted }}>Sin visitas anteriores.</p>}
            {pastJobs.map((job) => {
              const hrs = jobHours(job);
              return (
                <div key={job.id} style={{ padding: "10px 12px", borderRadius: 10, background: "#FAFCFB", border: "1px solid #EAF4F1" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>
                      {job.fecha} — {job.hora}{hrs > 0 ? ` · ${hrs.toFixed(1)}h` : ""}
                    </span>
                    <StarRating value={job.rating ?? null} empty="Sin calificar" />
                  </div>
                  {job.comentario && (
                    <p style={{ fontSize: 12, color: C.muted, fontStyle: "italic", marginTop: 4 }}>"{job.comentario}"</p>
                  )}
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [checklists, setChecklists] = useState([]);

  const [portalClientId, setPortalClientId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const portalId = params.get("portal");
    if (portalId) {
      setPortalClientId(portalId);
    } else {
      try { const s = localStorage.getItem("zyloclean_session"); if (s) setSession(JSON.parse(s)); } catch { }
    }

    let cancelled = false;
    const channels = [];

    async function loadAndSync() {
      const [{ data: cData }, { data: sData }, { data: chkData }, { data: jData }] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('staff').select('*'),
        supabase.from('checklists').select('*'),
        supabase.from('jobs').select('*'),
      ]);

      if (cancelled) return;

      setClients(cData || []);
      setStaff(sData || []);
      setChecklists(chkData || []);
      setJobs(jData || []);

      const clientChannel = supabase.channel('public:clients').on('postgres_changes',
        { event: '*', schema: 'public', table: 'clients' }, payload => {
          if (payload.eventType === 'INSERT') {
            setClients(prev => prev.some(i => i.id === payload.new.id) ? prev : [...prev, payload.new]);
          }
          if (payload.eventType === 'UPDATE') setClients(prev => prev.map(i => i.id === payload.new.id ? payload.new : i));
          if (payload.eventType === 'DELETE') setClients(prev => prev.filter(i => i.id !== payload.old.id));
        }).subscribe();
      channels.push(clientChannel);

      const staffChannel = supabase.channel('public:staff').on('postgres_changes',
        { event: '*', schema: 'public', table: 'staff' }, payload => {
          if (payload.eventType === 'INSERT') {
            setStaff(prev => prev.some(i => i.id === payload.new.id) ? prev : [...prev, payload.new]);
          }
          if (payload.eventType === 'UPDATE') setStaff(prev => prev.map(i => i.id === payload.new.id ? payload.new : i));
          if (payload.eventType === 'DELETE') setStaff(prev => prev.filter(i => i.id !== payload.old.id));
        }).subscribe();
      channels.push(staffChannel);

      const checklistsChannel = supabase.channel('public:checklists').on('postgres_changes',
        { event: '*', schema: 'public', table: 'checklists' }, payload => {
          if (payload.eventType === 'INSERT') {
            setChecklists(prev => prev.some(i => i.id === payload.new.id) ? prev : [...prev, payload.new]);
          }
          if (payload.eventType === 'UPDATE') setChecklists(prev => prev.map(i => i.id === payload.new.id ? payload.new : i));
          if (payload.eventType === 'DELETE') setChecklists(prev => prev.filter(i => i.id !== payload.old.id));
        }).subscribe();
      channels.push(checklistsChannel);

      const jobsChannel = supabase.channel('public:jobs').on('postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' }, payload => {
          if (payload.eventType === 'INSERT') {
            setJobs(prev => prev.some(i => i.id === payload.new.id) ? prev : [...prev, payload.new]);
          }
          if (payload.eventType === 'UPDATE') setJobs(prev => prev.map(i => i.id === payload.new.id ? payload.new : i));
          if (payload.eventType === 'DELETE') setJobs(prev => prev.filter(i => i.id !== payload.old.id));
        }).subscribe();
      channels.push(jobsChannel);
    }

    loadAndSync();

    return () => {
      cancelled = true;
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, []);

  function handleLogin(s) {
    setSession(s);
    localStorage.setItem("zyloclean_session", JSON.stringify(s));
  }
  function handleLogout() {
    setSession(null);
    localStorage.removeItem("zyloclean_session");
    setPage("dashboard");
  }

  if (portalClientId) {
    const portalClient = clients.find(c => c.id === portalClientId);
    if (!portalClient) {
      return (
        <div style={{ padding: 40, textAlign: "center" }}>
          <h2>Enlace de portal inválido</h2>
          <p>No se encontró el cliente solicitado.</p>
        </div>
      );
    }
    return (
      <>
        <ClientPortalView client={portalClient} jobs={jobs} checklists={checklists} staff={staff} setJobs={setJobs} />
        <ToastContainer />
      </>
    );
  }

  if (!session) return <><LoginScreen onLogin={handleLogin} staff={staff} /><ToastContainer /></>;

  if (session.role === "personal")
    return <><EmployeeView session={session} onLogout={handleLogout} clients={clients} jobs={jobs} setJobs={setJobs} checklists={checklists} /><ToastContainer /></>;

  return (
    <>
      <AdminShell session={session} onLogout={handleLogout} page={page} setPage={setPage}>
        {page === "dashboard" && <Dashboard clients={clients} staff={staff} jobs={jobs} />}
        {page === "clientes" && <ClientsPage clients={clients} setClients={setClients} checklists={checklists} jobs={jobs} staff={staff} />}
        {page === "personal" && <StaffPage staff={staff} setStaff={setStaff} jobs={jobs} />}
        {page === "programacion" && <SchedulePage clients={clients} staff={staff} jobs={jobs} setJobs={setJobs} checklists={checklists} />}
        {page === "checklists" && <ChecklistsPage checklists={checklists} setChecklists={setChecklists} />}
        {page === "reportes" && <ReportsPage staff={staff} jobs={jobs} clients={clients} />}
      </AdminShell>
      <ToastContainer />
    </>
  );
}