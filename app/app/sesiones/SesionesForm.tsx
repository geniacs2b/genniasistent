"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getBogotaDateString, getBogotaDate } from "@/lib/date";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { format } from "date-fns";

interface EventoInfo {
  id: string;
  titulo: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
}

interface SesionesFormProps {
  eventos: EventoInfo[];
  onCreated?: () => void;
}

export function SesionesForm({ eventos, onCreated }: SesionesFormProps) {
  const [eventoId, setEventoId] = useState("");
  const [selectedEvento, setSelectedEvento] = useState<EventoInfo | null>(null);
  const [nombre, setNombre] = useState("");
  const [fechaDate, setFechaDate] = useState<Date | undefined>(undefined);
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  
  const fecha = fechaDate ? format(fechaDate, "yyyy-MM-dd") : "";
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleEventoChange = (id: string) => {
    setEventoId(id);
    const ev = eventos.find(e => e.id === id) ?? null;
    setSelectedEvento(ev);
    // Reset date/time when event changes
    setFechaDate(undefined);
    setHoraInicio("");
    setHoraFin("");
  };

  // Compute min/max dates for the date input
  const minDate = getBogotaDateString(selectedEvento?.fecha_inicio);
  const maxDate = getBogotaDateString(selectedEvento?.fecha_fin);

  const validateBeforeSave = (): string | null => {
    if (!eventoId || !nombre) return "Completa el evento y el nombre.";
    if (!fecha) return "Selecciona una fecha para la sesión.";
    if (selectedEvento) {
      const chosenDay = fecha; // YYYY-MM-DD
      const startDay = getBogotaDateString(selectedEvento.fecha_inicio);
      const endDay = getBogotaDateString(selectedEvento.fecha_fin);

      if (startDay && chosenDay < startDay) {
        return `La fecha no puede ser anterior al inicio del evento (${startDay}).`;
      }
      if (endDay && chosenDay > endDay) {
        return `La fecha no puede ser posterior al fin del evento (${endDay}).`;
      }
      const isFirstDay = startDay === chosenDay;
      const isLastDay = endDay === chosenDay;
      if (isFirstDay && horaInicio && selectedEvento.hora_inicio) {
        if (horaInicio < selectedEvento.hora_inicio) {
          return `La hora de inicio no puede ser anterior a ${selectedEvento.hora_inicio} (hora de inicio del evento).`;
        }
      }
      if (isLastDay && horaFin && selectedEvento.hora_fin) {
        if (horaFin > selectedEvento.hora_fin) {
          return `La hora de fin no puede ser posterior a ${selectedEvento.hora_fin} (hora de fin del evento).`;
        }
      }
      if (horaInicio && horaFin && horaFin <= horaInicio) {
        return "La hora de fin debe ser posterior a la hora de inicio.";
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateBeforeSave();
    if (validationError) {
      toast({ title: "Error de validación", description: validationError, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Server action: propaga tenant_id explícitamente desde el servidor
      const { createSesion } = await import("@/app/actions/sesiones");
      await createSesion({
        evento_id: eventoId,
        nombre,
        fecha: fecha || "",
        hora_inicio: horaInicio || null,
        hora_fin: horaFin || null,
      });
      toast({ title: "Sesión creada exitosamente" });
      setNombre("");
      setFechaDate(undefined);
      setHoraInicio("");
      setHoraFin("");
      onCreated?.();
    } catch (err: any) {
      toast({ title: "Error al guardar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Configuración de Sesión</h3>
        <p className="text-[13px] text-slate-500 font-medium">Define los detalles operativos y temporales para la nueva sesión.</p>
        {selectedEvento?.fecha_inicio && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-xl border border-indigo-100/50 dark:border-indigo-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            <p className="text-[11px] font-bold text-indigo-600/80 dark:text-indigo-400 capitalize tracking-wide">
              {getBogotaDateString(selectedEvento.fecha_inicio)}
              {selectedEvento?.fecha_fin ? ` — ${getBogotaDateString(selectedEvento.fecha_fin)}` : ""}
            </p>
          </div>
        )}
      </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Evento</Label>
            <Select onValueChange={handleEventoChange}>
              <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-100"><SelectValue placeholder="Seleccione evento..." /></SelectTrigger>
              <SelectContent>
                {eventos.map((ev) => (
                  <SelectItem key={ev.id} value={ev.id} className="py-2.5 font-medium">{ev.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Nombre de la sesión</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Sesión 1 – Mañana"
              className="h-12 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-100"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Fecha</Label>
            <input type="hidden" name="fecha" value={fecha} />
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
              <DatePicker 
                date={fechaDate} 
                setDate={setFechaDate} 
                placeholder="Seleccione la fecha"
                className="w-full text-base h-10 border-0 bg-transparent shadow-none font-medium"
                disabled={[
                  ...(selectedEvento?.fecha_inicio ? [{ before: getBogotaDate(selectedEvento.fecha_inicio)! }] : []),
                  ...(selectedEvento?.fecha_fin ? [{ after: getBogotaDate(selectedEvento.fecha_fin)! }] : [])
                ]}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Hora inicio</Label>
              <input type="hidden" name="hora_inicio" value={horaInicio} />
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
                <TimePicker 
                  timeStr={horaInicio} 
                  setTimeStr={setHoraInicio} 
                  placeholder="--:-- AM"
                  className="w-full text-base h-10 border-0 bg-transparent shadow-none font-medium justify-between"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Hora fin</Label>
              <input type="hidden" name="hora_fin" value={horaFin} />
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
                <TimePicker 
                  timeStr={horaFin} 
                  setTimeStr={setHoraFin} 
                  placeholder="--:-- PM"
                  className="w-full text-base h-10 border-0 bg-transparent shadow-none font-medium justify-between"
                />
              </div>
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={loading} className="h-11 px-8 rounded-xl font-bold bg-primary hover:bg-secondary text-primary-foreground shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 w-full sm:w-auto">
              {loading ? "Guardando..." : "Crear Sesión"}
            </Button>
          </div>
        </form>
    </div>
  );
}
