"use server";

import { emailConfigService } from "@/services/emailConfigService";
import { revalidatePath } from "next/cache";

/* --- Configuración del Sistema --- */

export async function saveEmailConfigAction(formData: FormData) {
  try {
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
      mostrar_footer: formData.get("mostrar_footer") === "true",
      activo: formData.get("activo") !== "false",
    };

    await emailConfigService.saveSystemConfig(config);
    revalidatePath("/admin/configuracion-correo");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* --- Plantillas --- */

export async function saveEmailTemplateAction(formData: FormData) {
  try {
    const template = {
      id: formData.get("id") as string || undefined,
      nombre_plantilla: formData.get("nombre_plantilla") as string,
      tipo_plantilla: formData.get("tipo_plantilla") as string,
      asunto: formData.get("asunto") as string,
      mensaje_html: formData.get("mensaje_html") as string,
      usar_firma_sistema: formData.get("usar_firma_sistema") === "true",
      usar_logo_sistema: formData.get("usar_logo_sistema") === "true",
      activo: formData.get("activo") !== "false",
    };

    await emailConfigService.saveEmailTemplate(template);
    revalidatePath("/admin/plantillas-correo");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteEmailTemplateAction(id: string) {
  try {
    await emailConfigService.deleteEmailTemplate(id);
    revalidatePath("/admin/plantillas-correo");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
