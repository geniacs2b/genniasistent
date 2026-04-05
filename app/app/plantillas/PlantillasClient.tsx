"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Upload, Image as ImageIcon, Trash2, Eye, Edit3, CheckCircle2, CloudUpload, FileImage, Plus, ArrowRight, Maximize2 } from "lucide-react";
import { BUCKET_PLANTILLAS_BASE } from "@/lib/storageConstants";
import { createClient } from "@/lib/supabaseClient";
import CertificateEditor from "@/components/CertificateEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { certificateTemplateService } from "@/services/certificateTemplateService";
import { cn } from "@/lib/utils";

export function PlantillasClient({ initialTemplates, events }: { initialTemplates: any[], events: any[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [localEvents, setLocalEvents] = useState(events);
  
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
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    processFile(f);
  };

  const processFile = (f: File) => {
    if (!f.type.startsWith('image/')) {
       toast({ title: "Archivo no válido", description: "Por favor sube una imagen PNG o JPG.", variant: "destructive" });
       return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  }, []);

  const handleUpload = async () => {
    if (!file || !evento_id) {
      toast({ title: "Datos incompletos", description: "Selecciona un evento y sube una imagen.", variant: "destructive" });
      return;
    }
    setUploading(true);

    const BUCKET = BUCKET_PLANTILLAS_BASE;
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

    const img = new Image();
    img.onload = async () => {
      const selectedEvent = events.find(e => e.id === evento_id);

      try {
        const { createPlantillaCertificado } = await import("@/app/actions/plantillas");
        const tmpl = await createPlantillaCertificado({
          evento_id,
          nombre: selectedEvent?.titulo || "Plantilla sin nombre",
          archivo_base_url: publicUrl,
          ancho_px: img.naturalWidth,
          alto_px: img.naturalHeight,
        });

        toast({ title: "Diseño creado con éxito", description: "La plantilla ha sido asociada al evento." });

        setTemplates([tmpl, ...templates]);
        setLocalEvents(prev => prev.map(e => e.id === evento_id ? { ...e, plantilla_certificado_id: tmpl.id } : e));

        setSelectedTemplate(tmpl);
        setEventoId("");
        setFile(null);
        setPreviewUrl(null);
        router.refresh();
      } catch (err: any) {
        toast({ title: "Error al guardar", description: err.message, variant: "destructive" });
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
      // Smooth scroll to editor if it's rendered below
      setTimeout(() => {
          document.getElementById('certificate-editor-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error("Error fetching fields:", error);
      setInitialFields([]);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Seguro que deseas eliminar esta plantilla?")) return;
    
    setDeletingId(id);
    try {
      const { error } = await supabase.rpc('eliminar_plantilla_certificado', { p_plantilla_id: id });
      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== id));
      setLocalEvents(prev => prev.map(e => e.plantilla_certificado_id === id ? { ...e, plantilla_certificado_id: null } : e));
      
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
        setInitialFields([]);
      }

      toast({ title: "Plantilla eliminada" });
      router.refresh();
    } catch (err: any) {
      toast({ title: "Error al eliminar", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-16">
      {/* 2-Column Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Left: Configuration Card */}
        <div className="lg:col-span-5 space-y-6">
           <Card className="shadow-[0_8px_40px_rgb(0,0,0,0.03)] border border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2rem] overflow-hidden group">
            <div className="h-2 w-full bg-gradient-to-r from-indigo-500 to-indigo-700"></div>
            <CardHeader className="pb-6 px-10 pt-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 transition-transform group-hover:rotate-12 duration-500">
                        <Plus className="w-6 h-6" />
                    </div>
                   <CardTitle className="text-2xl font-black italic text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                    Nueva plantilla
                   </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-8 px-10 pb-10">
                <div className="space-y-4">
                    <Label className="text-[11px] uppercase tracking-[0.2em] font-black text-slate-400">Asociar a Evento</Label>
                    <Select value={evento_id} onValueChange={setEventoId}>
                        <SelectTrigger className="h-14 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 transition-all italic">
                            <SelectValue placeholder="Selecciona un evento..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-200 shadow-2xl">
                            {localEvents.map((ev) => (
                                <SelectItem key={ev.id} value={ev.id} className="py-3 px-4 font-bold cursor-pointer">
                                    {ev.titulo} {ev.plantilla_certificado_id ? <span className="text-slate-300 ml-2 font-normal italic">(Reemplazará actual)</span> : ""}
                                </SelectItem>
                            ))}
                            {localEvents.length === 0 && (
                                <div className="p-4 text-sm font-medium text-slate-500 text-center">No hay eventos activos</div>
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-4">
                    <Label className="text-[11px] uppercase tracking-[0.2em] font-black text-slate-400">Archivo de Diseño</Label>
                    
                    {/* DROPZONE */}
                    <div 
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "relative group/dropzone cursor-pointer min-h-[180px] rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all duration-500 overflow-hidden",
                            isDragging ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 scale-[0.99] shadow-inner" : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-indigo-400 hover:bg-white dark:hover:bg-slate-900"
                        )}
                    >
                        <Input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            accept="image/png,image/jpeg,image/jpg" 
                            onChange={handleFileChange} 
                        />

                        {file ? (
                          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-500 px-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-2">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-full italic">{file.name}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mt-1">Listo para subir</p>
                          </div>
                        ) : (
                          <>
                            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 group-hover/dropzone:scale-110 group-hover/dropzone:text-indigo-500 transition-all duration-500">
                                <CloudUpload className="w-8 h-8" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-black text-slate-800 dark:text-slate-100 italic">Arrastra tu diseño o haz clic</p>
                                <p className="text-xs font-semibold text-slate-400 mt-1">Formatos PNG o JPG recomendados</p>
                            </div>
                          </>
                        )}
                        
                        {file && (
                           <div className="absolute bottom-4 opacity-0 group-hover/dropzone:opacity-100 transition-opacity">
                              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800 shadow-sm underline">Hacer clic para cambiar</span>
                           </div>
                        )}
                    </div>
                </div>

                <Button 
                    onClick={handleUpload} 
                    disabled={uploading || !file || !evento_id} 
                    className="w-full h-14 rounded-2xl font-black text-base bg-indigo-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/10 transition-all hover:-translate-y-1 hover:shadow-indigo-500/20 active:scale-95 italic gap-3"
                >
                    <ImageIcon className="w-5 h-5" />
                    {uploading ? "Creando..." : "Crear Plantilla"}
                </Button>
            </CardContent>
           </Card>
        </div>

        {/* Right: Visual Preview */}
        <div className="lg:col-span-7 flex flex-col h-full">
            <div className="flex items-center justify-between px-4 mb-6">
                 <h2 className="text-2xl font-black italic text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-3">
                    Vista previa
                 </h2>
                 <Badge variant="outline" className="border-slate-200 text-slate-400 rounded-full font-black px-4 py-1.5 text-[10px] tracking-widest">REAL-TIME MONITOR</Badge>
            </div>

            <Card className="flex-1 min-h-[400px] flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-inner rounded-[2.5rem] overflow-hidden relative group/preview">
                {previewUrl ? (
                    <div className="relative animate-in fade-in zoom-in-95 duration-700 shadow-2xl rounded-lg overflow-hidden max-w-full">
                        <img src={previewUrl} alt="Preview" className="max-w-full max-h-[500px] object-contain" />
                        <div className="absolute inset-0 border-2 border-white/20 pointer-events-none rounded-lg"></div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center space-y-6 opacity-40 group-hover/preview:opacity-60 transition-opacity">
                         <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 shadow-inner">
                            <FileImage className="w-10 h-10" />
                        </div>
                        <div>
                             <p className="text-xl font-black italic text-slate-800 dark:text-slate-200 capitalize tracking-tight">Tu diseño aparecerá aquí</p>
                             <p className="text-sm font-bold text-slate-400 mt-1 max-w-[200px]">Carga una imagen a la izquierda para visualizarla.</p>
                        </div>
                    </div>
                )}
            </Card>
        </div>
      </div>

      {/* Templates Gallery */}
      <div className="space-y-8 pt-8">
        <div className="flex items-center gap-3 px-2">
          <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <ImageIcon className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-black italic text-slate-800 dark:text-slate-100">
            Plantillas Guardadas <span className="text-slate-400 font-normal ml-2 tracking-normal">({templates.length})</span>
          </h2>
        </div>

        {templates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {templates.map((tmpl) => {
              const associatedEvent = localEvents.find(e => e.plantilla_certificado_id === tmpl.id);
              const isSelected = selectedTemplate?.id === tmpl.id;
              
              return (
                <Card
                  key={tmpl.id}
                  className={cn(
                    "group relative overflow-hidden cursor-pointer transition-all duration-700 bg-white dark:bg-slate-900 rounded-[2rem] border overflow-hidden",
                    isSelected ? "ring-2 ring-indigo-500 border-indigo-500 shadow-2xl -translate-y-2" : "border-slate-200/60 dark:border-slate-800 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-xl hover:-translate-y-2"
                  )}
                  onClick={() => handleSelectTemplate(tmpl)}
                >
                  <div className="relative aspect-video bg-slate-100 overflow-hidden border-b border-slate-100 dark:border-slate-800">
                    <img 
                      src={tmpl.archivo_base_url} 
                      alt={tmpl.nombre} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                    
                    {/* Action Overlay */}
                    <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center gap-3">
                        <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-10 w-10 rounded-xl bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg scale-90 group-hover:scale-100 transition-transform duration-500"
                            onClick={(e) => { e.stopPropagation(); window.open(tmpl.archivo_base_url, '_blank'); }}
                        >
                            <Eye className="w-5 h-5" />
                        </Button>
                        <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-10 w-10 rounded-xl bg-white text-emerald-600 hover:bg-emerald-50 shadow-lg delay-75 scale-90 group-hover:scale-100 transition-transform duration-500"
                            onClick={() => handleSelectTemplate(tmpl)}
                        >
                            <Edit3 className="w-5 h-5" />
                        </Button>
                        <Button 
                            variant="destructive" 
                            size="icon" 
                            className="h-10 w-10 rounded-xl bg-rose-500 text-white hover:bg-rose-600 shadow-lg delay-150 scale-90 group-hover:scale-100 transition-transform duration-500"
                            disabled={deletingId === tmpl.id}
                            onClick={(e) => handleDelete(tmpl.id, e)}
                        >
                            <Trash2 className="w-5 h-5" />
                        </Button>
                    </div>
                  </div>
                  <CardContent className="p-5 flex flex-col space-y-3">
                    <h3 className="font-black text-slate-800 dark:text-slate-100 truncate italic">{tmpl.nombre}</h3>
                    <div className="flex items-center justify-between">
                        {associatedEvent ? (
                            <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest max-w-[120px] truncate">
                                {associatedEvent.titulo}
                            </Badge>
                        ) : (
                            <span className="text-[10px] text-slate-400 font-bold italic">Sin evento</span>
                        )}
                        <span className="text-[10px] font-black text-slate-400 tracking-wider">{tmpl.ancho_px}×{tmpl.alto_px} PX</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="py-24 text-center flex flex-col items-center justify-center border-2 border-dashed rounded-[3rem] border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm">
            <div className="h-20 w-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <ImageIcon className="w-10 h-10 text-slate-200" />
            </div>
            <p className="text-xl font-black text-slate-700 italic">No hay diseños configurados</p>
            <p className="text-sm font-medium text-slate-400 mt-2">Personaliza tu primer certificado utilizando el panel superior.</p>
          </div>
        )}
      </div>

      {/* Editor Section */}
      {selectedTemplate && (
        <div id="certificate-editor-section" className="pt-20 animate-in fade-in slide-in-from-bottom-10 duration-1000">
           <div className="mb-10 px-4">
               <h2 className="text-3xl font-black italic text-slate-900 flex items-center gap-4">
                  <ArrowRight className="w-8 h-8 text-indigo-500" />
                  Editor de Campos Dinámicos
               </h2>
           </div>
           <CertificateEditor 
            key={selectedTemplate.id}
            template={selectedTemplate} 
            initialFields={initialFields}
            eventoId={localEvents.find(e => e.plantilla_certificado_id === selectedTemplate.id)?.id}
            />
        </div>
      )}
    </div>
  );
}
