import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { I18nProvider, useT } from "./i18n/index.jsx";
import { ThemeProvider } from "./lib/theme.jsx";
import { ToastContainer, Banner, Spinner } from "./components/ui.jsx";
import { useAuth } from "./data/useAuth";
import { configMissing } from "./lib/supabase";
import { useAppData } from "./data/useAppData";
import LoginScreen from "./pages/Login.jsx";
import AdminShell from "./pages/AdminShell.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ClientsPage from "./pages/Clients.jsx";
import StaffPage from "./pages/Staff.jsx";
import SchedulePage from "./pages/Schedule.jsx";
import ChecklistsPage from "./pages/Checklists.jsx";
import ResourcesPage from "./pages/Resources.jsx";
import ReportsPage from "./pages/Reports.jsx";
import ProfitabilityPage from "./pages/Profitability.jsx";
import EmployeeView from "./pages/Employee.jsx";
import ClientPortal from "./pages/Portal.jsx";
import { noLeidos } from "./lib/chat";

const PAGE_KEY = "zyloclean_page";

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <Root />
        <ToastContainer />
      </I18nProvider>
    </ThemeProvider>
  );
}

function Root() {
  if (configMissing.length) return <ConfigMissing />;
  const portalToken = new URLSearchParams(window.location.search).get("portal");
  if (portalToken) return <ClientPortal token={portalToken} />;
  return <AuthedApp />;
}

function AuthedApp() {
  const { t, setLang } = useT();
  const { session, profile, profileError, login, logout, setIdioma } = useAuth();
  const data = useAppData(!!profile);
  const [page, setPage] = useState(() => { try { return localStorage.getItem(PAGE_KEY) || "dashboard"; } catch { return "dashboard"; } });

  // El idioma guardado en el perfil manda cuando entra el usuario.
  useEffect(() => { if (profile?.idioma) setLang(profile.idioma); }, [profile?.id]);
  useEffect(() => { try { localStorage.setItem(PAGE_KEY, page); } catch { /* nada */ } }, [page]);

  if (session === undefined) return <Spinner label={t("common.loading")} />;
  if (!session) return <LoginScreen onLogin={login} />;
  if (profileError === "notStaff") return <LoginScreen notStaff onLogout={logout} />;
  if (profileError) return (
    <div style={{ padding: 24, maxWidth: 480, margin: "40px auto" }}>
      <Banner tone="danger" icon={AlertTriangle}>{t("common.error")}: {profileError}<br /><button className="btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => window.location.reload()}><RefreshCw size={12} /> {t("common.retry")}</button></Banner>
    </div>
  );
  if (!profile) return <Spinner label={t("common.loading")} />;

  const onLangChange = (l) => setIdioma(l).catch(() => {});
  const common = { ...data, profile };

  if (data.loading && data.jobs.length === 0) return <Spinner label={t("common.loading")} />;

  if (profile.rol !== "admin") {
    return <EmployeeView profile={profile} onLogout={logout} onLangChange={onLangChange} clients={data.clients} jobs={data.jobs} checklists={data.checklists} registros={data.registros} mensajes={data.mensajes} staff={data.staffNombres.length ? data.staffNombres : data.staff} portalTokens={data.portalTokens} recursos={data.recursos} patch={data.patch} />;
  }

  const nuevas = data.solicitudes.filter((s) => s.estado === "nueva").length;
  const incidentes = data.jobs.filter((j) => j.incidente && !j.incidente.resuelto).length;
  const sinLeer = noLeidos(data.mensajes, profile.id).length;

  return (
    <AdminShell profile={profile} onLogout={logout} onLangChange={onLangChange} page={page} setPage={setPage} badges={{ dashboard: nuevas + incidentes, programacion: sinLeer }}>
      {data.error && <div style={{ marginBottom: 16 }}><Banner tone="danger" icon={AlertTriangle}>{t("nav.dataError", { e: data.error })} <button className="btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={data.refresh}><RefreshCw size={12} /> {t("common.retry")}</button></Banner></div>}
      {page === "dashboard" && <Dashboard {...common} goTo={setPage} />}
      {page === "clientes" && <ClientsPage {...common} />}
      {page === "personal" && <StaffPage {...common} />}
      {page === "programacion" && <SchedulePage {...common} />}
      {page === "checklists" && <ChecklistsPage {...common} />}
      {page === "recursos" && <ResourcesPage {...common} />}
      {page === "reportes" && <ReportsPage {...common} />}
      {page === "rentabilidad" && <ProfitabilityPage {...common} />}
    </AdminShell>
  );
}

function ConfigMissing() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg)" }}>
      <div style={{ maxWidth: 520 }}>
        <Banner tone="danger" icon={AlertTriangle}>
          <strong>Falta configuración de Supabase.</strong> No están definidas: <code>{configMissing.join(", ")}</code>.
          <br />En Vercel: Project → Settings → Environment Variables, agregar ambas y volver a hacer deploy.
          En local: copiá <code>.env.example</code> a <code>.env</code> y completalo.
        </Banner>
      </div>
    </div>
  );
}
