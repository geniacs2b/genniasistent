"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, RefreshCw, Edit2, CheckCircle2, XCircle } from "lucide-react";
import { resendVerificationAction, checkVerificationStatusAction, cancelRegistrationAction } from "@/app/actions/registration";

function PendingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  // IDs principales para el flujo
  const personaId = searchParams.get("personaId") || "";
  const eventId = searchParams.get("eventId") || "";
  
  // Datos informativos y para retrocompatibilidad
  const email = searchParams.get("email") || "";
  const doc = searchParams.get("doc") || "";
  const type = searchParams.get("type") || "";
  const event = searchParams.get("event") || "el evento";
  const slug = searchParams.get("slug") || "";

  const [resending, setResending] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!personaId || !eventId) {
      router.push("/");
      return;
    }

    // Polling cada 3 segundos para detectar verificación automática
    const interval = setInterval(async () => {
      try {
        const res = await checkVerificationStatusAction(personaId, eventId);
        if (res.success && res.verified) {
          setIsVerified(true);
          clearInterval(interval);
          toast({
            title: "¡Inscripción Confirmada!",
            description: "Tu correo ha sido verificado automáticamente.",
          });
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [personaId, eventId, doc, type, router, toast]);

  const onResend = async () => {
    setResending(true);
    try {
      const res = await resendVerificationAction(personaId, eventId);
      if (res.success) {
        toast({ title: "¡Correo reenviado!", description: "Revisa tu bandeja de entrada y spam." });
      } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const onCancel = async () => {
    if (!confirm("¿Estás seguro de que deseas cancelar tu inscripción? Se borrarán todos tus datos.")) return;
    setCanceling(true);
    try {
      const res = await cancelRegistrationAction(personaId, eventId);
      if (res.success) {
        toast({ title: "Inscripción cancelada", description: "Tus datos han sido eliminados correctamente." });
        router.push("/");
      } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCanceling(false);
    }
  };

  const onEdit = () => {
    // Redirigir al formulario original con los parámetros para pre-llenado
    const params = new URLSearchParams({
      edit: "true",
      personaId: personaId,
      doc: doc,
      type: type
    });
    router.push(`/inscripcion/${slug}?${params.toString()}`);
  };

  if (isFinished) {
    return (
      <div className="container mx-auto py-24 px-4 flex justify-center">
        <Card className="max-w-xl w-full shadow-2xl border-0 bg-white/95 backdrop-blur-xl rounded-[1.5rem] overflow-hidden relative animate-in zoom-in-95 duration-700">
          <div className="absolute top-0 left-0 right-0 h-2 bg-indigo-500"></div>
          <CardHeader className="text-center pt-16 pb-8">
            <div className="h-24 w-24 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-8">
              <Mail className="w-12 h-12 text-indigo-600" />
            </div>
            <CardTitle className="text-4xl font-black text-slate-800 tracking-tight">¡Muchas Gracias!</CardTitle>
            <CardDescription className="text-xl mt-6 px-4">
              Gracias por inscribirte al curso <br/>
              <strong className="text-indigo-600 uppercase mt-2 block">{event}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-16 flex justify-center">
             <Button variant="outline" onClick={() => router.push("/")} className="h-12 px-8 font-bold border-2">
                Ir a Inicio
             </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="container mx-auto py-24 px-4 flex justify-center">
        <Card className="max-w-xl w-full shadow-2xl border-0 bg-white/95 backdrop-blur-xl rounded-[1.5rem] overflow-hidden relative animate-in zoom-in-95 duration-700">
          <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-500"></div>
          <CardHeader className="text-center pt-12 pb-2">
            <div className="h-24 w-24 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-50/50 dark:ring-emerald-900/10 animate-bounce">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-800">¡Inscripción Exitosa!</CardTitle>
            <CardDescription className="text-lg mt-4 max-w-sm mx-auto leading-relaxed">
              Tu correo ha sido verificado y tu cupo para <strong>{event}</strong> está asegurado.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 py-8 sm:px-12 flex flex-col items-center gap-4">
            <Button onClick={() => router.push(`/inscripcion/${slug}`)} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-lg uppercase tracking-wider">
              Registrar otro participante
            </Button>
            <Button onClick={() => setIsFinished(true)} variant="outline" className="w-full h-14 border-2 font-black text-lg text-slate-700 hover:bg-slate-50 uppercase tracking-wider">
              Terminar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-24 px-4 flex justify-center">
      <Card className="max-w-xl w-full shadow-2xl border-0 bg-white/95 backdrop-blur-xl rounded-[1.5rem] overflow-hidden relative animate-in zoom-in-95 duration-500">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500"></div>
        <CardHeader className="text-center pt-10 pb-2">
          <div className="h-20 w-20 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-6 ring-8 ring-amber-50/50 dark:ring-amber-900/10">
            <Mail className="w-10 h-10 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-800">Verificación Pendiente</CardTitle>
          <CardDescription className="text-lg mt-4 max-w-sm mx-auto leading-relaxed">
            Para completar tu inscripción a <strong>{event}</strong>, debes confirmar tu correo electrónico.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 py-8 sm:px-12 space-y-8">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center space-y-4">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Enviamos un enlace a:</p>
            <p className="text-xl font-bold text-slate-900 break-all">{email}</p>
            
            <div className="pt-4 flex flex-col gap-3">
              <Button onClick={onResend} disabled={resending || canceling} className="h-12 bg-indigo-600 hover:bg-indigo-700 shadow-md font-bold">
                {resending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                No recibí el correo - Reenviar
              </Button>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button 
                  variant="ghost" 
                  onClick={onEdit}
                  className="flex-1 text-slate-600 font-semibold"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar Formulario
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={onCancel}
                  disabled={canceling}
                  className="flex-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold"
                >
                  {canceling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Cancelar Registro
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InscripcionPendientePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <PendingContent />
    </Suspense>
  );
}
