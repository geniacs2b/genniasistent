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
};
