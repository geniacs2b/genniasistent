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
      className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95 h-8 px-3"
      onClick={handleTrigger}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Award className="w-3.5 h-3.5" />
      )}
      {loading ? "Procesando..." : "Enviar Certificados"}
    </Button>
  );
}
