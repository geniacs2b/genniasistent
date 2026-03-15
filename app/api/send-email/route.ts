import { emailService } from '@/services/emailService';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, nombres, eventoTitulo, verificationUrl } = await request.json();

    // El token está al final de la URL
    const token = verificationUrl.split('token=')[1] || '';

    const result = await emailService.sendVerificationEmail(email, nombres, eventoTitulo, token);

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: "Error interno al enviar el correo", 
        detail: error.message,
        code: error.code 
      }, 
      { status: 500 }
    );
  }
}
