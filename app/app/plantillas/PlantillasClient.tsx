"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Image as ImageIcon, Calendar, Trash2 } from "lucide-react";
import { BUCKET_PLANTILLAS_BASE } from "@/lib/storageConstants";
import { createClient } from "@/lib/supabaseClient";
import CertificateEditor from "@/components/CertificateEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { certificateTemplateService } from "@/services/certificateTemplateService";

export function PlantillasClient({ initialTemplates, events }: { initialTemplates: any[], events: any[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [localEvents, setLocalEvents] = useState(events);
  
  // Sincronizar estado local cuando las props cambien (ej: tras router.refresh())
  useEffect(() => {
    setTemplates(initialTemplates);
    setLocalEvents(events);
  }, [initialTemplates, events]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [initialFields, setInitialFields] = useState<any[]>([]);
  const [evento_id, setEventoId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const BUCKET = BUCKET_PLANTILLAS_BASE;

  const handleUpload = async () => {
    if (!file || !evento_id) {
      toast({ title: "Selecciona un evento y la imagen (PNG o JPG).", variant: "destructive" });
      return;
    }
    setUploading(true);

    const fileName = `${Date.now()}_${file.name}`;
    const { error: upError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (upError) {
      toast({ title: "Error al subir archivo", description: upError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    // Detectar dimensiones con Image y guardar vía server action (propaga tenant_id)
    const img = new Image();
    img.onload = async () => {
      const selectedEvent = events.find(e => e.id === evento_id);

      try {
        // Server action: crea la plantilla con tenant_id explícito y la asocia al evento
        const { createPlantillaCertificado } = await import("@/app/actions/plantillas");
        const tmpl = await createPlantillaCertificado({
          evento_id,
          nombre: selectedEvent?.titulo || "Plantilla sin nombre",
          archivo_base_url: publicUrl,
          ancho_px: img.naturalWidth,
          alto_px: img.naturalHeight,
        });

        toast({ title: "Plantilla asociada correctamente al evento" });

        // Actualizar estados locales para permitir edición inmediata
        setTemplates([tmpl, ...templates]);
        setLocalEvents(prev => prev.map(e => e.id === evento_id ? { ...e, plantilla_certificado_id: tmpl.id } : e));

        setSelectedTemplate(tmpl);
        setEventoId("");
        setFile(null);
        setPreviewUrl(null);

        // Refrescar datos del servidor en segundo plano
        router.refresh();
      } catch (err: any) {
        toast({ title: "Error al guardar la plantilla", description: err.message, variant: "destructive" });
      } finally {
        setUploading(false);
      }
    };
    img.src = publicUrl;
  };

  const handleSelectTemplate = async (tmpl: any) => {
    setSelectedTemplate(tmpl);
    try {
      const fields = await certificateTemplateService.getFieldConfig(tmpl.id);
      setInitialFields(fields);
    } catch (error) {
      console.error("Error fetching fields:", error);
      setInitialFields([]);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta plantilla? Esta acción no se puede deshacer.")) return;
    
    setDeletingId(id);
    try {
      console.log(`Starting deletion for template: ${id}`);
      const { error } = await supabase.rpc('eliminar_plantilla_certificado', { 
        p_plantilla_id: id 
      });
      if (error) throw error;

      console.log(`Successfully deleted template ${id} from DB`);

      // Update local state immediately
      setTemplates(prev => {
        const filtered = prev.filter(t => t.id !== id);
        console.log(`Updated local state. Previous count: ${prev.length}, New count: ${filtered.length}`);
        return filtered;
      });

      setLocalEvents(prev => prev.map(e => e.plantilla_certificado_id === id ? { ...e, plantilla_certificado_id: null } : e));
      
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
        setInitialFields([]);
      }

      toast({ title: "Plantilla eliminada correctamente" });
      
      // Force Next.js to refresh server-side data
      router.refresh();
      
    } catch (err: any) {
      console.error(`Error deleting template ${id}:`, err);
      toast({ title: "Error al eliminar", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-10">
      {/* Upload Form */}
      <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[1.5rem] overflow-hidden max-w-2xl">
        <div className="h-1 w-full bg-gradient-to-r from-primary to-secondary"></div>
        <CardHeader className="pb-4 px-6 pt-6 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Upload className="w-5 h-5 text-primary" />
            Asociar nueva plantilla a Evento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Selecciona el Evento</Label>
            <Select value={evento_id} onValueChange={setEventoId}>
              <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-100 rounded-xl">
                <SelectValue placeholder="Busca un evento..." />
              </SelectTrigger>
              <SelectContent>
                {localEvents.map((ev) => (
                  <SelectItem key={ev.id} value={ev.id} className="py-2.5 font-medium">
                    {ev.titulo} {ev.plantilla_certificado_id ? <span className="text-slate-400 font-normal ml-1">(Ya tiene plantilla)</span> : ""}
                  </SelectItem>
                ))}
                {localEvents.length === 0 && (
                  <div className="p-4 text-sm font-medium text-slate-500 text-center">
                    No hay eventos activos disponibles
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 relative">
            <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Imagen de fondo (PNG o JPG)</Label>
            <div className="relative">
              <Input 
                type="file" 
                accept="image/png,image/jpeg,image/jpg" 
                onChange={handleFileChange}
                className="h-12 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-100 rounded-xl pt-2.5 cursor-pointer file:cursor-pointer file:bg-primary/10 file:text-secondary file:dark:text-primary file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3 file:font-semibold" 
              />
            </div>
          </div>
          {previewUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-2 relative group">
              <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-56 object-contain rounded-lg shadow-sm" />
              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none"></div>
            </div>
          )}
          <Button onClick={handleUpload} disabled={uploading || !file || !evento_id} className="w-full gap-2 h-12 rounded-xl font-bold bg-primary hover:bg-secondary text-primary-foreground shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 mt-2">
            <Upload className="w-4 h-4" />
            {uploading ? "Subiendo..." : "Subir y Asociar al Evento"}
          </Button>
        </CardContent>
      </Card>

      {templates.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Plantillas Guardadas <span className="text-slate-400 dark:text-slate-500 text-base font-medium ml-1">({templates.length})</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {templates.map((tmpl) => {
              const associatedEvent = localEvents.find(e => e.plantilla_certificado_id === tmpl.id);
              
              return (
                <Card
                  key={tmpl.id}
                  className={`group overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-[1.25rem] border ${selectedTemplate?.id === tmpl.id ? "ring-2 ring-primary border-primary/50 shadow-[0_8px_30px_rgba(167,199,58,0.2)]" : "border-slate-200/60 dark:border-slate-800"}`}
                  onClick={() => handleSelectTemplate(tmpl)}
                >
                  <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-slate-800">
                    <img 
                      src={tmpl.archivo_base_url} 
                      alt={tmpl.nombre} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Event Badge Overlay */}
                    {associatedEvent && (
                      <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-extrabold text-secondary dark:text-primary shadow-sm uppercase tracking-wider truncate max-w-[80%] border border-primary/20">
                        {associatedEvent.titulo}
                      </div>
                    )}

                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className={`absolute bottom-3 right-3 h-8 w-8 rounded-full shadow-lg transition-transform duration-300 ${selectedTemplate?.id === tmpl.id ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'}`}
                      disabled={deletingId === tmpl.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(tmpl.id);
                      }}
                    >
                      {deletingId === tmpl.id ? (
                        <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <CardContent className="p-4 bg-white dark:bg-slate-900">
                    <div className="flex flex-col">
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{tmpl.nombre}</p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{tmpl.ancho_px} × {tmpl.alto_px} px</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-20 text-center flex flex-col items-center justify-center border-2 border-dashed rounded-[2rem] border-slate-300/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="h-20 w-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-5">
            <ImageIcon className="w-10 h-10 text-slate-300" />
          </div>
          <p className="text-xl font-bold text-slate-600 dark:text-slate-300">No hay plantillas guardadas</p>
          <p className="text-sm rounded-full text-slate-500 mt-2 font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-1.5 shadow-sm">Sube una imagen y asóciala a un evento para comenzar.</p>
        </div>
      )}

      {selectedTemplate && (
        <CertificateEditor 
          key={selectedTemplate.id}
          template={selectedTemplate} 
          initialFields={initialFields}
          eventoId={localEvents.find(e => e.plantilla_certificado_id === selectedTemplate.id)?.id}
        />
      )}
    </div>
  );
}
