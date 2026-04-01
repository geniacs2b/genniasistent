/**
 * storageConstants.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Nombres canonónicos de todos los buckets de Supabase Storage usados en el sistema.
 * Importar desde aquí en lugar de usar strings literales en el código.
 * ──────────────────────────────────────────────────────────────────────────────
 */

/** Bucket donde se guardan los PDFs de certificados generados (público, read-only). */
export const BUCKET_CERTIFICADOS = 'certificados-generados';

/** Bucket donde se guardan las imágenes de fondo de las plantillas de certificados. */
export const BUCKET_PLANTILLAS_BASE = 'certificados-base';

/**
 * Construye la ruta canónica dentro de BUCKET_CERTIFICADOS para un PDF generado.
 * Estructura: {tenant_id}/{evento_id}/{job_id}.pdf
 *
 * Se usa job_id como identificador terminal porque:
 * - Es globalmente único (UUID v4)
 * - No colisiona si la misma persona recibe dos generaciones distintas
 * - Permite trazar el archivo directamente al job en certificate_jobs
 */
export function buildCertificadoPdfPath(
  tenantId: string,
  eventoId: string,
  jobId: string,
): string {
  return `${tenantId}/${eventoId}/${jobId}.pdf`;
}
