# Configuración de Email Templates — GenniAsistent

## 1. Dónde pegar la plantilla en Supabase

**Ruta exacta:**
```
Supabase Dashboard
  → Authentication
  → Email Templates
  → Confirm signup
```

**Pasos:**
1. Abre tu proyecto en [supabase.com/dashboard](https://supabase.com/dashboard)
2. En el menú lateral: **Authentication → Email Templates**
3. Selecciona la pestaña **"Confirm signup"**
4. Reemplaza el contenido del campo **"Body"** con el HTML de `confirm-signup.html`
5. En el campo **"Subject"** usa el asunto recomendado (ver sección 2)
6. Haz clic en **"Save"**

---

## 2. Asunto recomendado

```
Confirma tu cuenta en GenniAsistent
```

Alternativas si el anterior no pasa filtros de spam:
```
Activa tu acceso a GenniAsistent ✅
Tu organización en GenniAsistent está lista — confirma tu correo
GenniAsistent: un paso para activar tu cuenta
```

> **Evitar:** asuntos con "VERIFY", "CONFIRM", todo en mayúsculas, o con emojis al principio.
> El asunto actual de Supabase por defecto es `Confirm Your Signup` — reemplazarlo es obligatorio.

---

## 3. Variables de Supabase usadas en la plantilla

| Variable | Qué hace |
|---|---|
| `{{ .ConfirmationURL }}` | URL completa del enlace de confirmación con token |
| `{{ .SiteURL }}` | URL base del sitio (configurada en Auth Settings) |
| `{{ .Email }}` | Correo del usuario registrado |

> **Importante:** Verifica que `Site URL` esté correctamente configurado en:
> `Authentication → URL Configuration → Site URL`
> Debe ser: `https://tudominio.com` (sin slash final)

---

## 4. Configurar el `SiteURL` en Supabase

Para que `{{ .SiteURL }}` funcione correctamente:

1. Ve a `Authentication → URL Configuration`
2. En **Site URL** pon: `https://tudominio.com`
3. En **Redirect URLs** agrega: `https://tudominio.com/auth/callback`
4. Guarda los cambios

---

## 5. Dejar de enviar desde Supabase — SMTP propio

Por defecto Supabase envía los correos desde `noreply@mail.supabase.io`.
Para que salgan desde tu propia marca:

### Opción A — SMTP personalizado (recomendado para producción)

**Ruta en Supabase:**
```
Project Settings → Authentication → SMTP Settings
```

**Campos a configurar:**

| Campo | Valor |
|---|---|
| **Enable Custom SMTP** | ✅ Activado |
| **Sender name** | `GenniAsistent` |
| **Sender email** | `noreply@genniasistent.com` |
| **Host** | `smtp.resend.com` (o tu proveedor) |
| **Port** | `465` (SSL) o `587` (TLS) |
| **Username** | El que provea tu proveedor |
| **Password** | Tu API key o contraseña SMTP |

### Proveedores SMTP recomendados

| Proveedor | Plan gratis | Ideal para |
|---|---|---|
| **Resend** | 3,000 emails/mes | Startups SaaS (muy fácil con Next.js) |
| **Postmark** | 100/mes gratis | Transaccional confiable |
| **Brevo (ex-Sendinblue)** | 300/día gratis | Volumen alto |
| **AWS SES** | ~$0.10 por 1000 | Escala grande |
| **Google Workspace** | De pago | Si ya usas Google |

### Configuración con Resend (más rápida)

1. Crea cuenta en [resend.com](https://resend.com)
2. Verifica tu dominio en Resend (agrega los DNS records que te dan)
3. Genera un API key
4. En Supabase SMTP:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: `tu_api_key_de_resend`
   - Sender: `noreply@genniasistent.com`

> **Nota:** La verificación de dominio puede tomar entre 5 minutos y 48 horas según el TTL de DNS.

---

## 6. Rate limits de Supabase Auth (importante)

El plan gratuito de Supabase permite **4 emails por hora** desde su servidor SMTP.
Con SMTP propio eso desaparece — es una razón más para configurarlo.

Límites del plan free:
- 4 emails/hora en desarrollo
- Con SMTP propio: ilimitado (según tu proveedor)

---

## 7. Checklist antes de ir a producción

- [ ] Plantilla HTML pegada en `Authentication → Email Templates → Confirm signup`
- [ ] Asunto actualizado
- [ ] `Site URL` configurado correctamente
- [ ] `Redirect URL` incluye `https://tudominio.com/auth/callback`
- [ ] SMTP personalizado configurado y verificado
- [ ] Dominio de envío verificado en tu proveedor SMTP
- [ ] Test de envío hecho desde Supabase (`Send Test Email`)
- [ ] Revisado en Gmail, Outlook y móvil

---

## 8. Preview local del HTML

Para ver el email antes de pegarlo en Supabase, abre el archivo directamente en el navegador:

```bash
open email-templates/confirm-signup.html
```

O usa una herramienta como [htmlemail.io/test](https://htmlemail.io/test) para ver el preview
en múltiples clientes de correo.

Las variables `{{ .ConfirmationURL }}`, `{{ .Email }}`, etc. aparecerán como texto literal
en el preview local — eso es normal. Supabase las reemplaza en tiempo de envío.
