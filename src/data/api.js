// Escrituras. Cada función lanza si Supabase devuelve error: nunca "guardado"
// en pantalla con la base sin cambios. Usar con `run()` de lib/toast.
import { supabase } from "../lib/supabase";
import { newId } from "../lib/ids";
import { MOCK, mockApi } from "../dev/mock";

function must({ data, error }) { if (error) throw error; return data; }

/* -------------------------------------------------------------- clientes */
export async function upsertClient(row) {
  const data = { ...row, id: row.id || newId("c") };
  if (MOCK) return mockApi.upsert("clients", data);
  must(await supabase.from("clients").upsert(data));
  return data;
}
export async function deleteClient(id) { if (MOCK) return mockApi.remove("clients", id); must(await supabase.from("clients").delete().eq("id", id)); }

/* -------------------------------------------------------------- personal */
export async function upsertStaff(row) {
  const data = { ...row, id: row.id || newId("e") };
  delete data.password; delete data.usuario; // nunca más
  if (MOCK) return mockApi.upsert("staff", data);
  must(await supabase.from("staff").upsert(data));
  return data;
}
export async function deleteStaff(id) { if (MOCK) return mockApi.remove("staff", id); must(await supabase.from("staff").delete().eq("id", id)); }

/* ------------------------------------------------------------- servicios */
export async function upsertServicio(row) {
  const data = { ...row, id: row.id || newId("s") };
  if (MOCK) return mockApi.upsert("servicios_contratados", data);
  must(await supabase.from("servicios_contratados").upsert(data));
  return data;
}
export async function deleteServicio(id) { if (MOCK) return mockApi.remove("servicios_contratados", id); must(await supabase.from("servicios_contratados").delete().eq("id", id)); }

/* -------------------------------------------------------------- trabajos */
export async function insertJob(row) {
  const data = { id: newId("j"), estado: "programado", tareasCompletadas: {}, tareas_no_hechas: {}, fotos: [], ...row };
  if (MOCK) return mockApi.upsert("jobs", data);
  must(await supabase.from("jobs").insert(data));
  return data;
}
export async function insertJobs(rows) {
  if (!rows.length) return [];
  const data = rows.map((r) => ({ id: newId("j"), estado: "programado", tareasCompletadas: {}, tareas_no_hechas: {}, fotos: [], ...r }));
  if (MOCK) return data.map((d) => mockApi.upsert("jobs", d));
  must(await supabase.from("jobs").insert(data));
  return data;
}
export async function updateJob(id, patch) {
  if (MOCK) return mockApi.update("jobs", id, patch);
  return must(await supabase.from("jobs").update(patch).eq("id", id).select().maybeSingle());
}
export async function deleteJob(id) { if (MOCK) return mockApi.remove("jobs", id); must(await supabase.from("jobs").delete().eq("id", id)); }

/* ------------------------------------------------------------ checklists */
export async function insertChecklist(row) {
  const data = { id: newId("t"), tareas: [], traducciones: {}, ...row };
  if (MOCK) return mockApi.upsert("checklists", data);
  must(await supabase.from("checklists").insert(data));
  return data;
}
export async function updateChecklist(id, patch) { if (MOCK) return mockApi.update("checklists", id, patch); must(await supabase.from("checklists").update(patch).eq("id", id)); }
export async function deleteChecklist(id) { if (MOCK) return mockApi.remove("checklists", id); must(await supabase.from("checklists").delete().eq("id", id)); }

/* ------------------------------------------------- recursos (vehículos y maquinaria) */
export async function insertRecurso(row) {
  const data = { id: newId("rc"), activo: true, ...row };
  if (MOCK) return mockApi.upsert("recursos", data);
  return must(await supabase.from("recursos").insert(data).select().single());
}
export async function updateRecurso(id, patch) { if (MOCK) return mockApi.update("recursos", id, patch); must(await supabase.from("recursos").update(patch).eq("id", id)); return true; }
export async function deleteRecurso(id) { if (MOCK) return mockApi.remove("recursos", id); must(await supabase.from("recursos").delete().eq("id", id)); return true; }

/* --------------------------------------------------------- mensajes (chat por trabajo) */
export async function insertMensaje({ job_id, autor_id, texto, adjunto = null }) {
  const data = { id: newId("m"), job_id, autor_id, texto: (texto || "").trim(), adjunto, leido_por: [autor_id], created_at: new Date().toISOString() };
  if (MOCK) return mockApi.upsert("mensajes", data);
  return must(await supabase.from("mensajes").insert(data).select().single());
}
export async function marcarLeidos(mensajes, staffId) {
  const pend = mensajes.filter((m) => !(m.leido_por || []).includes(staffId));
  await Promise.all(pend.map((m) => {
    const leido_por = [...(m.leido_por || []), staffId];
    if (MOCK) return mockApi.update("mensajes", m.id, { leido_por });
    return supabase.from("mensajes").update({ leido_por }).eq("id", m.id);
  }));
  return pend.map((m) => ({ ...m, leido_por: [...(m.leido_por || []), staffId] }));
}
export async function deleteMensaje(id) { if (MOCK) return mockApi.remove("mensajes", id); must(await supabase.from("mensajes").delete().eq("id", id)); }

/* --------------------------------------------------------- registro horas */
export async function startRegistro(jobId, staffId) {
  if (MOCK) { const ex = mockApi.find("registro_horas", (r) => r.job_id === jobId && r.personal_id === staffId); return mockApi.upsert("registro_horas", { id: ex?.id || newId("r"), job_id: jobId, personal_id: staffId, inicio: new Date().toISOString(), fin: null }); }
  return must(await supabase.from("registro_horas")
    .upsert({ job_id: jobId, personal_id: staffId, inicio: new Date().toISOString(), fin: null }, { onConflict: "job_id,personal_id" })
    .select().maybeSingle());
}
export async function stopRegistro(jobId, staffId) {
  if (MOCK) { const ex = mockApi.find("registro_horas", (r) => r.job_id === jobId && r.personal_id === staffId && !r.fin); return ex ? mockApi.update("registro_horas", ex.id, { fin: new Date().toISOString() }) : null; }
  return must(await supabase.from("registro_horas")
    .update({ fin: new Date().toISOString() }).eq("job_id", jobId).eq("personal_id", staffId).is("fin", null)
    .select().maybeSingle());
}

/* ----------------------------------------------------------------- portal */
export async function createPortalToken(clienteId) {
  if (MOCK) return mockApi.upsert("portal_tokens", { token: newId("tk"), cliente_id: clienteId, activo: true });
  return must(await supabase.from("portal_tokens").insert({ cliente_id: clienteId }).select().single());
}
export async function revokePortalToken(token) {
  if (MOCK) return mockApi.update("portal_tokens", token, { activo: false });
  must(await supabase.from("portal_tokens").update({ activo: false }).eq("token", token));
}
export async function portalGet(token) { if (MOCK) return mockApi.portalGet(token); return must(await supabase.rpc("portal_get", { p_token: token })); }
export async function portalRate(token, jobId, rating, comentario) {
  if (MOCK) { mockApi.update("jobs", jobId, { rating, comentario }); return true; }
  return must(await supabase.rpc("portal_rate", { p_token: token, p_job_id: jobId, p_rating: rating, p_comentario: comentario }));
}
export async function portalRequest(token, tipo, fecha, notas) {
  if (MOCK) { const t = mockApi.find("portal_tokens", (x) => x.token === token); mockApi.upsert("solicitudes", { id: newId("q"), cliente_id: t.cliente_id, tipo, fecha: fecha || null, notas, estado: "nueva" }); return true; }
  return must(await supabase.rpc("portal_request", { p_token: token, p_tipo: tipo, p_fecha: fecha || null, p_notas: notas }));
}
export async function updateSolicitud(id, patch) { if (MOCK) return mockApi.update("solicitudes", id, patch); must(await supabase.from("solicitudes").update(patch).eq("id", id)); }

/* ------------------------------------------------------------------- RGPD */
export async function anonimizarCliente(id) { if (MOCK) return mockApi.update("clients", id, { nombre: "Cliente eliminado", email: null, telefono: null, kennitala: null, estado: "inactivo" }); must(await supabase.rpc("rgpd_anonimizar_cliente", { p_id: id })); }

export async function adminUsers(action, payload) {
  if (MOCK) {
    if (action === "create") { mockApi.update("staff", payload.staff_id, { auth_user_id: newId("auth"), email: payload.email }); return { success: true, user_id: "mock" }; }
    if (action === "unlink") { mockApi.update("staff", payload.staff_id, { auth_user_id: null }); return { success: true }; }
    if (action === "delete_rgpd") { mockApi.update("staff", payload.staff_id, { nombre: "Empleado eliminado", email: null, telefono: null, kennitala: null, auth_user_id: null, activo: false, estado: "inactivo" }); return { success: true }; }
    return { success: true };
  }
  const { data, error } = await supabase.functions.invoke("admin-users", { body: { action, ...payload } });
  if (error) {
    // supabase-js envuelve la respuesta; intentamos leer el mensaje real.
    let msg = error.message;
    try { const body = await error.context?.json?.(); if (body?.error) msg = body.error; } catch { /* nada */ }
    if (/Failed to send a request/i.test(msg)) msg = "La función admin-users no está desplegada en este proyecto de Supabase (ver README: supabase functions deploy admin-users).";
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Todo lo que el sistema guarda de una persona del personal (RGPD: acceso/portabilidad). */
export function exportStaffData({ staff, jobs, registros, clients }) {
  const mine = jobs.filter((j) => (j.empleados || []).includes(staff.id));
  return {
    exportado: new Date().toISOString(),
    persona: { ...staff, auth_user_id: undefined },
    trabajos: mine.map((j) => ({
      id: j.id, fecha: j.fecha, hora: j.hora, estado: j.estado,
      cliente: clients.find((c) => c.id === j.clienteId)?.nombre || j.clienteId,
      tareasCompletadas: j.tareasCompletadas, tareas_no_hechas: j.tareas_no_hechas,
      incidente: j.incidente, fotos: j.fotos,
    })),
    registro_horas: registros.filter((r) => r.personal_id === staff.id),
  };
}

/* ------------------------------------------------------------------ email */
export async function sendNotificationEmail({ to, subject, html, type = "general" }) {
  if (!to) return false;
  if (MOCK) {
    // En demo no se manda nada: se guarda para poder mirar el correo tal como se vería.
    console.info(`[demo] email ${type} → ${to}: ${subject}`);
    if (typeof window !== "undefined") {
      window.__demoEmails = [{ to, subject, html, type, at: new Date().toISOString() }, ...(window.__demoEmails || [])].slice(0, 20);
    }
    return true;
  }
  const { data, error } = await supabase.functions.invoke("send-email", { body: { to, subject, html, type } });
  if (error) throw new Error(/Failed to send a request/i.test(error.message) ? "La función send-email no está desplegada en este proyecto de Supabase." : error.message);
  if (data?.error) throw new Error(data.error);
  return true;
}
