import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { I18nProvider, useT } from "./i18n/index.jsx";
import { ThemeProvider } from "./lib/theme.jsx";
import { ToastContainer, Banner, Spinner } from "./components/ui.jsx";
import { useAuth } from "./data/useAuth";
import { useAppData } from "./data/useAppData";
import LoginScreen from "./pages/Login.jsx";
import AdminShell from "./pages/AdminShell.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ClientsPage from "./pages/Clients.jsx";
import StaffPage from "./pages/Staff.jsx";
import SchedulePage from "./pages/Schedule.jsx";
import ChecklistsPage from "./pages/Checklists.jsx";
import ReportsPage from "./pages/Reports.jsx";
import ProfitabilityPage from "./pages/Profitability.jsx";
import EmployeeView from "./pages/Employee.jsx";
import ClientPortal from "./pages/Portal.jsx";

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
    return <EmployeeView profile={profile} onLogout={logout} onLangChange={onLangChange} clients={data.clients} jobs={data.jobs} checklists={data.checklists} registros={data.registros} patch={data.patch} />;
  }

  const nuevas = data.solicitudes.filter((s) => s.estado === "nueva").length;
  const incidentes = data.jobs.filter((j) => j.incidente && !j.incidente.resuelto).length;

  return (
    <AdminShell profile={profile} onLogout={logout} onLangChange={onLangChange} page={page} setPage={setPage} badges={{ dashboard: nuevas + incidentes }}>
      {data.error && <div style={{ marginBottom: 16 }}><Banner tone="danger" icon={AlertTriangle}>{t("nav.dataError", { e: data.error })} <button className="btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={data.refresh}><RefreshCw size={12} /> {t("common.retry")}</button></Banner></div>}
      {page === "dashboard" && <Dashboard {...common} goTo={setPage} />}
      {page === "clientes" && <ClientsPage {...common} />}
      {page === "personal" && <StaffPage {...common} />}
      {page === "programacion" && <SchedulePage {...common} />}
      {page === "checklists" && <ChecklistsPage {...common} />}
      {page === "reportes" && <ReportsPage {...common} />}
      {page === "rentabilidad" && <ProfitabilityPage {...common} />}
    </AdminShell>
  );
}
