import { useState } from "react";
import {
  LayoutDashboard, Building2, Users, CalendarDays, ClipboardCheck, BarChart3, TrendingUp,
  LogOut, ChevronRight, Menu,
} from "lucide-react";
import { Mark, Wordmark } from "../components/Brand.jsx";
import { Avatar, C, LangSwitch, ThemeSwitch } from "../components/ui.jsx";
import { useT } from "../i18n/index.jsx";

export const NAV_ITEMS = [
  { id: "dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { id: "clientes", key: "nav.clientes", icon: Building2 },
  { id: "personal", key: "nav.personal", icon: Users },
  { id: "programacion", key: "nav.programacion", icon: CalendarDays },
  { id: "checklists", key: "nav.checklists", icon: ClipboardCheck },
  { id: "reportes", key: "nav.reportes", icon: BarChart3 },
  { id: "rentabilidad", key: "nav.rentabilidad", icon: TrendingUp },
];

export default function AdminShell({ profile, onLogout, onLangChange, children, page, setPage, badges = {} }) {
  const { t } = useT();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100dvh", background: C.bg }}>
      {mobileOpen && <div className="admin-mobile-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`admin-sidebar ${mobileOpen ? "admin-sidebar--open" : ""}`} style={{ width: collapsed ? 68 : 232 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px", marginBottom: 26, overflow: "hidden" }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Mark size={24} className="on-brand" />
          </div>
          {!collapsed && (
            <div className="animate-fadeIn">
              <Wordmark height={20} className="on-brand" />
              <p style={{ fontSize: 10, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".1em" }}>{t("nav.admin")}</p>
            </div>
          )}
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }} aria-label={t("nav.admin")}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon; const active = page === item.id; const badge = badges[item.id];
            return (
              <button key={item.id} onClick={() => { setPage(item.id); setMobileOpen(false); }} className={`nav-item ${active ? "active" : ""}`}
                title={collapsed ? t(item.key) : undefined} aria-current={active ? "page" : undefined} style={{ justifyContent: collapsed ? "center" : "flex-start", minHeight: 42 }}>
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!collapsed && <span>{t(item.key)}</span>}
                {!collapsed && badge > 0 && <span style={{ marginLeft: "auto", background: "var(--amber)", color: "#0A1F1A", borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "1px 7px" }}>{badge}</span>}
                {!collapsed && active && !badge && <ChevronRight size={13} style={{ marginLeft: "auto", opacity: .7 }} />}
              </button>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="animate-fadeIn" style={{ background: "rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px", marginTop: 12, color: "rgba(255,255,255,.75)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Avatar name={profile.nombre} size={32} bg="var(--primary)" color="#fff" />
              <div style={{ overflow: "hidden" }}>
                <p style={{ color: "#fff", fontWeight: 600, fontSize: 12, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.nombre}</p>
                <p style={{ color: "rgba(255,255,255,.45)", fontSize: 10 }}>{t("nav.admin")}</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
              <LangSwitch compact onChangeExtra={onLangChange} />
              <ThemeSwitch />
            </div>
            <button onClick={onLogout} style={{ display: "flex", width: "100%", alignItems: "center", gap: 6, background: "rgba(255,255,255,.08)", border: "none", borderRadius: 10, padding: "8px 10px", color: "rgba(255,255,255,.7)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter',sans-serif", minHeight: 36 }}>
              <LogOut size={13} /> {t("common.logout")}
            </button>
          </div>
        )}

        <button onClick={() => setCollapsed(!collapsed)} className="sidebar-collapse-btn" aria-label={collapsed ? t("common.expand") : t("common.collapse")}>
          <ChevronRight size={12} color="var(--muted)" style={{ transform: collapsed ? "" : "rotate(180deg)", transition: "transform .2s" }} />
        </button>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header className="admin-mobile-header">
          <button onClick={() => setMobileOpen((p) => !p)} className="icon-btn" aria-label={t("common.menu")} style={{ background: C.pale, color: C.primary }}><Menu size={18} /></button>
          <Wordmark height={28} />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <ThemeSwitch />
            <button onClick={onLogout} className="icon-btn" aria-label={t("common.logout")} style={{ background: C.dangerPale, color: C.danger }}><LogOut size={16} /></button>
          </div>
        </header>
        <main className="admin-main" style={{ flex: 1, overflowY: "auto" }} id="main">{children}</main>
      </div>
    </div>
  );
}
