"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabaseClient";
import { formatToBogota } from "@/lib/date";
import { 
  QrCode, 
  Copy, 
  CheckCheck, 
  Play, 
  StopCircle, 
  XCircle, 
  RefreshCw, 
  Download, 
  Trash2,
  Calendar,
  Zap,
  Activity,
  Maximize2,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QRPageClientProps {
  sesiones: any[];
  tokens: any[];
}

type QrEstado = 'generado' | 'activo' | 'cerrado' | 'cancelado' | string;

function EstadoBadge({ estado, activo }: { estado: QrEstado, activo: boolean }) {
  const finalState = estado === 'activo' || (activo && !estado) ? 'activo' : estado;
  
  if (finalState === 'activo') {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 px-3 py-1 rounded-full text-[10px] font-black tracking-widest flex items-center gap-2 animate-in fade-in zoom-in-95 duration-500">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        ACTIVO
      </Badge>
    );
  }
  if (finalState === 'generado') {
    return (
      <Badge variant="secondary" className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-0 px-3 py-1 rounded-full text-[10px] font-black tracking-widest animate-in fade-in zoom-in-95 duration-300">
        GENERADO
      </Badge>
    );
  }
  if (finalState === 'cerrado') {
    return (
      <Badge variant="outline" className="border-orange-200 text-orange-600 dark:border-orange-500/30 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-3 py-1 rounded-full text-[10px] font-black tracking-widest animate-in fade-in zoom-in-95 duration-300">
        PAUSADO
      </Badge>
    );
  }
  if (finalState === 'cancelado') {
    return (
      <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-0 px-3 py-1 rounded-full text-[10px] font-black tracking-widest animate-in fade-in zoom-in-95 duration-300">
        ANULADO
      </Badge>
    );
  }
  return <Badge variant="outline" className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">{estado ?? 'Generado'}</Badge>;
}

/** Canvas que renderiza el QR y expone un ref para descargar */
function QrCanvas({ token, tokenId, sesionNombre }: { token: string; tokenId: string; sesionNombre: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/asistencia?token=${token}`
    : `/asistencia?token=${token}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 180, margin: 2 });
    }
  }, [url]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `qr-sesion-${sesionNombre.replace(/\s+/g, "-").toLowerCase()}-${tokenId.slice(0, 8)}.png`;
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-4 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner group/qr">
      <div className="relative p-2 bg-white rounded-xl border border-slate-50 shadow-sm transition-transform group-hover/qr:scale-105 duration-500">
        <canvas ref={canvasRef} className="rounded-lg" />
      </div>
      <Button size="sm" variant="outline" className="gap-2 w-full h-10 rounded-xl font-black text-[11px] uppercase tracking-widest border-slate-200 text-slate-500 hover:bg-slate-50 transition-all active:scale-95" onClick={handleDownload}>
        <Download className="w-4 h-4" />
        Descargar Imagen
      </Button>
    </div>
  );
}

export function QRPageClient({ sesiones, tokens: initialTokens }: QRPageClientProps) {
  const [sesionId, setSesionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tokens, setTokens] = useState(initialTokens);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  const refreshTokens = async () => {
    const { data, error } = await supabase
      .from("qr_tokens_asistencia")
      .select("id, token, estado, activo, fecha_activacion, fecha_desactivacion, created_at, sesiones_evento(nombre, fecha, eventos(titulo))")
      .order("created_at", { ascending: false })
      .limit(30);
    
    if (error) {
      console.error("[QRPageClient] Error refreshing tokens:", error);
      toast({ title: "Error al actualizar lista", description: error.message, variant: "destructive" });
    } else {
      if (data) setTokens(data);
    }
  };

  const generateQR = async () => {
    if (!sesionId) {
      toast({ title: "Selecciona una sesión antes de generar el QR", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('generar_qr_sesion', {
      p_sesion_evento_id: sesionId,
      p_observacion: null,
    });
    setLoading(false);

    if (error) {
      toast({ title: "Error al generar QR", description: error.message, variant: "destructive" });
    } else {
      const result = Array.isArray(data) ? data[0] : data;
      if (result?.ok === false) {
        toast({ title: "Error al generar QR", description: result.mensaje, variant: "destructive" });
      } else {
        toast({ title: "QR generado correctamente", description: "Actívalo cuando empiece la sesión." });
        await refreshTokens();
      }
    }
  };

  const handleAction = async (action: 'activar' | 'desactivar' | 'cancelar', tokenId: string) => {
    setActionLoading(tokenId + action);
    let error: any = null;
    let data: any = null;

    if (action === 'activar') {
      ({ data, error } = await supabase.rpc('activar_qr_sesion', { p_qr_token_id: tokenId }));
    } else if (action === 'desactivar') {
      ({ data, error } = await supabase.rpc('desactivar_qr_sesion', { p_qr_token_id: tokenId, p_desactivado_por: null, p_observacion: null }));
    } else if (action === 'cancelar') {
      ({ data, error } = await supabase.rpc('cancelar_qr_sesion', { p_qr_token_id: tokenId, p_observacion: null }));
    }

    setActionLoading(null);

    const result = Array.isArray(data) ? data[0] : data;

    if (error) {
      toast({ title: `Error al ${action} QR`, description: error.message, variant: "destructive" });
    } else if (result?.ok === false) {
      toast({ title: `Error al ${action} QR`, description: result?.mensaje, variant: "destructive" });
    } else {
      toast({ title: `Operación exitosa`, description: `QR ${action === 'activar' ? 'activado' : action === 'desactivar' ? 'pausado' : 'anulado'} correctamente` });
      await refreshTokens();
    }
  };

  const copyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/asistencia?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast({ title: "Enlace copiado", description: "Se ha copiado la URL de registro al portapapeles." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (tokenId: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este QR? Esta acción es definitiva.")) return;

    setActionLoading(tokenId + 'eliminar');
    const { data, error } = await supabase.rpc('eliminar_qr_sesion', { p_qr_token_id: tokenId });
    setActionLoading(null);

    const result = Array.isArray(data) ? data[0] : data;

    if (error) {
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    } else if (result?.ok === false) {
      toast({ title: "No se pudo eliminar", description: result?.mensaje, variant: "destructive" });
    } else {
      toast({ title: "QR eliminado correctamente" });
      setTokens(prev => prev.filter(t => t.id !== tokenId));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      {/* Panel generación (Izquierda) */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="shadow-[0_8px_40px_rgb(0,0,0,0.03)] border border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2rem] overflow-hidden group">
          <div className="h-2 w-full bg-gradient-to-r from-indigo-500 to-indigo-700"></div>
          <CardHeader className="pb-6 px-10 pt-10">
            <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 transition-transform group-hover:rotate-12 duration-500">
                    <Zap className="w-6 h-6" fill="currentColor" />
                </div>
                <div>
                   <CardTitle className="text-2xl font-black italic text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                    Nuevo acceso QR
                   </CardTitle>
                   <CardDescription className="text-sm font-medium text-slate-500 mt-1">
                    Crea un punto de captura de asistencia.
                   </CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8 px-10 pb-10">
            <div className="space-y-4">
              <Label className="text-[11px] uppercase tracking-[0.2em] font-black text-slate-400">Seleccionar Sesión Operativa</Label>
              <Select onValueChange={setSesionId}>
                <SelectTrigger className="h-14 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 transition-all italic">
                  <SelectValue placeholder="Busca una sesión..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-200 shadow-2xl">
                  {sesiones.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="py-3 px-4 font-bold cursor-pointer">
                      <span className="text-indigo-600">{(s.eventos as any)?.titulo}</span> 
                      <span className="text-slate-300 mx-2 font-normal">/</span>
                      <span className="text-slate-800 dark:text-slate-100">{s.nombre}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-4">
                <Button 
                onClick={generateQR} 
                disabled={loading} 
                className="w-full gap-3 h-14 rounded-2xl font-black text-base bg-indigo-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/10 transition-all hover:-translate-y-1 hover:shadow-indigo-500/20 active:scale-95 italic"
                >
                <QrCode className="w-5 h-5" />
                {loading ? "Generando Acceso..." : "Generar Código QR"}
                </Button>

                <button 
                onClick={refreshTokens}
                className="w-full flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors py-2"
                >
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                Actualizar lista de accesos
                </button>
            </div>
          </CardContent>
        </Card>

        {/* Tip Informativo */}
        <div className="p-8 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-[2rem] border border-indigo-100 dark:border-indigo-500/10 space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" />
                Control Operativo
            </h4>
            <p className="text-xs font-semibold text-slate-500 leading-relaxed italic">
                Los códigos generados se encuentran inactivos por defecto. Actívalos justo antes de iniciar el registro físico para garantizar la seguridad del evento.
            </p>
        </div>
      </div>

      {/* Lista de tokens (Derecha) */}
      <div className="lg:col-span-8 space-y-8">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-2xl font-black italic text-slate-900 dark:text-slate-100">Sesiones activas y accesos</h2>
          <Badge variant="outline" className="border-slate-200 text-slate-400 rounded-full font-black px-4 py-1.5 text-[10px] tracking-widest">REAL TIME MONITORING</Badge>
        </div>
        
        {tokens.length === 0 && (
          <div className="py-32 text-center flex flex-col items-center justify-center border-2 border-dashed rounded-[3rem] border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm">
            <div className="h-20 w-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <QrCode className="w-10 h-10 text-slate-200" />
            </div>
            <p className="text-xl font-black text-slate-700 italic">Sin accesos configurados</p>
            <p className="text-sm font-medium text-slate-400 mt-2">Utiliza el panel de la izquierda para crear tu primer punto de acceso.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
          {tokens.map((t) => {
            const sesion = t.sesiones_evento as any;
            const evento = sesion?.eventos as any;
            const estado: QrEstado = t.estado ?? (t.activo ? 'activo' : 'generado');
            const isActing = (act: string) => actionLoading === t.id + act;
            const isExpanded = expandedId === t.id;
            const isFinished = estado === 'cancelado' || estado === 'cerrado';

            return (
              <Card key={t.id} className="group border border-slate-200/60 dark:border-slate-800 shadow-[0_4px_24px_rgb(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] transition-all duration-500 bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden flex flex-col h-full hover:-translate-y-1">
                <div className="p-8 pb-4 flex-1 space-y-6">
                  {/* Header Card */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">{evento?.titulo ?? "Evento"}</p>
                      <h3 className="font-black text-xl text-slate-900 dark:text-slate-100 italic leading-tight">{sesion?.nombre ?? "Acceso"}</h3>
                    </div>
                    <EstadoBadge estado={estado} activo={t.activo} />
                  </div>

                  {/* Token & Link Info */}
                  <div className="space-y-3">
                     <div className="flex items-center justify-between gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Código de acceso</span>
                           <code className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 truncate">
                            {t.token.slice(0, 10)}...{t.token.slice(-10)}
                           </code>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 min-w-10 rounded-xl hover:bg-white dark:hover:bg-slate-800 shadow-sm"
                          onClick={() => copyLink(t.token, t.id)}
                        >
                          {copiedId === t.id ? <CheckCheck className="w-5 h-5 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                        </Button>
                     </div>

                     <div className="flex items-center gap-3 px-1 text-xs font-bold text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatToBogota(sesion?.fecha || t.created_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                     </div>
                  </div>

                  {/* QR Expandible */}
                  {isExpanded && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-500 pt-2 pb-4">
                      <QrCanvas token={t.token} tokenId={t.id} sesionNombre={sesion?.nombre ?? "sesion"} />
                    </div>
                  )}
                </div>

                {/* Acciones Footer */}
                <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    <Button
                      variant={isExpanded ? "secondary" : "ghost"}
                      className="w-full h-12 rounded-xl font-bold bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 hover:text-indigo-600 gap-2 shadow-sm transition-all"
                      onClick={() => setExpandedId(isExpanded ? null : t.id)}
                    >
                      <Maximize2 className={cn("w-4 h-4 transition-transform duration-500", isExpanded && "rotate-180")} />
                      {isExpanded ? "Ocultar Código QR" : "Mostrar Código QR"}
                    </Button>

                    <div className="flex gap-2.5">
                       {/* Control de Flujo (Activar/Pausar) */}
                       {(estado === 'generado' || (!estado && !t.activo)) ? (
                         <Button
                            className="flex-1 h-11 rounded-xl font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white gap-2 transition-all hover:scale-[1.02]"
                            onClick={() => handleAction('activar', t.id)}
                            disabled={isActing('activar')}
                          >
                            <Play className="w-4 h-4 fill-white" />
                            Activar
                          </Button>
                       ) : estado === 'activo' ? (
                          <Button
                            variant="outline"
                            className="flex-1 h-11 rounded-xl font-black text-xs uppercase tracking-wider border-amber-200 text-amber-600 hover:bg-amber-50 gap-2 transition-all"
                            onClick={() => handleAction('desactivar', t.id)}
                            disabled={isActing('desactivar')}
                          >
                            <StopCircle className="w-4 h-4" />
                            Pausar
                          </Button>
                       ) : null}

                       {/* Anular Acceso */}
                       {!isFinished && (
                          <Button
                            variant="outline"
                            className="flex-1 h-11 rounded-xl font-black text-xs uppercase tracking-wider border-rose-100 text-rose-500 hover:bg-rose-50 gap-2 transition-all"
                            onClick={() => handleAction('cancelar', t.id)}
                            disabled={isActing('cancelar')}
                          >
                            <XCircle className="w-4 h-4" />
                            Anular
                          </Button>
                       )}

                       {/* Eliminar (Solo si está finalizado) */}
                       {isFinished && (
                         <Button
                            variant="outline"
                            className="flex-1 h-11 rounded-xl font-black text-xs uppercase tracking-wider border-rose-200 text-rose-600 hover:bg-rose-50 gap-2 transition-all"
                            onClick={() => handleDelete(t.id)}
                            disabled={isActing('eliminar')}
                          >
                            <Trash2 className="w-4 h-4" />
                            Eliminar
                          </Button>
                       )}
                    </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
