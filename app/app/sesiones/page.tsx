import { createClient } from "@/lib/supabaseServer";
import { SesionesClient } from "./SesionesClient";

export const dynamic = 'force-dynamic';

export default async function SesionesPage() {
  const supabase = createClient();

  // Fetch sessions, active events, and attendance counts in parallel
  const [
    { data: sesiones }, 
    { data: eventos },
    { data: assists }
  ] = await Promise.all([
    supabase
      .from("sesiones_evento")
      .select(`
        id, nombre, fecha, hora_inicio, hora_fin,
        eventos(id, titulo, fecha_inicio, fecha_fin, hora_inicio, hora_fin),
        qr_tokens_asistencia(id, token, estado, activo, fecha_activacion, fecha_desactivacion)
      `)
      .order("fecha", { ascending: false }),
    supabase
      .from("eventos")
      .select("id, titulo, fecha_inicio, fecha_fin, hora_inicio, hora_fin")
      .eq("activo", true),
    supabase
      .from("asistencias")
      .select("sesion_id")
  ]);

  // Aggregate attendance counts by session_id
  const attendanceCounts: Record<string, number> = {};
  (assists || []).forEach((a: any) => {
    if (a.sesion_id) {
      attendanceCounts[a.sesion_id] = (attendanceCounts[a.sesion_id] || 0) + 1;
    }
  });

  // Enrich session data with counts
  const enrichedSesiones = (sesiones || []).map(s => ({
    ...s,
    attendance_count: attendanceCounts[s.id] || 0
  }));

  return <SesionesClient sesiones={enrichedSesiones} eventos={eventos || []} />;
}
