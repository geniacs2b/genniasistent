export const automationService = {
  /**
   * Dispara la automatización de generación de certificados en el Motor Nativo
   */
  async triggerCertificateGeneration(eventoId: string): Promise<{ ok: boolean; message: string }> {
    try {
      const response = await fetch('/api/jobs/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evento_id: eventoId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          message: data.error || data.message || 'Error en el motor nativo',
        };
      }

      return {
        ok: true,
        message: 'Generación masiva iniciada.',
      };
    } catch (error: any) {
      console.error('Error in automationService:', error);
      return {
        ok: false,
        message: 'Error de conexión con el motor interno',
      };
    }
  },

  /**
   * Dispara el envío de certificado individual (Motor Nativo)
   */
  async triggerIndividualCertificate(eventoId: string, personaId: string, origen: string = 'manual'): Promise<{ ok: boolean; message: string }> {
    try {
      const response = await fetch('/api/jobs/individual', {
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
          message: data.error || data.message || 'Error en el envío individual nativo',
        };
      }

      return {
        ok: true,
        message: 'Proceso de generación iniciado.',
      };
    } catch (error: any) {
      console.error('Error in automationService (individual):', error);
      return {
        ok: false,
        message: 'Error de conexión nativo',
      };
    }
  },

  /**
   * Dispara el envío de un correo institucional individual
   */
  async triggerIndividualEmail(eventoId: string, personaId: string, origen: string = 'manual'): Promise<{ ok: boolean; message: string }> {
    try {
      const response = await fetch('/api/jobs/individual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          evento_id: eventoId, 
          persona_id: personaId,
          origen,
          tipo: 'email_only'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          message: data.error || data.message || 'Error en el envío de correo nativo',
        };
      }

      return {
        ok: true,
        message: 'Envío de correo nativo iniciado.',
      };
    } catch (error: any) {
      console.error('Error in automationService (email):', error);
      return {
        ok: false,
        message: 'Error de conexión con el servidor nativo',
      };
    }
  },
};
