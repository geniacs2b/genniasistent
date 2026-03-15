import nodemailer from 'nodemailer';

export const emailService = {
  /**
   * Envía un correo de verificación
   */
  async sendVerificationEmail(email: string, nombres: string, eventoTitulo: string, token: string) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
    const verificationUrl = `${baseUrl}/verificar-correo?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #0070f3; padding: 20px; text-align: center; color: white;">
          <h1 style="margin: 0;">Confirmación de Inscripción</h1>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #111;">¡Hola, ${nombres}!</h2>
          <p>Gracias por inscribirte al evento <strong>${eventoTitulo}</strong>.</p>
          <p>Para confirmar tu inscripción y asegurar tu cupo, por favor haz clic en el botón de abajo:</p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${verificationUrl}" style="display: inline-block; padding: 14px 28px; background-color: #0070f3; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              Verificar mi correo
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Si el botón no funciona, puedes copiar y pegar este enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #0070f3; font-size: 12px;">${verificationUrl}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px;">Si no solicitaste esta inscripción, puedes ignorar este mensaje.</p>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; text-align: center; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Plataforma de Eventos - Desarrollado por GENNIA S.A.S</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"GenniAsistent" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Verifica tu correo para: ${eventoTitulo}`,
      html: htmlContent,
    };

    try {
      console.log(`[EmailService] Optando por enviar a: ${email} para evento: ${eventoTitulo}`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`[EmailService] Correo enviado satisfactoriamente: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error("[EmailService] FATAL Error enviando correo:", {
        message: error.message,
        code: error.code,
        command: error.command
      });
      throw error;
    }
  }
};
