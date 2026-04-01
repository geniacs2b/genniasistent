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
import { QrCode, Copy, CheckCheck, Play, StopCircle, XCircle, RefreshCw, Download, Trash2 } from "lucide-react";

interface QRPageClientProps {
  sesiones: any[];
  tokens: any[];
}

type QrEstado = 'generado' | 'activo' | 'cerrado' | 'cancelado' | string;

function estadoBadge(estado: QrEstado, activo: boolean) {
  if (estado === 'activo' || (activo && !estado)) {
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 border-0 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide">ACTIVO</Badge>;
  }
  if (estado === 'generado') {
    return <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 border-0 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide">GENERADO</Badge>;
  }
  if (estado === 'cerrado') {
    return <Badge variant="outline" className="border-orange-200 text-orange-600 dark:border-orange-500/30 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide">CERRADO</Badge>;
  }
  if (estado === 'cancelado') {
    return <Badge variant="destructive" className="bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-500/10 dark:text-rose-400 border-0 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide">CANCELADO</Badge>;
  }
  return <Badge variant="outline" className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase">{estado ?? 'Generado'}</Badge>;
}

/** Canvas que renderiza el QR y expone un ref para descargar */
function QrCanvas({ token, tokenId, sesionNombre }: { token: string; tokenId: string; sesionNombre: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/asistencia?token=${token}`
    : `/asistencia?token=${token}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 200, margin: 2 });
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
    <div className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
      <canvas ref={canvasRef} className="rounded-xl" />
      <Button size="sm" variant="outline" className="gap-2 w-full h-9 rounded-xl font-bold border-support text-support hover:bg-support/5 transition-colors" onClick={handleDownload}>
        <Download className="w-3.5 h-3.5" />
        Descargar QR
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
      toast({ title: `QR ${action === 'activar' ? 'activado' : action === 'desactivar' ? 'desactivado' : 'cancelado'} correctamente` });
      await refreshTokens();
    }
  };

  const handleDelete = async (tokenId: string) => {
    const confirmed = window.confirm(
      "¿Seguro que deseas eliminar este QR? Esta acción no se puede deshacer."
    );
    if (!confirmed) return;

    setActionLoading(tokenId + 'eliminar');
    const { data, error } = await supabase.rpc('eliminar_qr_sesion', { p_qr_token_id: tokenId });
    setActionLoading(null);

    const result = Array.isArray(data) ? data[0] : data;

    if (error) {
      toast({ title: "Error al eliminar QR", description: error.message, variant: "destructive" });
    } else if (result?.ok === false) {
      toast({ title: "No se pudo eliminar el QR", description: result?.mensaje, variant: "destructive" });
    } else {
      toast({ title: "QR eliminado correctamente" });
      setTokens(prev => prev.filter(t => t.id !== tokenId));
    }
  };

  const copyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/asistencia?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Panel generación */}
      <Card className="lg:col-span-1 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[1.5rem] self-start overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-500"></div>
        <CardHeader className="pb-4 px-6 pt-6 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <QrCode className="w-5 h-5 text-emerald-500" />
            Nuevo Código QR
          </CardTitle>
          <CardDescription className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">
            El QR se crea en estado <span className="font-bold">"generado"</span>. Actívalo manualmente cuando empiece la sesión.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Sesión del Evento</Label>
            <Select onValueChange={setSesionId}>
              <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-100 rounded-xl">
                <SelectValue placeholder="Seleccione sesión..." />
              </SelectTrigger>
              <SelectContent>
                {sesiones.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="py-2.5 font-medium">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{(s.eventos as any)?.titulo}</span> <span className="text-slate-400 mx-1">–</span> {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={generateQR} disabled={loading} className="w-full gap-2 h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 transition-all hover:-translate-y-0.5">
            <QrCode className="w-4 h-4" />
            {loading ? "Generando Código..." : "Generar Código QR"}
          </Button>
          <Button variant="ghost" size="sm" className="w-full gap-2 h-10 rounded-xl font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors" onClick={refreshTokens}>
            <RefreshCw className="w-4 h-4" />
            Actualizar lista
          </Button>
        </CardContent>
      </Card>

      {/* Lista de tokens */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Códigos Recientes</h2>
          <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-full font-bold px-3">Último 30</Badge>
        </div>
        
        {tokens.length === 0 && (
          <div className="py-16 text-center flex flex-col items-center justify-center border-2 border-dashed rounded-[2rem] border-slate-300/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <div className="h-16 w-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-4">
              <QrCode className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-lg font-bold text-slate-600 dark:text-slate-300">No hay tokens generados</p>
            <p className="text-sm text-slate-500 mt-1">Genera uno nuevo desde el panel izquierdo.</p>
          </div>
        )}
        <div className="space-y-4">
          {tokens.map((t) => {
            const sesion = t.sesiones_evento as any;
            const evento = sesion?.eventos as any;
            const estado: QrEstado = t.estado ?? (t.activo ? 'activo' : 'generado');
            const isActing = (act: string) => actionLoading === t.id + act;
            const isExpanded = expandedId === t.id;
            const isFinished = estado === 'cancelado' || estado === 'cerrado';

            return (
              <Card key={t.id} className="border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-900 rounded-[1.25rem] overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        {/* Nombre del evento */}
                        {evento?.titulo && (
                          <p className="text-[10px] font-extrabold text-secondary dark:text-primary uppercase tracking-widest">{evento.titulo}</p>
                        )}
                        {/* Nombre de la sesión */}
                        <p className="font-bold text-base text-slate-800 dark:text-slate-100">{sesion?.nombre ?? "—"}</p>
                        {/* Fecha de la sesión */}
                        <div className="flex items-center gap-3 mt-1.5">
                          {sesion?.fecha && (
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-700">
                              <span className="text-[10px]">📅</span> {formatToBogota(sesion.fecha, { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                          {/* Fecha de generación */}
                          {t.created_at && (
                            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                              Creado: {formatToBogota(t.created_at, { month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                      {estadoBadge(estado, t.activo)}
                    </div>

                    {/* Token text */}
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                       <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">TOKEN:</span>
                       <p className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{t.token}</p>
                    </div>

                    {/* Fechas activacion/desactivacion */}
                     {(t.fecha_activacion || t.fecha_desactivacion) && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 grid grid-cols-2 gap-2 bg-slate-50/50 dark:bg-slate-800/30 p-2.5 rounded-xl">
                        {t.fecha_activacion && (
                          <span className="flex items-center gap-1.5"><Play className="w-3 h-3 text-emerald-500" /> {formatToBogota(t.fecha_activacion, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                        )}
                        {t.fecha_desactivacion && (
                          <span className="flex items-center gap-1.5"><StopCircle className="w-3 h-3 text-rose-500" /> {formatToBogota(t.fecha_desactivacion, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                        )}
                      </div>
                    )}

                    {/* QR Visual (expandible) */}
                    {isExpanded && (
                      <div className="flex justify-center py-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl my-2 border border-slate-100 dark:border-slate-800">
                        <QrCanvas token={t.token} tokenId={t.id} sesionNombre={sesion?.nombre ?? "sesion"} />
                      </div>
                    )}
                  </div>

                  {/* Action buttons (Footer) */}
                  <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800">
                    {/* Ver / ocultar QR */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-2 h-11 rounded-none col-span-2 font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 dark:text-slate-300 dark:hover:text-white transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : t.id)}
                    >
                      <QrCode className="w-4 h-4 text-slate-400" />
                      {isExpanded ? "Ocultar QR Visible" : "Mostrar QR Visible"}
                    </Button>

                    <div className="col-span-2 grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800">
                      {/* Activar */}
                      {(estado === 'generado' || (!estado && !t.activo)) && (
                         <Button
                          size="sm"
                          variant="ghost"
                          className="gap-2 h-11 rounded-none col-span-2 font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 transition-colors"
                          onClick={() => handleAction('activar', t.id)}
                          disabled={isActing('activar')}
                        >
                          <Play className="w-4 h-4 fill-emerald-600 dark:fill-emerald-400" />
                          {isActing('activar') ? "Activando..." : "Activar para Asistencia"}
                        </Button>
                      )}

                      {/* Desactivar */}
                      {estado === 'activo' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-2 h-11 rounded-none font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 dark:text-orange-400 transition-colors"
                          onClick={() => handleAction('desactivar', t.id)}
                          disabled={isActing('desactivar')}
                        >
                          <StopCircle className="w-4 h-4" />
                          {isActing('desactivar') ? "..." : "Pausar/Cerrar"}
                        </Button>
                      )}

                      {/* Cancelar */}
                      {!isFinished && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-2 h-11 rounded-none font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 transition-colors"
                          onClick={() => handleAction('cancelar', t.id)}
                          disabled={isActing('cancelar')}
                        >
                          <XCircle className="w-4 h-4" />
                          {isActing('cancelar') ? "..." : "Anular"}
                        </Button>
                      )}

                      {/* Copiar enlace */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-2 h-11 rounded-none font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 dark:text-slate-300 dark:hover:text-white transition-colors ${!isFinished && estado !== 'activo' ? 'col-span-2 border-t border-slate-100 dark:border-slate-800' : ''} ${isFinished ? 'col-span-1 border-r border-slate-100 dark:border-slate-800' : ''}`}
                        onClick={() => copyLink(t.token, t.id)}
                      >
                        {copiedId === t.id ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                        {copiedId === t.id ? "¡Copiado!" : "Copiar URL"}
                      </Button>

                      {/* Eliminar QR — solo disponible cuando está cerrado o cancelado */}
                      {isFinished && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-2 h-11 rounded-none font-bold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-rose-500/10 dark:text-rose-400 transition-colors"
                          onClick={() => handleDelete(t.id)}
                          disabled={actionLoading === t.id + 'eliminar'}
                        >
                          <Trash2 className="w-4 h-4" />
                          {actionLoading === t.id + 'eliminar' ? "Eliminando..." : "Eliminar Definitivo"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
