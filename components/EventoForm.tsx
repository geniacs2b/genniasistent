"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createEvento, updateEvento } from "@/app/actions/eventos";
import { toBogotaISO, getBogotaDate, getBogotaDateTime } from "@/lib/date";
import { DateTimePicker } from "@/components/ui/date-time-picker";

interface EventoFormProps {
  evento?: any;
  isEdit?: boolean;
  tiposEvento?: Array<{ id: string; nombre: string }>;
}

export function EventoForm({ evento, isEdit = false, tiposEvento = [] }: EventoFormProps) {
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [modalidad, setModalidad] = useState(evento?.modalidad || "presencial");
  const [tipoEventoId, setTipoEventoId] = useState(evento?.tipo_evento_id || (tiposEvento.length > 0 ? tiposEvento[0].id : ""));
  const [activo, setActivo] = useState(evento?.activo ?? true);
  
  const [fechaInicio, setFechaInicio] = useState<Date | undefined>(getBogotaDateTime(evento?.fecha_inicio, evento?.hora_inicio) || undefined);
  const [fechaFin, setFechaFin] = useState<Date | undefined>(getBogotaDateTime(evento?.fecha_fin, evento?.hora_fin) || undefined);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("modalidad", modalidad);
    formData.set("tipo_evento_id", tipoEventoId);
    formData.set("activo", String(activo));

    try {
      if (isEdit && evento) {
        await updateEvento(evento.id, formData);
        toast({ title: "Evento actualizado correctamente" });
      } else {
        await createEvento(formData);
        toast({ title: "Evento creado correctamente" });
      }
      router.push("/admin/eventos");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <Card className="max-w-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[1.5rem] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-indigo-500 to-sky-400"></div>
      <CardHeader className="px-8 pt-10 pb-6 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/20 text-center sm:text-left">
        <CardTitle className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100">{isEdit ? "Editar Detalles del Evento" : "Crear Nuevo Evento"}</CardTitle>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
          {isEdit ? "Modifica la información general y la configuración del evento." : "Configura un nuevo evento para recibir inscripciones."}
        </p>
      </CardHeader>
      <CardContent className="px-6 py-8 sm:px-10">
        <form onSubmit={handleSubmit} className="space-y-10">
          
          {/* SECCIÓN 1: Información General */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xl">📝</span>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Información General</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 md:col-span-2">
                <Label className="text-base font-semibold text-slate-700 dark:text-slate-300">Título del Evento <span className="text-rose-500">*</span></Label>
                <Input name="titulo" defaultValue={evento?.titulo} required className="h-14 text-lg bg-slate-50 focus:bg-white transition-colors border-slate-200" placeholder="Ej. Taller de Liderazgo" />
              </div>
              
              <div className="space-y-3 md:col-span-2">
                <Label className="text-base font-semibold text-slate-700 dark:text-slate-300">Descripción</Label>
                <Textarea name="descripcion" defaultValue={evento?.descripcion} rows={4} className="text-base bg-slate-50 focus:bg-white transition-colors border-slate-200 resize-none p-4" placeholder="Agrega una descripción detallada del evento..." />
              </div>

              <div className="space-y-3 md:col-span-2">
                <Label className="text-base font-semibold text-slate-700 dark:text-slate-300">Tipo de Evento <span className="text-rose-500">*</span></Label>
                <Select value={tipoEventoId} onValueChange={setTipoEventoId} required>
                  <SelectTrigger className="h-14 text-base bg-slate-50 focus:bg-white transition-colors border-slate-200"><SelectValue placeholder="Seleccione un tipo de evento" /></SelectTrigger>
                  <SelectContent>
                    {tiposEvento.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id} className="text-base py-3">
                        {tipo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Fecha y Ubicación */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xl">📅</span>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Fecha y Ubicación</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-base font-semibold text-slate-700 dark:text-slate-300">Fecha y Hora de Inicio</Label>
                <input type="hidden" name="fecha_inicio" value={fechaInicio ? toBogotaISO(fechaInicio) : ""} />
                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all p-1">
                   <DateTimePicker date={fechaInicio} setDate={setFechaInicio} className="w-full border-0 bg-transparent shadow-none" />
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-base font-semibold text-slate-700 dark:text-slate-300">Fecha y Hora de Fin</Label>
                <input type="hidden" name="fecha_fin" value={fechaFin ? toBogotaISO(fechaFin) : ""} />
                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all p-1">
                  <DateTimePicker date={fechaFin} setDate={setFechaFin} className="w-full border-0 bg-transparent shadow-none" />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold text-slate-700 dark:text-slate-300">Modalidad</Label>
                <Select value={modalidad} onValueChange={setModalidad}>
                  <SelectTrigger className="h-14 text-base bg-slate-50 focus:bg-white transition-colors border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial" className="text-base py-3">Presencial</SelectItem>
                    <SelectItem value="virtual" className="text-base py-3">Virtual</SelectItem>
                    <SelectItem value="híbrido" className="text-base py-3">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold text-slate-700 dark:text-slate-300">Lugar o Enlace</Label>
                <Input name="lugar" defaultValue={evento?.lugar} className="h-14 text-base bg-slate-50 focus:bg-white transition-colors border-slate-200" placeholder="Ej. Auditorio Principal o Enlace de Zoom" />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: Detalles de Aforo */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xl">👥</span>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Configuración de Aforo</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-base font-semibold text-slate-700 dark:text-slate-300">Cupo Máximo</Label>
                <div className="relative">
                  <Input name="cupo_maximo" type="number" min={1} defaultValue={evento?.cupo_maximo} className="h-14 text-base bg-slate-50 focus:bg-white transition-colors border-slate-200 pl-12" placeholder="Dejar en blanco para ilimitado" />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🎟️</span>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-base font-semibold text-slate-700 dark:text-slate-300">Mínimo Sesiones Asistidas (Certificado)</Label>
                <div className="relative">
                  <Input 
                    name="min_sesiones_certificado" 
                    type="number" 
                    min={0} 
                    defaultValue={evento?.min_sesiones_certificado} 
                    className="h-14 text-base bg-slate-50 focus:bg-white transition-colors border-slate-200 pl-12" 
                    placeholder="Ej. 3" 
                  />
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🎓</span>
                </div>
                <p className="text-xs text-slate-500 font-medium ml-1">Número mínimo de sesiones para emitir certificado. Dejar vacío para no exigir mínimo.</p>
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: Estado (Solo Edición) */}
          {isEdit && (
            <div className="space-y-6 pt-2">
               <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-xl">⚙️</span>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Estado del Evento</h3>
              </div>
              <div className="space-y-3 max-w-sm">
                <Label className="text-base font-semibold text-slate-700 dark:text-slate-300">Visibilidad</Label>
                <Select value={String(activo)} onValueChange={(v) => setActivo(v === "true")}>
                  <SelectTrigger className={`h-14 text-base font-bold transition-colors ${activo ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true" className="text-base py-3 font-semibold text-emerald-600">Activo (Visible al público)</SelectItem>
                    <SelectItem value="false" className="text-base py-3 font-semibold text-slate-600">Inactivo (Oculto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-8 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => router.push("/admin/eventos")} className="w-full sm:w-auto h-14 px-8 text-base font-bold border-slate-200 text-slate-600 hover:bg-slate-50">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto h-14 px-10 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95">
              {loading ? "Guardando..." : isEdit ? "Guardar Cambios" : "Crear Evento"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
