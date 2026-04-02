import { createClient } from "./supabaseClient";

/**
 * Ayudador para centralizar la lógica de dominio y redirección de Google OAuth.
 */

// Dominio oficial de producción como fuente de verdad incondicional
export const OFFICIAL_DOMAIN = "https://genniasistent.vercel.app";

/**
 * Retorna la URL base de la aplicación con fallback de seguridad de código duro.
 * Esto previene el error redirect_uri=undefined en producción.
 */
export function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_BASE_URL || 
         process.env.PUBLIC_BASE_URL || 
         OFFICIAL_DOMAIN;
}

/**
 * Inicia el flujo de autenticación con Google mediante Supabase.
 * Centraliza la configuración de redirección y logs de depuración.
 */
export async function signInWithGoogle() {
  const supabase = createClient();
  // Dominio raíz definitivo con fallback robusto
  const redirectTo = getBaseUrl();

  // Logs temporales de depuración solicitados por el usuario
  console.log("[AuthHelper] Login Google iniciado");
  console.log("[AuthHelper] Redirect:", redirectTo);

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
