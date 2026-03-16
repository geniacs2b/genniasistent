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
import { createClient as createBrowserClient } from "@/lib/supabaseClient";
import { Image as ImageIcon, Upload, X, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

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

  // States for Image
  const [imagenPath, setImagenPath] = useState(evento?.imagen_formulario_path || "");
  const [imagenAlt, setImagenAlt] = useState(evento?.imagen_formulario_alt || "");
  const [mostrarImagen, setMostrarImagen] = useState(evento?.mostrar_imagen_formulario ?? false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    if (evento?.imagen_formulario_path) {
      const supabase = createBrowserClient();
      const { data: { publicUrl } } = supabase.storage.from('formularios-eventos').getPublicUrl(evento.imagen_formulario_path);
      setPreviewUrl(publicUrl);
    }
  }, [evento?.imagen_formulario_path]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Si es un evento nuevo, necesitamos guardarlo primero o generar un ID temporal. 
    // Para simplificar y seguir las reglas, usaremos el ID si existe, o un timestamp si es nuevo.
    const folderId = evento?.id || 'temp-' + Date.now();
    
    setUploading(true);
    try {
      const supabase = createBrowserClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `header-${Date.now()}.${fileExt}`;
      const filePath = `eventos/${folderId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('formularios-eventos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      setImagenPath(filePath);
      const { data: { publicUrl } } = supabase.storage.from('formularios-eventos').getPublicUrl(filePath);
      setPreviewUrl(publicUrl);
      toast({ title: "Imagen subida", description: "La imagen se ha cargado correctamente." });
    } catch (error: any) {
      toast({ title: "Error al subir", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    if (!imagenPath) return;
    
    setImagenPath("");
    setPreviewUrl(null);
    toast({ title: "Imagen removida", description: "Recuerda guardar los cambios para confirmar." });
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("modalidad", modalidad);
    formData.set("tipo_evento_id", tipoEventoId);
    formData.set("activo", String(activo));
    formData.set("imagen_formulario_path", imagenPath);
    formData.set("imagen_formulario_alt", imagenAlt);
    formData.set("mostrar_imagen_formulario", String(mostrarImagen));

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
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-primary brightness-110"></div>
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
          
          {/* SECCIÓN 4: Personalización Visual (Formulario) */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xl">🎨</span>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Personalización del Formulario Públic</h3>
            </div>

            <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10">
              <CardContent className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Vista Previa / Upload */}
                  <div className="w-full md:w-1/3">
                    <Label className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2 block uppercase tracking-wider">Imagen de Cabecera</Label>
                    <div className="relative group aspect-[16/6] bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
                      {previewUrl ? (
                        <>
                          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button type="button" variant="destructive" size="icon" onClick={removeImage} className="rounded-full shadow-lg">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 px-4 text-center">
                          <ImageIcon className="w-8 h-8 text-slate-400" />
                          <p className="text-xs text-slate-400 font-medium">{uploading ? "Subiendo..." : "No hay imagen seleccionada"}</p>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            disabled={uploading}
                            className="mt-2 text-[10px] h-8 font-bold uppercase tracking-tight bg-white dark:bg-slate-900" 
                            onClick={() => document.getElementById('file-upload')?.click()}
                          >
                            <Upload className="w-3 h-3 mr-1.5" />
                            {uploading ? "Cargando..." : "Subir Imagen"}
                          </Button>
                          <input 
                            id="file-upload" 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleFileUpload} 
                          />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium italic">Recomendado: 1200x400px o similar.</p>
                  </div>

                  {/* Configuración */}
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="img_alt" className="text-sm font-bold text-slate-700 dark:text-slate-300">Texto Alternativo (SEO/Accesibilidad)</Label>
                      <Input 
                        id="img_alt" 
                        value={imagenAlt} 
                        onChange={(e) => setImagenAlt(e.target.value)} 
                        placeholder="Ej. Logo de la convención nacional" 
                        className="bg-white dark:bg-slate-900"
                      />
                    </div>

                    <div className="flex items-center space-x-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
                      <Checkbox 
                        id="show_img" 
                        checked={mostrarImagen} 
                        onCheckedChange={(checked) => setMostrarImagen(checked as boolean)}
                        className="w-5 h-5"
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="show_img" className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer">
                          {mostrarImagen ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                          Mostrar imagen en el formulario público
                        </Label>
                        <p className="text-xs text-slate-500 font-medium">Habilita o deshabilita la visualización de la cabecera en el formulario.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECCIÓN 5: Estado (Solo Edición) */}
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
