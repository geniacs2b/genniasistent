import { createServerClient } from "@supabase/ssr";
import { createClient } from "@/lib/supabaseServer";
import { ParticipantesClient } from "./ParticipantesClient";
import { ParticipantesActions } from "./ParticipantesActions";

export const dynamic = 'force-dynamic';

export default async function ParticipantesPage() {
  const supabase = createClient();

  // service_role — bypasa RLS en tablas con tenant_id NULL (personas, sesiones, asistencias)
  const adminSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: () => undefined, set: () => {}, remove: () => {} } }
  );

  // ── 1. Tenant del usuario autenticado ─────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id as string | undefined;
  console.log("[Participantes] tenant_id:", tenantId ?? "NO ENCONTRADO");

  // ── 2. Inscripciones del tenant + min_sesiones_certificado del evento ──────
  const { data: inscripcionesRaw, error: inscripcionesError } = await supabase
    .from("inscripciones")
    .select(`
      id,
      persona_id,
      evento_id,
      estado,
      created_at,
      eventos ( id, titulo, min_sesiones_certificado )
    `)
    .order("created_at", { ascending: false });

  console.log(
    "[Participantes] inscripciones:", inscripcionesRaw?.length ?? 0,
    "| error:", inscripcionesError?.message ?? "ninguno"
  );

  // ── 3. IDs únicos para las queries siguientes ─────────────────────────────
  const personaIds = Array.from(
    new Set((inscripcionesRaw ?? []).map((i: any) => i.persona_id).filter(Boolean))
  ) as string[];

  const eventoIds = Array.from(
    new Set((inscripcionesRaw ?? []).map((i: any) => i.evento_id).filter(Boolean))
  ) as string[];

  console.log("[Participantes] persona_ids:", personaIds.length, "| evento_ids:", eventoIds.length);

  // ── 4. Personas (service_role — personas.tenant_id puede ser NULL) ─────────
  let personasMap: Record<string, any> = {};
  if (personaIds.length > 0) {
    const { data: personas, error: personasError } = await adminSupabase
      .from("personas")
      .select("id, nombres, apellidos, nombre_completo, numero_documento, correo, correo_verificado")
      .in("id", personaIds);

    console.log("[Participantes] personas:", personas?.length ?? 0, personasError?.message ?? "");
    personasMap = Object.fromEntries((personas ?? []).map((p: any) => [p.id, p]));
  }

  // ── 5. Total de sesiones por evento (service_role — sesiones.tenant_id puede ser NULL) ──
  //    total_sesiones_evento = COUNT(*) de sesiones_evento por evento
  let sesionesCountMap: Record<string, number> = {};
  if (eventoIds.length > 0) {
    const { data: sesiones, error: sesionesError } = await adminSupabase
      .from("sesiones_evento")
      .select("evento_id")
      .in("evento_id", eventoIds);

    console.log("[Participantes] sesiones filas:", sesiones?.length ?? 0, sesionesError?.message ?? "");

    for (const s of (sesiones ?? [])) {
      sesionesCountMap[s.evento_id] = (sesionesCountMap[s.evento_id] ?? 0) + 1;
    }
    console.log("[Participantes] sesionesCountMap:", JSON.stringify(sesionesCountMap));
  }

  // ── 6. Sesiones asistidas por (persona_id, evento_id) donde valido = true ──
  //    sesiones_asistidas = COUNT(DISTINCT sesion_evento_id) agrupado por persona+evento
  let asistenciasMap: Record<string, number> = {};
  if (personaIds.length > 0 && eventoIds.length > 0) {
    const { data: asistencias, error: asistenciasError } = await adminSupabase
      .from("asistencias")
      .select("persona_id, evento_id, sesion_evento_id")
      .in("persona_id", personaIds)
      .in("evento_id", eventoIds)
      .eq("valido", true);

    console.log("[Participantes] asistencias válidas:", asistencias?.length ?? 0, asistenciasError?.message ?? "");

    // COUNT DISTINCT sesion_evento_id por (persona_id, evento_id)
    const seen = new Set<string>();
    for (const a of (asistencias ?? [])) {
      const dedupKey = `${a.persona_id}:${a.evento_id}:${a.sesion_evento_id}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      const key = `${a.persona_id}:${a.evento_id}`;
      asistenciasMap[key] = (asistenciasMap[key] ?? 0) + 1;
    }
    console.log("[Participantes] asistenciasMap:", JSON.stringify(asistenciasMap));
  }

  // ── 7. Mapear al shape que espera ParticipantesClient ─────────────────────
  const enrichedInscripciones = (inscripcionesRaw ?? []).map((insc: any) => {
    const p = personasMap[insc.persona_id];
    const evento = insc.eventos as any;

    const nombreCompleto =
      p?.nombre_completo?.trim() ||
      [p?.nombres, p?.apellidos].filter(Boolean).join(" ").trim() ||
      "Sin nombre";

    const totalSesiones   = sesionesCountMap[insc.evento_id] ?? 0;
    const sesionesAsistidas = asistenciasMap[`${insc.persona_id}:${insc.evento_id}`] ?? 0;
    const minSesiones     = evento?.min_sesiones_certificado ?? 0;
    const cumpleMinimo    = minSesiones > 0 ? sesionesAsistidas >= minSesiones : false;

    console.log(
      `[Participantes] insc=${insc.id} persona=${nombreCompleto}`,
      `sesiones=${sesionesAsistidas}/${totalSesiones} min=${minSesiones} cumple=${cumpleMinimo}`
    );

    return {
      id: insc.id,
      persona_id: insc.persona_id,
      evento_id: insc.evento_id,
      estado_db: insc.estado ?? "inscrito",
      cumple_asistencia: cumpleMinimo,
      personas: {
        nombre_completo: nombreCompleto,
        numero_documento: p?.numero_documento ?? "Sin documento",
        correo: p?.correo ?? "",
        correo_verificado: p?.correo_verificado ?? false,
      },
      eventos: {
        titulo: evento?.titulo ?? "Sin evento",
      },
      total_sesiones: totalSesiones,
      asistencias_validas: sesionesAsistidas,
    };
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            Participantes
          </h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-2">
            Lista general de todos los participantes registrados en el sistema y su estado de certificación.
          </p>
        </div>
        <ParticipantesActions inscripciones={enrichedInscripciones} />
      </div>

      {inscripcionesError && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-4 text-sm text-rose-600 font-medium border border-rose-200 dark:border-rose-800">
          Error al cargar inscritos: {inscripcionesError.message}
        </div>
      )}

      <ParticipantesClient initialInscripciones={enrichedInscripciones} />
    </div>
  );
}
