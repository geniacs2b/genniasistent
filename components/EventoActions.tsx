"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Award, Loader2 } from "lucide-react";

interface EventoActionsProps {
  eventoId: string;
  hasTemplate: boolean;
}

export function EventoActions({ eventoId, hasTemplate }: EventoActionsProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!hasTemplate) return null;

  async function handleTrigger() {
    setLoading(true);
    try {
      const { automationService } = await import("@/services/automationService");
      const result = await automationService.triggerCertificateGeneration(eventoId);
      if (result.ok) {
        toast({ title: "Éxito", description: result.message });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button 
      type="button" 
      variant="secondary"
      size="sm"
      disabled={loading}
      className="gap-2.5 bg-gradient-to-br from-[#4f7cff] to-[#3b82f6] hover:brightness-110 text-white shadow-[0_8px_18px_rgba(59,130,246,0.25)] hover:shadow-[0_12px_22px_rgba(59,130,246,0.35)] transition-all duration-300 active:scale-95 h-9 px-4 rounded-xl border-0 font-bold text-[13px] hover:-translate-y-0.5"
      onClick={handleTrigger}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Award className="w-4 h-4" />
      )}
      {loading ? "Procesando..." : "Enviar Certificados"}
    </Button>
  );
}
