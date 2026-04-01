export const automationService = {
  /**
   * Dispara la automatización de generación de certificados en n8n
   * Envía el evento_id al endpoint interno de la plataforma
   */
  async triggerCertificateGeneration(eventoId: string): Promise<{ ok: boolean; message: string }> {
    try {
      const response = await fetch('/api/n8n/generar-certificados', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ evento_id: eventoId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          message: data.message || 'Error al conectar con el servicio de automatización',
        };
      }

      return {
        ok: true,
        message: data.message || 'Automatización iniciada correctamente',
      };
    } catch (error: any) {
      console.error('Error in automationService:', error);
      return {
        ok: false,
        message: 'No se pudo establecer comunicación con el servidor',
      };
    }
  },

  /**
   * Dispara el envío de certificado individual (manual o reintento)
   */
  async triggerIndividualCertificate(eventoId: string, personaId: string, origen: string = 'manual'): Promise<{ ok: boolean; message: string }> {
    try {
      const response = await fetch('/api/n8n/enviar-certificado-individual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          evento_id: eventoId, 
          persona_id: personaId,
          origen 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          message: data.message || 'Error al conectar con el servicio de envío individual',
        };
      }

      return {
        ok: true,
        message: data.message || 'Envío individual iniciado correctamente',
      };
    } catch (error: any) {
      console.error('Error in automationService (individual):', error);
      return {
        ok: false,
        message: 'No se pudo establecer comunicación con el servidor',
      };
    }
  },

  /**
   * Dispara el envío de un correo institucional individual
   */
  async triggerIndividualEmail(eventoId: string, personaId: string, origen: string = 'manual'): Promise<{ ok: boolean; message: string }> {
    try {
      const response = await fetch('/api/n8n/enviar-correo-institucional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          evento_id: eventoId, 
          persona_id: personaId,
          origen 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          message: data.message || 'Error al conectar con el servicio de correo',
        };
      }

      return {
        ok: true,
        message: data.message || 'Envío de correo iniciado correctamente',
      };
    } catch (error: any) {
      console.error('Error in automationService (email):', error);
      return {
        ok: false,
        message: 'No se pudo establecer comunicación con el servidor de correo',
      };
    }
  },
};
