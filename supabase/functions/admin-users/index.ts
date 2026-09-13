// Supabase Edge Function: admin-users
// Gestión de usuarios de Auth para el personal. Solo la puede llamar un admin.
//
// Acciones (POST JSON):
//   { action: "create", staff_id, email, password }  → crea usuario y lo vincula
//   { action: "reset",  staff_id, password }          → cambia la contraseña
//   { action: "unlink", staff_id }                    → desvincula y borra el usuario
//   { action: "delete_rgpd", staff_id }               → anonimiza (RPC) + borra usuario
//
// Requiere SUPABASE_SERVICE_ROLE_KEY (la inyecta Supabase automáticamente).
import { corsHeaders, json, requireStaff } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const ctx = await requireStaff(req);
  if (!ctx || ctx.staff.rol !== "admin") return json({ error: "Solo administración" }, 403);
  const { admin } = ctx;

  let body: { action?: string; staff_id?: string; email?: string; password?: string };
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const { action, staff_id, email, password } = body;
  if (!action || !staff_id) return json({ error: "Faltan action / staff_id" }, 400);

  const { data: target } = await admin.from("staff").select("id, nombre, auth_user_id, email").eq("id", staff_id).maybeSingle();
  if (!target) return json({ error: "Personal no encontrado" }, 404);

  try {
    switch (action) {
      case "create": {
        if (!email || !password) return json({ error: "Faltan email / password" }, 400);
        if (password.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
        if (target.auth_user_id) return json({ error: "Ese miembro ya tiene usuario" }, 409);
        const { data, error } = await admin.auth.admin.createUser({
          email, password, email_confirm: true,
          user_metadata: { staff_id, nombre: target.nombre },
        });
        if (error) throw error;
        const { error: e2 } = await admin.from("staff").update({ auth_user_id: data.user.id, email }).eq("id", staff_id);
        if (e2) throw e2;
        return json({ success: true, user_id: data.user.id });
      }
      case "reset": {
        if (!password || password.length < 8) return json({ error: "Contraseña inválida (mín. 8)" }, 400);
        if (!target.auth_user_id) return json({ error: "Ese miembro no tiene usuario" }, 409);
        const { error } = await admin.auth.admin.updateUserById(target.auth_user_id, { password });
        if (error) throw error;
        return json({ success: true });
      }
      case "unlink": {
        if (target.auth_user_id) {
          const { error } = await admin.auth.admin.deleteUser(target.auth_user_id);
          if (error && !/not found/i.test(error.message)) throw error;
        }
        await admin.from("staff").update({ auth_user_id: null }).eq("id", staff_id);
        return json({ success: true });
      }
      case "delete_rgpd": {
        if (target.auth_user_id) {
          const { error } = await admin.auth.admin.deleteUser(target.auth_user_id);
          if (error && !/not found/i.test(error.message)) throw error;
        }
        const { error } = await admin.rpc("rgpd_anonimizar_staff", { p_id: staff_id });
        if (error) throw error;
        return json({ success: true });
      }
      default:
        return json({ error: `Acción desconocida: ${action}` }, 400);
    }
  } catch (err) {
    console.error("admin-users error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
