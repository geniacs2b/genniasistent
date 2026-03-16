import { createClient } from "@/lib/supabaseServer";
import { InscritosClient } from "./InscritosClient";
import { InscritosActions } from "./InscritosActions";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function InscritosPage() {
  const supabase = createClient();

  // Obtener inscripciones con join a personas
  const { data: inscripciones, error } = await supabase
    .from("inscripciones")
    .select(`
      id,
      estado,
      created_at,
      evento_id,
      persona_id,
      personas (
        id,
        nombres,
        apellidos,
        nombre_completo,
        tipo_documento,
        numero_documento,
        correo,
        correo_verificado
      ),
      eventos (
        id,
        titulo,
        min_sesiones_certificado
      )
    `)
    .order("created_at", { ascending: false });

  // 2. Obtener habilitaciones manuales
  const { data: habilitaciones } = await supabase
    .from("habilitaciones_certificado")
    .select("evento_id, persona_id");

  // 3. Obtener últimos envíos de certificados (específicos)
  const { data: enviosCertificados } = await supabase
    .from("envios_certificados")
    .select("evento_id, persona_id, estado_envio, created_at")
    .order("created_at", { ascending: false });

  // 4. Obtener últimos envíos de correo institucional (general)
  const { data: enviosCorreo } = await supabase
    .from("envios_correo")
    .select("evento_id, persona_id, estado, error_mensaje, enviado_at")
    .order("enviado_at", { ascending: false });

  // 5. Obtener asistencias para calcular sesiones por evento
  const { data: asistencias } = await supabase
    .from("asistencias")
    .select(`
      persona_id,
      sesion_id,
      sesion:sesiones_evento(evento_id)
    `);

  // Organizar datos para pasarlos al cliente
  const enrichedInscripciones = inscripciones?.map(insc => {
    const personaId = insc.persona_id;
    const eventoId = insc.evento_id;

    // Calcular sesiones asistidas en este evento
    const sesionesAsistidas = asistencias?.filter(asist => 
      asist.persona_id === personaId && 
      (asist.sesion as any)?.evento_id === eventoId
    ).length || 0;

    // Verificar habilitación manual
    const habilitadoManual = habilitaciones?.some(hab => 
      hab.evento_id === eventoId && hab.persona_id === personaId
    ) || false;

    // Obtener último envío de certificado (específico)
    const ultimoEnvioCertificado = enviosCertificados?.find((env: any) => 
      env.evento_id === eventoId && env.persona_id === personaId
    ) || null;

    // Obtener último envío de correo (general)
    const ultimoEnvioCorreo = enviosCorreo?.find((env: any) => 
      env.evento_id === eventoId && env.persona_id === personaId
    ) || null;

    return {
      ...insc,
      sesionesAsistidas,
      habilitadoManual,
      ultimoEnvioCertificado,
      ultimoEnvioCorreo
    };
  }) || [];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">Inscritos</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-2">Lista general de todos los participantes registrados en el sistema y su estado de certificación.</p>
        </div>
        <InscritosActions inscripciones={enrichedInscripciones} />
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-4 text-sm text-rose-600 font-medium border border-rose-200 dark:border-rose-800">
          Error al cargar inscritos: {error?.message}
        </div>
      )}

      <InscritosClient initialInscripciones={enrichedInscripciones} />
    </div>
  );
}
