import { createClient } from "./supabaseClient";

/**
 * Inicia el flujo de autenticación con Google mediante Supabase.
 * Centraliza la configuración de redirección y logs de depuración.
 */
export async function signInWithGoogle() {
  const supabase = createClient();
  const redirectTo = "https://genniasistent.vercel.app/auth/callback";

  // Logs temporales de depuración solicitados
  console.log("Iniciando login con Google...");
  console.log("Redirect URL:", redirectTo);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    console.error("Error al iniciar sesión con Google:", error.message);
    throw error;
  }
}
