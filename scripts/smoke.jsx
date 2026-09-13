// Smoke test: renderiza cada página en SSR con datos de prueba. Si alguna
// tira en el primer render, falla acá y no en producción.
//   npx vite build --ssr scripts/smoke.jsx --outDir .smoke && node .smoke/smoke.js
import { renderToString } from "react-dom/server";
import { I18nProvider } from "../src/i18n/index.jsx";
import { ThemeProvider } from "../src/lib/theme.jsx";
import Dashboard from "../src/pages/Dashboard.jsx";
import ClientsPage from "../src/pages/Clients.jsx";
import StaffPage from "../src/pages/Staff.jsx";
import SchedulePage from "../src/pages/Schedule.jsx";
import ChecklistsPage from "../src/pages/Checklists.jsx";
import ReportsPage from "../src/pages/Reports.jsx";
import ProfitabilityPage from "../src/pages/Profitability.jsx";
import EmployeeView from "../src/pages/Employee.jsx";
import LoginScreen from "../src/pages/Login.jsx";
import AdminShell from "../src/pages/AdminShell.jsx";
import { todayISO } from "../src/lib/dates";

const hoy = todayISO();
const clients = [{ id: "c1", nombre: "Fly Over Iceland", tipo: "empresa", rubro: "Entretenimiento", servicio: "Limpieza comercial / oficinas", estado: "activo", formal: true, email: "a@b.is",
  ubicaciones: [{ id: "u1", direccion: "Fiskislóð 43", mapsLink: "", contacto: "Anna 555", acceso: "Código 1234", notas: "Vitrina frágil" }], fotosReferencia: [{ path: "x.jpg", tipo: "llave" }], checklistId: "t1", kennitala: "111111-1111", m2: "300" }];
const staff = [
  { id: "e1", nombre: "Ana Torres", rol: "admin", tipo: "Fijo", pago: "Sueldo fijo", idiomas: ["Español"], activo: true, idioma: "es", auth_user_id: "u", email: "ana@x.com", destacado: true },
  { id: "e2", nombre: "Tony Ruiz", rol: "operativo", tipo: "Temporada", pago: "Por hora", idiomas: ["Inglés"], activo: true, idioma: "en", auth_user_id: null, email: null },
];
const checklists = [{ id: "t1", nombre: "Oficinas", tareas: ["Pisos", "Baños", "Basura"] }];
const servicios = [{ id: "s1", cliente_id: "c1", ubicacion_id: "u1", tipo_servicio: "Limpieza comercial / oficinas", frecuencia: { tipo: "semanal", dias: ["Lun", "Mié"], desde: "2026-09-01" }, hora: "08:00", monto_acordado: 250000, tipo_monto: "mensual", moneda: "ISK", duracion_estimada_min: 120, personas_previstas: 2, checklist_id: "t1", activo: true, created_at: "2026-09-01T00:00:00Z" }];
const jobs = [
  { id: "j1", clienteId: "c1", servicio_id: "s1", ubicacionId: "u1", empleados: ["e2"], fecha: hoy, hora: "08:00", estado: "en_curso", checklistId: "t1", tareasCompletadas: { 0: true }, tareas_no_hechas: {}, fotos: ["p.jpg"], duracion_estimada_min: 120, monto: null, inicio_real: new Date().toISOString(), created_at: new Date().toISOString(), incidente: { texto: "Vidrio roto", fotos: [], resuelto: false } },
  { id: "j2", clienteId: "c1", servicio_id: "s1", ubicacionId: "u1", empleados: ["e2", "e1"], fecha: hoy, hora: "14:00", estado: "finalizado", checklistId: "t1", tareasCompletadas: { 0: true, 1: true, 2: true }, tareas_no_hechas: {}, fotos: [], duracion_estimada_min: 120, monto: null, rating: 4, comentario: "Bien", inicio_real: "2026-09-10T08:00:00Z", fin_real: "2026-09-10T10:30:00Z", created_at: "2026-09-10T07:00:00Z" },
  { id: "j3", clienteId: "c1", servicio_id: null, ubicacionId: "u1", empleados: ["e2"], fecha: "2026-09-08", hora: "09:00", estado: "no_realizado", motivo_no_realizado: "Cerrado", checklistId: "t1", tareasCompletadas: {}, tareas_no_hechas: { 1: "sin agua" }, fotos: [], created_at: "2026-09-08T07:00:00Z" },
];
const registros = [
  { id: "r1", job_id: "j1", personal_id: "e2", inicio: new Date(Date.now() - 3600000).toISOString(), fin: null },
  { id: "r2", job_id: "j2", personal_id: "e2", inicio: "2026-09-10T08:00:00Z", fin: "2026-09-10T10:30:00Z" },
  { id: "r3", job_id: "j2", personal_id: "e1", inicio: "2026-09-10T08:10:00Z", fin: "2026-09-10T10:00:00Z" },
];
const solicitudes = [{ id: "q1", cliente_id: "c1", tipo: "Ventanas", fecha: hoy, notas: "urgente", estado: "nueva" }];
const portalTokens = [{ token: "abc123abc123", cliente_id: "c1", activo: true, created_at: "2026-09-10T00:00:00Z" }];
const common = { clients, staff, checklists, servicios, jobs, registros, solicitudes, portalTokens, patch: () => {}, profile: staff[0], goTo: () => {} };

const cases = {
  Login: <LoginScreen onLogin={() => {}} />,
  Dashboard: <Dashboard {...common} />,
  Clients: <ClientsPage {...common} />,
  Staff: <StaffPage {...common} />,
  Schedule: <SchedulePage {...common} />,
  Checklists: <ChecklistsPage {...common} />,
  Reports: <ReportsPage {...common} />,
  Profitability: <ProfitabilityPage {...common} />,
  Employee_es: <EmployeeView profile={staff[1]} onLogout={() => {}} onLangChange={() => {}} clients={clients} jobs={jobs} checklists={checklists} registros={registros} patch={() => {}} />,
  Shell: <AdminShell profile={staff[0]} onLogout={() => {}} page="dashboard" setPage={() => {}} badges={{ dashboard: 2 }}><p>ok</p></AdminShell>,
};

let failed = 0;
for (const lang of ["es", "en", "is"]) {
  for (const [name, el] of Object.entries(cases)) {
    
    try {
      const html = renderToString(<ThemeProvider><I18nProvider initial={lang}>{el}</I18nProvider></ThemeProvider>);
      if (html.length < 200) throw new Error("render vacío");
      console.log(`✔ ${lang} ${name} (${html.length} chars)`);
    } catch (e) {
      failed++; console.error(`✘ ${lang} ${name}: ${e.stack?.split("\n").slice(0, 3).join(" | ")}`);
    }
  }
}
process.exit(failed ? 1 : 0);
