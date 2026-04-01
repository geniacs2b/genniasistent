"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PortalButton() {
   const [loading, setLoading] = useState(false);
   const { toast } = useToast();

   const handleOpenPortal = async () => {
      setLoading(true);
      try {
         const res = await fetch("/api/stripe/portal", { method: "POST" });
         const data = await res.json();
         if (data.url) {
            window.location.href = data.url;
         } else {
            toast({
               title: "Facturación en mantenimiento",
               description: data.error || "El portal de pagos se activará en la versión final.",
               variant: "default"
            });
         }
      } catch (err: any) {
         toast({ title: "Error", description: "No se pudo acceder al portal financiero", variant: "destructive" });
      } finally {
         setLoading(false);
      }
   };

   return (
      <Button 
         onClick={handleOpenPortal}
         disabled={true}
         className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold cursor-not-allowed transition-all shadow-sm"
      >
         <span className="flex items-center gap-2 italic opacity-60"><ShieldCheck className="w-5 h-5 text-slate-400"/> Portal Desactivado </span>
      </Button>
   );
}
