"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabaseClient";
import { SesionesForm } from "./SesionesForm";
import { formatToBogota } from "@/lib/date";
import { QrCode, Play, StopCircle, XCircle, Copy, CheckCheck, Users, Clock9, Trash2 } from "lucide-react";

interface SesionesClientProps {
  sesiones: any[];
  eventos: any[];
}

type QrEstado = 'generado' | 'activo' | 'cerrado' | 'cancelado' | string | null;

function QrBadge({ estado, activo }: { estado: QrEstado; activo: boolean }) {
  const ef = estado ?? (activo ? 'activo' : 'generado');
  if (ef === 'activo') return <Badge className="bg-green-500 text-white text-xs">QR Activo</Badge>;
  if (ef === 'cerrado') return <Badge variant="outline" className="border-orange-400 text-orange-600 text-xs">QR Cerrado</Badge>;
  if (ef === 'cancelado') return <Badge variant="destructive" className="text-xs">QR Cancelado</Badge>;
  return <Badge variant="secondary" className="text-xs">QR Generado</Badge>;
}

export function SesionesClient({ sesiones, eventos }: SesionesClientProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState(sesiones);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setSessionData(sesiones);
  }, [sesiones]);

  const refreshSessions = async () => {
    const { data } = await supabase
      .from("sesiones_evento")
      .select(`id, nombre, fecha, hora_inicio, hora_fin, eventos(id, titulo, fecha_inicio, fecha_fin, hora_inicio, hora_fin), qr_tokens_asistencia(id, token, estado, activo, fecha_activacion, fecha_desactivacion)`)
      .order("fecha", { ascending: false });
    if (data) setSessionData(data);
  };

  const handleQrAction = async (action: 'generar' | 'activar' | 'desactivar' | 'cancelar', sesionId: string, qrId?: string) => {
    const key = sesionId + action;
    setLoadingAction(key);
    let error: any = null;

    if (action === 'generar') {
      ({ error } = await supabase.rpc('generar_qr_sesion', { p_sesion_evento_id: sesionId, p_observacion: null }));
    } else if (action === 'activar' && qrId) {
      ({ error } = await supabase.rpc('activar_qr_sesion', { p_qr_token_id: qrId }));
    } else if (action === 'desactivar' && qrId) {
      ({ error } = await supabase.rpc('desactivar_qr_sesion', { p_qr_token_id: qrId, p_desactivado_por: null, p_observacion: null }));
    } else if (action === 'cancelar' && qrId) {
      ({ error } = await supabase.rpc('cancelar_qr_sesion', { p_qr_token_id: qrId, p_observacion: null }));
    }

    setLoadingAction(null);

    if (error) {
      toast({ title: `Error al ${action} QR`, description: error.message, variant: "destructive" });
    } else {
      toast({ title: `QR ${action === 'generar' ? 'generado' : action === 'activar' ? 'activado' : action === 'desactivar' ? 'desactivado' : 'cancelado'} correctamente` });
      await refreshSessions();
    }
  };

  const handleDeleteSession = async (id: string, nombre: string) => {
    if (!confirm(`¿Seguro que deseas eliminar la sesión "${nombre}"?`)) return;

    try {
      const { data, error } = await supabase.rpc('eliminar_sesion_evento', { 
        p_sesion_evento_id: id 
      });
      
      console.log('Delete Session RPC Response:', { data, error, id });

      if (error) {
        if (error.message.includes("asistencias")) {
          toast({ title: "No se puede eliminar", description: "No se puede eliminar la sesión porque ya tiene asistencias registradas.", variant: "destructive" });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: "Sesión eliminada correctamente" });
      await refreshSessions();
    } catch (err: any) {
      toast({ title: "Error al eliminar sesión", description: err.message, variant: "destructive" });
    }
  };

  const loadCount = async (sesionId: string) => {
    const { count } = await supabase
      .from("asistencias")
      .select("id", { count: "exact", head: true })
      .eq("sesion_id", sesionId);
    setAttendanceCounts(prev => ({ ...prev, [sesionId]: count ?? 0 }));
  };

  const copyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/asistencia?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">Sesiones</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-2">Gestiona las sesiones de cada evento y sus códigos QR de asistencia en tiempo real.</p>
        </div>
      </div>

      <SesionesForm eventos={eventos} onCreated={refreshSessions} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sessionData.length === 0 && (
          <div className="col-span-full py-20 text-center flex flex-col items-center justify-center border-2 border-dashed rounded-[2rem] border-slate-300/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <div className="h-16 w-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-4">
               <Clock9 className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-lg font-bold text-slate-600 dark:text-slate-300">No hay sesiones creadas</p>
            <p className="text-sm text-slate-500 mt-1">Crea una nueva sesión usando el formulario de arriba.</p>
          </div>
        )}
        {sessionData.map((s) => {
          const qrs: any[] = s.qr_tokens_asistencia ?? [];
          // Find the most recent / most relevant QR (prefer activo, else generado, else first)
          const activeQr = qrs.find(q => q.estado === 'activo' || q.activo)
            ?? qrs.find(q => q.estado === 'generado')
            ?? qrs[0];
          const qrEstado: QrEstado = activeQr?.estado ?? null;
          const count = attendanceCounts[s.id];

          return (
             <Card key={s.id} className="group relative overflow-hidden border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[1.5rem] flex flex-col">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-indigo-500 opacity-80"></div>
              <CardHeader className="pb-3 px-6 pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-bold leading-snug truncate text-slate-800 dark:text-slate-100">{s.nombre}</CardTitle>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                      {(s.eventos as any)?.titulo}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {activeQr && <QrBadge estado={qrEstado} activo={activeQr.activo} />}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors opacity-80 group-hover:opacity-100"
                      onClick={() => handleDeleteSession(s.id, s.nombre)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 flex-1 px-6 pb-6">
                {/* Date & time info */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 flex flex-col gap-2 border border-slate-100 dark:border-slate-800">
                  {s.fecha && (
                    <div className="flex justify-between items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                       <span className="capitalize">{formatToBogota(s.fecha, { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                       {(s.hora_inicio || s.hora_fin) && (
                        <span className="flex items-center gap-1.5 text-slate-500 font-medium bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md text-xs shadow-sm border border-slate-100 dark:border-slate-800">
                          <Clock9 className="w-3 h-3 text-indigo-500" />
                          {s.hora_inicio ?? "—"}{s.hora_fin ? ` – ${s.hora_fin}` : ""}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Attendance count */}
                <div className="flex items-center justify-between">
                   <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Asistencia</span>
                  <Button
                     variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 px-3 rounded-full border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 font-bold"
                    onClick={() => loadCount(s.id)}
                  >
                    <Users className="w-3.5 h-3.5" />
                    {count !== undefined ? `${count} confirmados` : "Ver registros"}
                  </Button>
                </div>

                {/* QR Actions */}
                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-2 mt-auto">
                  {!activeQr && (
                    <Button
                      size="sm"
                      className="w-full gap-2 h-10 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-all active:scale-95"
                      onClick={() => handleQrAction('generar', s.id)}
                      disabled={loadingAction === s.id + 'generar'}
                    >
                      <QrCode className="w-4 h-4" />
                      {loadingAction === s.id + 'generar' ? "Generando..." : "Generar Código QR"}
                    </Button>
                  )}
                  {activeQr && (
                    <div className="grid grid-cols-2 gap-2">
                      {(qrEstado === 'generado' || (!qrEstado && !activeQr.activo)) && (
                        <Button
                          size="sm"
                          className="gap-2 col-span-2 h-10 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                          onClick={() => handleQrAction('activar', s.id, activeQr.id)}
                          disabled={loadingAction === s.id + 'activar'}
                        >
                          <Play className="w-4 h-4 fill-white" />
                          {loadingAction === s.id + 'activar' ? "Activando..." : "Activar QR Público"}
                        </Button>
                      )}
                      {qrEstado === 'activo' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 h-10 rounded-xl font-bold border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/10 transition-colors"
                          onClick={() => handleQrAction('desactivar', s.id, activeQr.id)}
                          disabled={loadingAction === s.id + 'desactivar'}
                        >
                          <StopCircle className="w-4 h-4" />
                          {loadingAction === s.id + 'desactivar' ? "..." : "Desactivar"}
                        </Button>
                      )}
                      {(qrEstado === 'generado' || qrEstado === 'activo') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 h-10 rounded-xl font-bold border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10 transition-colors"
                          onClick={() => handleQrAction('cancelar', s.id, activeQr.id)}
                          disabled={loadingAction === s.id + 'cancelar'}
                        >
                          <XCircle className="w-4 h-4" />
                          {loadingAction === s.id + 'cancelar' ? "..." : "Cancelar"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        className={`gap-2 h-10 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors ${qrEstado === 'activo' ? '' : 'col-span-2'}`}
                        onClick={() => copyLink(activeQr.token, activeQr.id)}
                      >
                        {copiedId === activeQr.id ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        {copiedId === activeQr.id ? "¡Copiado!" : "Copiar enlace"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
