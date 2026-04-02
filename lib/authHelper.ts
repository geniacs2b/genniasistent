import { createClient } from "./supabaseClient";

/**
 * Inicia el flujo de autenticación con Google mediante Supabase.
 * Centraliza la configuración de redirección y logs de depuración.
 */
export async function signInWithGoogle() {
  const supabase = createClient();
  // Dominio raíz definitivo (sin paths por ahora para estabilidad)
  const redirectTo = "https://genniasistent.vercel.app";

  // Logs temporales de depuración solicitados por el usuario
  console.log("Login Google iniciado");
  console.log("Redirect:", redirectTo);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error) {
    console.error("Error al iniciar sesión con Google:", error.message);
    throw error;
  }
}
