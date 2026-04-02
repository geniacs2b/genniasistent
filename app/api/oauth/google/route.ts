import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // Verificación de variables de entorno con fallback de seguridad
    const publicBase = process.env.PUBLIC_BASE_URL || "https://genniasistent.vercel.app";
    
    console.log('[Google OAuth] Iniciando generación de URL:', {
      PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ? 'Configurado ✅' : 'Faltante -> Usando Fallback ⚠️',
      BaseURL_Final: publicBase
    });

  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }); },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Tenant_id debe venir en los app_metadata
    const tenantId = user.app_metadata?.tenant_id;
    if (!tenantId) {
      return NextResponse.json({ error: "Usuario sin tenant asignado" }, { status: 403 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${publicBase}/api/oauth/google/callback`
    );

    // Scopes requeridos para mandar correos a nombre del usuario
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const redirectUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Importante para obtener el refresh_token
      prompt: 'consent', // Forzar consentimiento para siempre recibir el refresh token
      scope: scopes,
      state: tenantId, // Pasamos el tenantId como estado para recuperarlo en el callback
    });

    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error("Error al generar URL de Auth Google:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
