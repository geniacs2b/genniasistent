"use server";

import { emailVerificationService } from "@/services/emailVerificationService";

export async function correctEmailAndResend(numeroDocumento: string, tipoDocumento: string, nuevoCorreo: string) {
  try {
    const result = await emailVerificationService.correctEmail(numeroDocumento, tipoDocumento, nuevoCorreo);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
