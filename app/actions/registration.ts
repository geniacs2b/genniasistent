"use server";

import { registrationService } from "@/services/registrationService";
import { emailVerificationService } from "@/services/emailVerificationService";
import { emailService } from "@/services/emailService";
import { createClient } from "@/lib/supabaseServer";

async function sendVerificationEmail(email: string, nombres: string, eventoTitulo: string, token: string) {
  return await emailService.sendVerificationEmail(email, nombres, eventoTitulo, token);
}

export async function submitRegistration(formularioId: string, eventoId: string, values: any, eventoTitulo: string) {
  try {
    console.log(`[RegistrationAction] >>> INICIO SUBMIT registraion para correo: ${values.correo}`);
    
    const result = await registrationService.registerParticipant(formularioId, eventoId, values);
    
    // El RPC devuelve un objeto { success: boolean, error?: string, ... }
    if (!result || result.success === false) {
      console.error("[RegistrationAction] RPC devolvió error:", result?.error);
      return { 
        success: false, 
        error: result?.error || "La base de datos rechazó el registro sin un mensaje específico." 
      };
    }

    console.log(`[RegistrationAction] RPC éxito:`, result);

    // Si hay un token de verificación, enviamos el correo
    if (result.token_verificacion && values.correo) {
      console.log(`[RegistrationAction] Enviando correo a: ${values.correo} con token: ${result.token_verificacion.substring(0, 10)}...`);
      try {
        const emailRes = await sendVerificationEmail(values.correo, values.nombres, eventoTitulo, result.token_verificacion);
        console.log(`[RegistrationAction] Email sending response:`, emailRes);
      } catch (emailError: any) {
         console.error("[RegistrationAction] Error al enviar correo inicial:", emailError);
         return { 
           success: true, 
           data: result, 
           emailError: "Registro guardado, pero falló el envío del correo de verificación." 
         };
      }
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error("[RegistrationAction] EXCEPCIÓN en submitRegistration:", error);
    return { success: false, error: error.message };
  }
}

export async function resendVerificationAction(personaId: string, eventoId: string) {
  try {
    const result = await emailVerificationService.resendVerificationPorPersona(personaId, eventoId);
    
    if (result && result.success && result.token_verificacion) {
      await sendVerificationEmail(result.correo, result.nombres, result.evento_titulo, result.token_verificacion);
      return { success: true, message: "¡Correo reenviado! Revisa tu bandeja de entrada." };
    }
    
    return { success: false, error: result?.error || "No se pudo reenviar la verificación." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateRegistrationAction(personaId: string, eventoId: string, formularioId: string, values: any, eventoTitulo: string) {
  try {
    const result = await registrationService.updateRegistrationPorPersona(personaId, eventoId, formularioId, values);
    
    if (!result || result.success === false) {
      return { success: false, error: result?.error || "No se pudo actualizar el registro." };
    }

    if (result.token_verificacion && values.correo) {
      try {
        await sendVerificationEmail(values.correo, values.nombres, eventoTitulo, result.token_verificacion);
      } catch (emailError: any) {
         console.error("[UpdateAction] Error al enviar correo de actualización:", emailError);
      }
    }

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function checkVerificationStatusAction(personaId: string, eventoId: string) {
  try {
    const res = await emailVerificationService.getVerificationStatus(personaId, eventoId);
    if (!res) return { success: false };
    
    return { success: true, verified: res.estado === 'inscrito' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cancelRegistrationAction(personaId: string, eventoId: string) {
  try {
    const result = await registrationService.cancelRegistrationPorPersona(personaId, eventoId);
    return { success: result.success, message: result.message, error: result.error };
  } catch (error: any) {
    console.error("[CancelAction] Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getRegistrationDataAction(eventoId: string, doc?: string, type?: string, personaId?: string) {
  try {
    const data = await registrationService.getRegistrationData(eventoId, doc, type, personaId);
    return { success: !!data, data };
  } catch (error: any) {
    console.error("[GetRegistrationDataAction] Error:", error);
    return { success: false, error: error.message };
  }
}
