import { createClient } from "@/lib/supabaseServer";
import { SesionesClient } from "./SesionesClient";

export const dynamic = 'force-dynamic';

export default async function SesionesPage() {
  const supabase = createClient();

  const [{ data: sesiones }, { data: eventos }] = await Promise.all([
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
  ]);

  return <SesionesClient sesiones={sesiones || []} eventos={eventos || []} />;
}
