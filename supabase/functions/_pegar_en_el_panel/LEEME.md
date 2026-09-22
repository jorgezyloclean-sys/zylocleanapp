# Desplegar las funciones sin la CLI

Las dos funciones de esta carpeta son **copias de un solo archivo** de
`supabase/functions/send-email/` y `admin-users/`, con el código compartido
(`_shared/auth.ts`) ya incorporado. Sirven para pegarlas en el panel de Supabase
cuando no está instalada la CLI. **Si se usa la CLI, desplegar las originales**, no estas.

## Pasos (panel de Supabase)

1. **Edge Functions** → `send-email` → *Edit* (o *Create a new function* si no existe).
2. Borrar todo y pegar el contenido de `send-email.ts`. **Deploy**.
3. Repetir con `admin-users.ts` (*Create a new function*, nombre exacto `admin-users`).
4. **Project Settings → Edge Functions → Secrets**, que estén cargados:
   - `GMAIL_USER` = la cuenta de Gmail de la empresa
   - `GMAIL_APP_PASS` = la contraseña de aplicación (16 caracteres, sin espacios)

## Por qué reemplazar `send-email` aunque ya funcione

La versión del prototipo **no verifica quién llama**. La anon key viaja en el
JavaScript de la web, así que cualquiera que abra la página puede sacarla y mandar
correos desde el Gmail de la empresa. La versión de acá exige que quien llame sea
personal activo y que el destinatario ya exista en `clients` o `staff`.

## Cómo comprobar que quedó bien

Con la anon key sola, tiene que responder **401 No autorizado** (antes respondía
`success: true`):

```bash
curl -s -X POST "https://<REF>.supabase.co/functions/v1/send-email" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"to":"prueba@ejemplo.com","subject":"x","html":"<p>x</p>"}'
```

Desde la app, en cambio, sigue andando: el navegador manda el token de la sesión.
