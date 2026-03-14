"use server";

import { registrationService } from "@/services/registrationService";

export async function submitRegistration(formularioId: string, eventoId: string, values: any, eventoTitulo: string) {
  try {
    const result = await registrationService.registerParticipant(formularioId, eventoId, values);
    
    // Si hay un token de verificación, enviamos el correo
    if (result && result.token_verificacion && values.correo) {
      // Usar la variable de entorno NEXT_PUBLIC_SITE_URL o localhost para desarrollo
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
      const verificationUrl = `${baseUrl}/verificar-correo?token=${result.token_verificacion}`;
      
      try {
        await fetch(`${baseUrl}/api/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: values.correo,
            nombres: values.nombres,
            eventoTitulo: eventoTitulo || 'Evento',
            verificationUrl,
          }),
        });
        console.log("Correo de verificación enviado a:", values.correo);
      } catch (emailError) {
         console.error("Error al llamar a la ruta de correo:", emailError);
         // Podríamos fallar silenciosamente aquí o retornar un warning. 
         // El registro fue exitoso, el fallo está en el envío del correo.
      }
    }

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
