"use client";

import { useState, useEffect } from "react";
import { validateQr, registerAttendanceByDocument } from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { formatToBogota } from "@/lib/date";

type ViewState = 'loading' | 'invalid' | 'inactive' | 'ready' | 'success' | 'duplicate';

export default function AsistenciaPage() {
  const [token, setToken] = useState("");
  const [qrInfo, setQrInfo] = useState<any>(null);
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [qrError, setQrError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const t = urlParams.get('token');
    if (!t) {
      setViewState('invalid');
      setQrError("No se encontró ningún token en el enlace. Escanea el código QR nuevamente.");
      return;
    }
    setToken(t);
    checkToken(t);
  }, []);

  const checkToken = async (t: string) => {
    setViewState('loading');
    const res = await validateQr(t);

    if (!res.success) {
      console.error("Token validation failed:", res.error);
      setViewState('invalid');
      setQrError(res.error || "Error al validar el QR.");
      return;
    }

    const info = res.data;
    console.log("QR Token Info:", info);
    setQrInfo(info);

    // The RPC might return { activo, ok, mensaje, sesion, ... } — handle multiple response shapes
    const isActive = info?.activo === true || info?.ok === true || info?.estado === 'activo';
    if (!isActive) {
      setViewState('inactive');
      setQrError(info?.mensaje || "Este QR no está activo en este momento.");
    } else {
      setViewState('ready');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroDocumento.trim()) {
      toast({ title: "Ingresa tu número de documento", variant: "destructive" });
      return;
    }
    setSubmitLoading(true);
    const res = await registerAttendanceByDocument(token, numeroDocumento.trim());
    console.log("Registration Response:", res);
    setSubmitLoading(false);

    const data = res.data;
    const msg = res.error || data?.mensaje || data?.message;

    if (res.success) {
      // Truly successful registration
      setConfirmMessage(msg || "¡Asistencia registrada exitosamente!");
      setViewState('success');
    } else {
      // Logical or Technical Failure
      if (data?.already_registered === true) {
        setConfirmMessage(msg || "Esta asistencia ya fue registrada anteriormente.");
        setViewState('duplicate');
      } else if (data?.error_type === 'PERSON_NOT_FOUND' || data?.error_type === 'NOT_REGISTERED_FOR_EVENT' || data?.error_type === 'INVALID_TOKEN') {
        setQrError(msg || "Error de validación.");
        setViewState('invalid');
      } else {
        // Other errors or generic toast
        toast({
          title: "Aviso",
          description: msg || "No se pudo realizar el registro.",
          variant: "destructive",
        });
      }
    }
  };

  const resetForm = () => {
    setNumeroDocumento("");
    setViewState('ready');
    setConfirmMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex flex-col items-center justify-center py-12 px-4 selection:bg-primary/20">
      <div className="w-full max-w-md flex flex-col gap-6">

      {viewState === 'loading' && (
        <Card className="w-full shadow-2xl shadow-indigo-500/10 border-0 bg-white/95 backdrop-blur-xl rounded-[1.5rem] overflow-hidden">
          <CardContent className="py-12 flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full pb-2"></div>
              <Loader2 className="w-16 h-16 animate-spin text-primary relative" strokeWidth={2} />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Verificando pase de acceso</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Por favor, espera un momento...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {viewState === 'invalid' && (
        <Card className="w-full shadow-2xl shadow-rose-500/10 border-0 bg-white/95 backdrop-blur-xl rounded-[1.5rem] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500"></div>
          <CardContent className="py-16 px-8 flex flex-col items-center text-center gap-6">
            <div className="h-20 w-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center ring-8 ring-rose-50/50 dark:ring-rose-900/10">
              <XCircle className="w-10 h-10 text-rose-500" strokeWidth={2.5} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">Acceso Denegado</h2>
              <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">{qrError}</p>
            </div>
            <p className="text-sm font-medium text-slate-400 mt-4">Verifica que estés escaneando el código correcto.</p>
          </CardContent>
        </Card>
      )}

      {viewState === 'inactive' && (
        <Card className="w-full shadow-2xl shadow-amber-500/10 border-0 bg-white/95 backdrop-blur-xl rounded-[1.5rem] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500"></div>
          <CardContent className="py-16 px-8 flex flex-col items-center text-center gap-6">
            <div className="h-20 w-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center ring-8 ring-amber-50/50 dark:ring-amber-900/10">
              <AlertTriangle className="w-10 h-10 text-amber-500" strokeWidth={2.5} />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">Sesión Inactiva</h2>
              <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                El registro de asistencia para este evento se encuentra cerrado actualmente.
              </p>
              {qrError && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg mt-2 inline-block">
                  <p className="text-sm text-slate-500 font-medium">{qrError}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {viewState === 'ready' && (
        <Card className="w-full shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-200/50 bg-white/95 backdrop-blur-xl overflow-hidden rounded-[1.5rem] relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-indigo-500 to-sky-400"></div>
          <CardHeader className="text-center pt-10 pb-6 border-b border-slate-100 dark:border-slate-800/50 px-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4 ring-8 ring-indigo-50/30 dark:ring-indigo-900/10">
              <span className="text-3xl">🎫</span>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">Confirmación Asistencia</CardTitle>
            {qrInfo?.sesion?.nombre && (
              <div className="mt-4 space-y-1.5">
                <p className="text-lg font-bold text-primary">
                  {qrInfo.sesion.nombre}
                </p>
                {qrInfo.sesion?.fecha && (
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 inline-block px-3 py-1 rounded-full">
                    {formatToBogota(qrInfo.sesion.fecha, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="doc" className="text-base font-semibold text-slate-700 dark:text-slate-300 ml-1">Documento de Identidad</Label>
                <Input
                  id="doc"
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                  placeholder="Ej. 1012345678"
                  autoFocus
                  className="text-lg h-14 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
                <p className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-1.5">
                  <span className="text-xs">ℹ️</span> Ingresa solo números sin puntos ni espacios.
                </p>
              </div>
              <Button type="submit" size="lg" className="w-full mt-4 h-14 text-lg font-bold shadow-md hover:shadow-xl transition-all hover:-translate-y-1 active:scale-95" disabled={submitLoading}>
                {submitLoading ? (
                  <><Loader2 className="w-5 h-5 mr-3 animate-spin" />Verificando registro…</>
                ) : "Validar Asistencia"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {viewState === 'success' && (
        <Card className="w-full shadow-2xl shadow-emerald-500/10 border-0 bg-white/95 backdrop-blur-xl rounded-[1.5rem] overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500"></div>
          <CardContent className="py-12 px-8 flex flex-col items-center text-center gap-8">
             <div className="h-24 w-24 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center ring-8 ring-emerald-50/50 dark:ring-emerald-900/10">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" strokeWidth={2.5} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">¡Asistencia Exitosa!</h2>
              <div className="mt-2">
                <p className="text-lg font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-full inline-block">
                  {confirmMessage}
                </p>
              </div>
            </div>
             <div className="w-full pt-6 border-t border-slate-100 dark:border-slate-800/50 space-y-4">
              <Button variant="outline" size="lg" onClick={resetForm} className="w-full h-12 font-bold text-slate-600 border-slate-200 hover:bg-slate-50">
                Siguiente Persona
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {viewState === 'duplicate' && (
        <Card className="w-full shadow-2xl shadow-amber-500/10 border-0 bg-white/95 backdrop-blur-xl rounded-[1.5rem] overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500"></div>
          <CardContent className="py-16 px-8 flex flex-col items-center text-center gap-8">
             <div className="h-24 w-24 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center ring-8 ring-amber-50/50 dark:ring-amber-900/10">
              <AlertTriangle className="w-12 h-12 text-amber-500" strokeWidth={2.5} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Registro Duplicado</h2>
              <div className="mt-2">
                <p className="text-lg font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-4 py-2 rounded-full inline-block">
                  {confirmMessage}
                </p>
              </div>
            </div>
             <div className="w-full pt-6 border-t border-slate-100 dark:border-slate-800/50 space-y-4">
              <Button variant="outline" size="lg" onClick={resetForm} className="w-full h-12 font-bold text-slate-600 border-slate-200 hover:bg-slate-50">
                Siguiente Persona
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      </div>
    </div>
  );
}
