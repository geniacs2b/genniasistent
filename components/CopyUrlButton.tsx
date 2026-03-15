"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CopyUrlButtonProps {
  slug: string;
}

export function CopyUrlButton({ slug }: CopyUrlButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    const publicUrl = `${window.location.origin}/inscripcion/${slug}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast({
        title: "URL Copiada",
        description: "El enlace del formulario se ha copiado al portapapeles.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar la URL automáticamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 px-3 gap-2 text-[11px] font-bold border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-primary/10 hover:text-secondary rounded-lg transition-all active:scale-95 group/copy"
      onClick={handleCopy}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-emerald-500">Copiado</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 group-hover/copy:scale-110 transition-transform" />
          <span>Copiar URL</span>
        </>
      )}
    </Button>
  );
}
