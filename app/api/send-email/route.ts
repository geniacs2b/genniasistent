import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, nombres, eventoTitulo, verificationUrl } = await request.json();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h1>¡Hola, ${nombres}!</h1>
        <p>Gracias por inscribirte al evento <strong>${eventoTitulo}</strong>.</p>
        <p>Para confirmar tu inscripción y asegurar tu cupo, por favor haz clic en el siguiente enlace para verificar tu correo electrónico:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #0070f3; color: #fff; text-decoration: none; border-radius: 5px; margin-top: 20px; margin-bottom: 20px;">
          Verificar mi correo
        </a>
        <p>Si no solicitaste esta inscripción, puedes ignorar este mensaje.</p>
        <br/>
        <p>Saludos,</p>
        <p>El equipo organizador</p>
      </div>
    `;

    const mailOptions = {
      from: `"Plataforma Eventos" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Verifica tu correo para: ${eventoTitulo}`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
