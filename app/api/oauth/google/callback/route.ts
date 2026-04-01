import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // Aquí viene el tenantId inyectado en la ruta original
    
    if (!code || !state) {
      return NextResponse.json({ error: "Parámetros inválidos de Google (Falta code o state)" }, { status: 400 });
    }

    const tenantId = state;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.PUBLIC_BASE_URL}/api/oauth/google/callback`
    );

    // 1. Intercambiar el código por los tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // 2. Obtener el email del usuario para saber desde quién mandaremos
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    });
    
    const { data: userInfo } = await oauth2.userinfo.get();
    const senderEmail = userInfo.email;

    if (!senderEmail) {
       return NextResponse.json({ error: "No se pudo recuperar el correo asociado al token." }, { status: 400 });
    }

    // 3. Guardar el Token en Supabase atado al Tenant 
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Usamos la de Servicio porque estamos insertando credenciales críticas, RLS lo bloquearía o sería muy estricto
      { cookies: {} }
    );

    // Usar upsert para actualizar los tokens si este tenant ya se había conectado antes
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setMilliseconds(tokenExpiresAt.getMilliseconds() + (tokens.expiry_date ? tokens.expiry_date : 3600000));

    const { error: dbError } = await supabase
      .from("email_configurations")
      .upsert({
        tenant_id: tenantId,
        provider: 'google_oauth',
        sender_email: senderEmail,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token, // SOLO llega la primera vez que autoriza (prompt: consent)
        token_expires_at: tokenExpiresAt.toISOString(),
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id' });

    if (dbError) {
      console.error("Error guardando config OAuth en DB:", dbError);
      return NextResponse.json({ error: "No se pudo guardar la configuración OAuth." }, { status: 500 });
    }

    // Redirect de regreso a la interfaz de correos informando el éxito
    return NextResponse.redirect(`${process.env.PUBLIC_BASE_URL}/app/correos?oauth_success=true&email=${senderEmail}`);
  } catch (error: any) {
    console.error("Error en Callback de Auth Google:", error);
    return NextResponse.redirect(`${process.env.PUBLIC_BASE_URL}/app/correos?oauth_error=true`);
  }
}
