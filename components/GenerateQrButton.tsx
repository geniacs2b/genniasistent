"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QrCode, Download, Loader2, Link as LinkIcon, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface GenerateQrButtonProps {
  slug: string;
  eventName: string;
}

export function GenerateQrButton({ slug, eventName }: GenerateQrButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const publicUrl = `${window.location.origin}/inscripcion/${slug}`;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Generar el QR con alta resolución y escala
      const url = await QRCode.toDataURL(publicUrl, {
        width: 800,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrUrl(url);
      setIsOpen(true);
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo generar el código QR.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadQr = () => {
    if (!qrUrl) return;
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `QR-Inscripcion-${eventName.replace(/\s+/g, "-")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Descarga iniciada",
      description: "El código QR se está guardando en tu dispositivo.",
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-3 gap-2 text-[11px] font-bold border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-secondary/10 hover:text-secondary rounded-lg transition-all active:scale-95 group/qr"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <QrCode className="w-3.5 h-3.5 group-hover/qr:scale-110 transition-transform" />
        )}
        <span>Generar QR</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-800 dark:text-slate-100 italic">
              Código QR de Inscripción
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
              Escanéalo para acceder directamente al formulario de <strong>{eventName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-6 gap-6">
            <div className="relative group p-4 bg-white rounded-3xl shadow-inner border-2 border-slate-100">
                {qrUrl && (
                  <img 
                    src={qrUrl} 
                    alt={`QR Inscripción ${eventName}`} 
                    className="w-48 h-48 sm:w-64 sm:h-64 rounded-xl"
                  />
                )}
            </div>
            
            <div className="flex flex-col items-center gap-2 w-full px-4">
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
                <LinkIcon className="w-3 h-3" />
                <span>Enlace vinculado</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium break-all text-center max-w-[300px]">
                {publicUrl}
              </p>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-center gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
            <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                className="rounded-xl font-bold h-11 border-slate-200 dark:border-slate-700"
            >
              Cerrar
            </Button>
            <Button 
                onClick={downloadQr}
                className="rounded-xl font-bold h-11 gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              Descargar Imagen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
