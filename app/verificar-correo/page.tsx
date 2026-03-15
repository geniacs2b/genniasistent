import { emailVerificationService } from "@/services/emailVerificationService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function VerificarCorreoPage({ searchParams }: { searchParams: { token?: string | string[] } }) {
  const tokenRaw = searchParams.token;
  const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;

  if (!token) {
    return (
      <div className="container mx-auto py-24 px-4 max-w-md">
        <Card className="text-center shadow-lg border-0 bg-card">
          <CardHeader>
             <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
             <CardTitle className="text-2xl font-bold">Token Inválido</CardTitle>
             <CardDescription>No se proporcionó ningún token de verificación.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  let result = null;
  let statusKey = 'invalid';

  try {
    result = await emailVerificationService.verifyToken(token);
    console.log("RPC Result in page.tsx:", result);
    
    // El RPC devuelve ok y mensaje
    if (result && result.ok) {
      statusKey = 'verified';
    } else if (result) {
      const msg = result.mensaje?.toLowerCase() || '';
      console.log("Parsed error message:", msg);
      if (msg.includes('ya verificado') || msg.includes('ya fue verificado') || msg.includes('ya fue utilizado')) {
        statusKey = 'already_used';
      } else if (msg.includes('expirado')) {
        statusKey = 'expired';
      } else {
        statusKey = 'invalid';
      }
    }
  } catch (error) {
    console.error("RPC Error in Catch block:", error);
    statusKey = 'invalid';
  }

  return (
    <div className="container mx-auto py-24 px-4 max-w-md">
      <Card className="text-center shadow-lg border-0 bg-card">
        <CardHeader>
          <div className="mx-auto mb-4">
            {statusKey === 'verified' && <CheckCircle2 className="w-16 h-16 text-green-500" />}
            {statusKey === 'expired' && <Clock className="w-16 h-16 text-orange-500" />}
            {(statusKey === 'already_used' || statusKey === 'invalid') && <XCircle className="w-16 h-16 text-destructive" />}
          </div>
          <CardTitle className="text-2xl font-bold">
            {statusKey === 'verified' && "¡Correo Verificado!"}
            {statusKey === 'expired' && "El enlace expiró"}
            {statusKey === 'already_used' && "Enlace ya utilizado"}
            {statusKey === 'invalid' && "Enlace inválido"}
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground mt-2">
            {statusKey === 'verified' && "Tu inscripción se ha confirmado correctamente. Pronto recibirás más detalles."}
            {statusKey === 'expired' && "El token de verificación ha expirado. Necesitas solicitar uno nuevo."}
            {statusKey === 'already_used' && "Este enlace ya fue procesado con anterioridad y no puede reutilizarse."}
            {statusKey === 'invalid' && "El enlace de verificación no es válido o está corrupto."}
          </CardDescription>
        </CardHeader>
        <CardContent>
           {statusKey !== 'verified' && (
             <Link href="/correo-corregir">
               <Button variant="outline" className="w-full mt-4">
                 Corregir mi correo o reenviar
               </Button>
             </Link>
           )}
           {statusKey === 'verified' && (
             <Link href="/">
               <Button className="w-full mt-4">
                 Aceptar
               </Button>
             </Link>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
