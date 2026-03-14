/**
 * Normaliza nombres y apellidos asegurando que no haya espacios extra
 * y que cada palabra comience con mayúscula seguida de minúsculas.
 * 
 * Ejemplo: "  cArLoS   mARio  " -> "Carlos Mario"
 * 
 * @param text Texto a normalizar
 * @returns Texto normalizado
 */
export function normalizePersonName(text: string | null | undefined): string {
  if (!text) return "";

  return text
    // 1. Quitar espacios al inicio y al final
    .trim()
    // 2. Colapsar múltiples espacios internos en uno solo
    .replace(/\s+/g, " ")
    // 3. Separar por palabras
    .split(" ")
    // 4. Transformar cada palabra: Primera mayúscula, resto minúscula
    .map(word => {
      if (word.length === 0) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    // 5. Unir de nuevo
    .join(" ");
}
