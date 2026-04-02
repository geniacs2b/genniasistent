"use server";

import { emailConfigService } from "@/services/emailConfigService";
import { createClient } from "@/lib/supabaseServer";
import { getBaseUrl } from "@/lib/authHelper";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { google } from "googleapis";
import { buildCertificateEmail, type EmailSistemaConfig, type TenantBranding } from "@/lib/emailTemplates";

/* --- Configuración del Sistema --- */

export async function saveEmailConfigAction(formData: FormData) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) return { success: false, error: "No se pudo identificar el tenant." };

    const config = {
      id: formData.get("id") as string || undefined,
      nombre_remitente: formData.get("nombre_remitente") as string,
      email_respuesta: formData.get("email_respuesta") as string,
      logo_url: formData.get("logo_url") as string,
      firma_html: formData.get("firma_html") as string,
      footer_html: formData.get("footer_html") as string,
      telefono_contacto: formData.get("telefono_contacto") as string,
      email_contacto: formData.get("email_contacto") as string,
      direccion_contacto: formData.get("direccion_contacto") as string,
      sitio_web: formData.get("sitio_web") as string,
      facebook_url: formData.get("facebook_url") as string,
      instagram_url: formData.get("instagram_url") as string,
      linkedin_url: formData.get("linkedin_url") as string,
      x_url: formData.get("x_url") as string,
      tiktok_url: formData.get("tiktok_url") as string,
      mostrar_footer: formData.get("mostrar_footer") === "true",
      activo: formData.get("activo") !== "false",
      tenant_id: tenantId,  // ← EXPLÍCITO
    };

    await emailConfigService.saveSystemConfig(config);
    revalidatePath("/app/configuracion-correo");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* --- Plantillas --- */

export async function saveEmailTemplateAction(formData: FormData) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) return { success: false, error: "No se pudo identificar el tenant." };

    const template = {
      id: formData.get("id") as string || undefined,
      nombre_plantilla: formData.get("nombre_plantilla") as string,
      tipo_plantilla: formData.get("tipo_plantilla") as string,
      asunto: formData.get("asunto") as string,
      mensaje_html: formData.get("mensaje_html") as string,
      usar_firma_sistema: formData.get("usar_firma_sistema") === "true",
      usar_logo_sistema: formData.get("usar_logo_sistema") === "true",
      activo: formData.get("activo") !== "false",
      tenant_id: tenantId,  // ← EXPLÍCITO
    };

    const savedTemplate = await emailConfigService.saveEmailTemplate(template);

    // Si se proporcionó un evento_id, asociar la plantilla al evento
    const eventoId = formData.get("evento_id") as string;
    if (eventoId && savedTemplate?.id) {
       await supabase
         .from("eventos")
         .update({ plantilla_correo_id: savedTemplate.id })
         .eq("id", eventoId);
    }

    revalidatePath("/app/correos");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteEmailTemplateAction(id: string) {
  try {
    await emailConfigService.deleteEmailTemplate(id);
    revalidatePath("/app/plantillas-correo");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* --- Correo de Prueba --- */

export async function sendTestEmailAction(toEmail: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) return { success: false, error: "No se pudo identificar el tenant." };

    const serviceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get() { return undefined; } } },
    );

    // Obtener credenciales OAuth y config en paralelo
    const [oauthRes, configRes, tenantRes] = await Promise.all([
      serviceSupabase
        .from("email_configurations")
        .select("refresh_token, sender_email, is_active")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .single(),
      serviceSupabase
        .from("configuracion_correo_sistema")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("activo", true)
        .limit(1)
        .single(),
      serviceSupabase
        .from("tenants")
        .select("name, logo_url")
        .eq("id", tenantId)
        .single(),
    ]);

    if (!oauthRes.data?.refresh_token) {
      return { success: false, error: "No hay cuenta de Google conectada o está inactiva." };
    }

    const oauthConfig = oauthRes.data;
    const sysConf     = configRes.data as EmailSistemaConfig | null;
    const tenant      = tenantRes.data;

    const branding: TenantBranding = {
      name:     tenant?.name ?? "Tu Organización",
      logo_url: tenant?.logo_url,
    };

    // Construir email de prueba con datos de ejemplo
    const htmlBody = buildCertificateEmail(
      {
        nombre_completo:    "Participante de Prueba",
        nombre_evento:      "Conferencia de Innovación 2026",
        fecha_evento:       "15 de septiembre de 2026",
        pdf_url:            "#",
        codigo_certificado: "TEST-0000-0000",
        verificacion_url:   `${process.env.PUBLIC_BASE_URL ?? ""}/verificar?cert=TEST-0000-0000`,
      },
      sysConf ?? {},
      branding,
    );

    // Construir MIME
    const boundary = `----=_Part_${Date.now()}_test`;
    const htmlB64  = Buffer.from(htmlBody, "utf-8").toString("base64");
    const subject  = `[PRUEBA] Correo de certificado — ${branding.name}`;
    const subjectB64 = `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
    const senderName = sysConf?.nombre_remitente ?? branding.name;

    const mimeLines = [
      `MIME-Version: 1.0`,
      `From: "${senderName}" <${oauthConfig.sender_email}>`,
      `To: ${toEmail}`,
      `Subject: ${subjectB64}`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      ...(htmlB64.match(/.{1,76}/g) ?? []),
      ``,
      `--${boundary}--`,
    ];

    const rawMime = mimeLines.join("\r\n");
    const rawBase64url = Buffer.from(rawMime)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${getBaseUrl()}/api/oauth/google/callback`,
    );
    oauth2Client.setCredentials({ refresh_token: oauthConfig.refresh_token });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: rawBase64url },
    });

    return { success: true, message: `Correo de prueba enviado a ${toEmail}` };
  } catch (error: any) {
    console.error("[sendTestEmailAction] Error:", error);
    return { success: false, error: error?.message ?? "Error desconocido al enviar." };
  }
}
