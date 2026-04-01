"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, X } from "lucide-react";

type WompiStatus = "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | "PENDING" | null;

interface PaymentResultBannerProps {
  status: WompiStatus;
  reference: string | null;
}

const CONFIG: Record<NonNullable<WompiStatus>, {
  icon: React.ReactNode;
  title: string;
  desc: string;
  classes: string;
}> = {
  APPROVED: {
    icon:    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    title:   "¡Pago aprobado!",
    desc:    "Tu plan ha sido actualizado. Los cambios pueden tardar unos minutos en verse reflejados.",
    classes: "bg-emerald-50 border-emerald-200 text-emerald-900",
  },
  PENDING: {
    icon:    <Clock className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />,
    title:   "Pago en proceso",
    desc:    "Tu transacción está siendo procesada. Te notificaremos cuando se confirme.",
    classes: "bg-amber-50 border-amber-200 text-amber-900",
  },
  DECLINED: {
    icon:    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    title:   "Pago rechazado",
    desc:    "El pago no fue aprobado. Verifica los datos de tu tarjeta e intenta de nuevo.",
    classes: "bg-rose-50 border-rose-200 text-rose-900",
  },
  VOIDED:  {
    icon:    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    title:   "Pago anulado",
    desc:    "La transacción fue anulada. No se realizó ningún cargo.",
    classes: "bg-rose-50 border-rose-200 text-rose-900",
  },
  ERROR:   {
    icon:    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    title:   "Error en el pago",
    desc:    "Ocurrió un error durante el procesamiento. Intenta de nuevo o contacta soporte.",
    classes: "bg-rose-50 border-rose-200 text-rose-900",
  },
};

export function PaymentResultBanner({ status, reference }: PaymentResultBannerProps) {
  const [visible, setVisible] = useState(true);

  if (!status || !visible) return null;

  const cfg = CONFIG[status];
  if (!cfg) return null;

  return (
    <div className={`flex items-start gap-4 p-4 rounded-2xl border ${cfg.classes} relative`}>
      {cfg.icon}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">{cfg.title}</p>
        <p className="text-sm font-medium mt-0.5 opacity-80">{cfg.desc}</p>
        {reference && (
          <p className="text-[11px] font-mono mt-1.5 opacity-50">Referencia: {reference}</p>
        )}
      </div>
      <button
        onClick={() => setVisible(false)}
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
