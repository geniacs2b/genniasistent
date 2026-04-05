"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Save, Plus, Trash2, Eye, AlignCenter, AlignHorizontalSpaceAround, 
  AlignVerticalSpaceAround, Grid3X3, Type, LayoutTemplate, Palette, 
  ScanLine, EyeOff, Move
} from "lucide-react";
import { certificateTemplateService } from "@/services/certificateTemplateService";
import { cn } from "@/lib/utils";

const FIELD_TYPES = [
  { label: "Nombre Completo",              value: "nombre_completo"       },
  { label: "Nombres",                      value: "nombres"               },
  { label: "Apellidos",                    value: "apellidos"             },
  { label: "Número de Documento",          value: "numero_documento"      },
  { label: "Tipo de Documento",            value: "tipo_documento"        },
  { label: "Nombre del Evento",            value: "nombre_evento"         },
  { label: "Fecha de Emisión",             value: "fecha_emision"         },
  { label: "Fecha de Inicio del Evento",   value: "fecha_inicio_evento"   },
  { label: "Fecha de Fin del Evento",      value: "fecha_fin_evento"      },
  { label: "Código de Certificado",        value: "codigo_certificado"    },
  { label: "Código QR de Verificación",   value: "qr_code"               },
];

const FONT_FAMILIES = [
  "Arial", "Georgia", "Times New Roman", "Verdana", "Courier New",
  "Helvetica", "Palatino", "Tahoma", "Trebuchet MS",
  "Montserrat", "Open Sans", "Lato", "Raleway",
  "Playfair Display", "Oswald",
];

const COLORS_PRESET = [
  "#000000", "#1E293B", "#334155", "#64748B", "#94A3B8", "#FFFFFF",
  "#EF4444", "#F97316", "#F59E0B", "#10B981", "#3B82F6", "#6366F1",
  "#8B5CF6", "#D946EF", "#F43F5E", "#14B8A6", "#84CC16", "#06B6D4"
];

const PREVIEW_VALUES: Record<string, string> = {
  nombre_completo:     "María Alejandra",
  nombres:             "María Alejandra",
  apellidos:           "González Martínez",
  numero_documento:    "1.234.567.890",
  tipo_documento:      "CC",
  nombre_evento:       "XIV Congreso Internacional de Innovación y Tecnología Educativa",
  fecha_emision:       "15 de marzo de 2026",
  fecha_inicio_evento: "13 de marzo de 2026",
  fecha_fin_evento:    "15 de marzo de 2026",
  codigo_certificado:  "CERT-2026-001234",
  qr_code:             "[QR]",
};

const TEST_NAMES = {
  corto: "Ana Ruiz",
  medio: "Laura Camila Prada",
  largo: "María Fernanda Del Pilar Rodríguez",
};

interface Campo {
  id: string;
  tipo_campo: string;
  etiqueta: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  font_family: string;
  font_size: number;
  font_weight: string;
  text_align: string;
  color: string;
  line_height: number;
  letter_spacing: number;
  auto_fit: boolean;
  visible: boolean;
  orden?: number;
}

interface CertificateEditorProps {
  template: {
    id: string;
    nombre: string;
    archivo_base_url: string;
    ancho_px: number;
    alto_px: number;
  };
  initialFields: Campo[];
  eventoId?: string;
}

const SNAP_THRESHOLD = 5;

// --- Subcomponent: Advanced Color Picker --- //
function ColorPicker({ value, onChange }: { value: string, onChange: (v: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left font-normal h-10 px-3 flex gap-3 shadow-sm border-slate-200">
          <div className="w-6 h-6 rounded-md border border-slate-200 shadow-inner" style={{ backgroundColor: value }} />
          <span className="font-mono text-xs uppercase text-slate-600">{value}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 rounded-2xl shadow-xl border-slate-200 z-50">
        <div className="space-y-4">
           <div>
               <Label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">Custom HEX</Label>
               <div className="flex gap-2">
                 <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">#</span>
                    <Input 
                        value={value.replace('#', '')} 
                        onChange={(e) => onChange(`#${e.target.value}`)} 
                        maxLength={6}
                        className="pl-7 font-mono uppercase text-sm h-10" 
                    />
                 </div>
                 <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shadow-inner shrink-0 cursor-pointer">
                    <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-[-10px] w-20 h-20 cursor-pointer" />
                 </div>
               </div>
           </div>
           <div>
              <Label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">Paleta Corporativa</Label>
              <div className="grid grid-cols-6 gap-2">
                 {COLORS_PRESET.map(color => (
                     <button
                        key={color}
                        onClick={() => onChange(color)}
                        className={cn(
                            "w-8 h-8 rounded-full border shadow-sm transition-transform hover:scale-110 active:scale-95",
                            value.toLowerCase() === color.toLowerCase() ? "border-indigo-500 ring-2 ring-indigo-500/30 ring-offset-1" : "border-slate-200"
                        )}
                        style={{ backgroundColor: color }}
                        title={color}
                     />
                 ))}
              </div>
           </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function CertificateEditor({ template, initialFields, eventoId }: CertificateEditorProps) {
  const [campos, setCampos] = useState<Campo[]>([]);
  const [dbTipoCampos, setDbTipoCampos] = useState<Set<string>>(new Set());

  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [resizing, setResizing] = useState<{ id: string, handle: string } | null>(null);
  const [activeGuides, setActiveGuides] = useState<{ axis: 'x' | 'y', pos: number, isCenter?: boolean, length?: number }[]>([]);
  
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testName, setTestName] = useState(TEST_NAMES.medio);
  const [showGuides, setShowGuides] = useState(true);
  const [imgNatural, setImgNatural] = useState({ w: template.ancho_px || 800, h: template.alto_px || 600 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, fieldX: 0, fieldY: 0, width: 0, height: 0 });
  const { toast } = useToast();
  const supabase = createClient();

  // ── Carga inicial (Persistencia Estricta) ──────────────────────────────
  useEffect(() => {
    if (initialFields && initialFields.length > 0) {
      const normalized = initialFields.map((d) => ({ ...d, id: d.id || `db-${Date.now()}` }));
      setCampos(normalized);
      setDbTipoCampos(new Set(normalized.map((d) => d.tipo_campo)));
      return;
    }

    supabase
      .from("plantilla_campos_certificado")
      .select("*")
      .eq("plantilla_certificado_id", template.id)
      .order("orden", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const normalized = data.map((d) => ({ ...d, id: d.id || `db-${Date.now()}` }));
          setCampos(normalized);
          setDbTipoCampos(new Set(normalized.map((d) => d.tipo_campo)));
        }
      });
  }, [template.id]); // Solo re-run si cambia el template, ignora renders iterativos

  // ── Modificadores de Estado ──────────────────────────────────────────────
  const addCampo = () => {
    const newCampo: Campo = {
      id: `local-${Date.now()}`,
      tipo_campo: "nombre_completo",
      etiqueta: "Nombre Completo",
      pos_x: Math.round(imgNatural.w / 2 - 200),
      pos_y: Math.round(imgNatural.h / 2 - 30),
      width: 400,
      height: 60,
      font_family: "Montserrat",
      font_size: 28,
      font_weight: "bold",
      text_align: "center",
      color: "#000000",
      line_height: 1.2,
      letter_spacing: 0,
      auto_fit: true,
      visible: true,
      orden: campos.length,
    };
    setCampos([...campos, newCampo]);
    setSelected(newCampo.id);
  };

  const removeCampo = (id: string) => {
    setCampos(campos.filter((c) => c.id !== id));
    if (selected === id) setSelected(null);
  };

  const updateCampo = (id: string, patch: Partial<Campo>) => {
    setCampos(campos.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  // ── Drag & Drop y Snap Avanzado (Magnético) ──────────────────────────────
  const onMouseDownDrag = (e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return; // Solo click izq
    e.preventDefault();
    e.stopPropagation();
    const campo = campos.find((c) => c.id === id);
    if (!campo) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const scaleX = imgNatural.w / rect.width;
    const scaleY = imgNatural.h / rect.height;
    
    dragStartRef.current = {
      mouseX: (e.clientX - rect.left) * scaleX,
      mouseY: (e.clientY - rect.top) * scaleY,
      fieldX: campo.pos_x,
      fieldY: campo.pos_y,
      width: campo.width,
      height: campo.height
    };
    
    setDragging(id);
    setSelected(id);
  };

  const onMouseDownResize = (e: React.MouseEvent, id: string, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    const campo = campos.find((c) => c.id === id);
    if (!campo) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const scaleX = imgNatural.w / rect.width;
    const scaleY = imgNatural.h / rect.height;

    dragStartRef.current = {
      mouseX: (e.clientX - rect.left) * scaleX,
      mouseY: (e.clientY - rect.top) * scaleY,
      fieldX: campo.pos_x,
      fieldY: campo.pos_y,
      width: campo.width,
      height: campo.height
    };

    setResizing({ id, handle });
    setSelected(id);
  };

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging && !resizing) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = imgNatural.w / rect.width;
    const scaleY = imgNatural.h / rect.height;
    
    const currentMouseX = (e.clientX - rect.left) * scaleX;
    const currentMouseY = (e.clientY - rect.top) * scaleY;
    
    const deltaX = currentMouseX - dragStartRef.current.mouseX;
    const deltaY = currentMouseY - dragStartRef.current.mouseY;

    if (dragging) {
      let newX = Math.round(dragStartRef.current.fieldX + deltaX);
      let newY = Math.round(dragStartRef.current.fieldY + deltaY);
      const width = dragStartRef.current.width;
      const height = dragStartRef.current.height;

      // Smart Guides / Snap Logic
      let guides: { axis: 'x' | 'y', pos: number, isCenter?: boolean }[] = [];
      const centerX = newX + width / 2;
      const centerY = newY + height / 2;

      // Canvas centers
      const canvasCenterX = imgNatural.w / 2;
      const canvasCenterY = imgNatural.h / 2;

      if (Math.abs(centerX - canvasCenterX) < SNAP_THRESHOLD) {
          newX = canvasCenterX - width / 2;
          guides.push({ axis: 'x', pos: canvasCenterX, isCenter: true });
      }
      if (Math.abs(centerY - canvasCenterY) < SNAP_THRESHOLD) {
          newY = canvasCenterY - height / 2;
          guides.push({ axis: 'y', pos: canvasCenterY, isCenter: true });
      }

      // Edge snapping (canvas edges)
      if (Math.abs(newX) < SNAP_THRESHOLD) { newX = 0; guides.push({ axis: 'x', pos: 0 }); }
      if (Math.abs(newY) < SNAP_THRESHOLD) { newY = 0; guides.push({ axis: 'y', pos: 0 }); }
      if (Math.abs(newX + width - imgNatural.w) < SNAP_THRESHOLD) { newX = imgNatural.w - width; guides.push({ axis: 'x', pos: imgNatural.w }); }
      if (Math.abs(newY + height - imgNatural.h) < SNAP_THRESHOLD) { newY = imgNatural.h - height; guides.push({ axis: 'y', pos: imgNatural.h }); }

      // Snap with other elements
      campos.forEach(c => {
         if (c.id === dragging || !c.visible) return;
         // Center X
         if (Math.abs(centerX - (c.pos_x + c.width/2)) < SNAP_THRESHOLD) {
            newX = (c.pos_x + c.width/2) - width/2;
            guides.push({ axis: 'x', pos: c.pos_x + c.width/2 });
         }
         // Center Y
         if (Math.abs(centerY - (c.pos_y + c.height/2)) < SNAP_THRESHOLD) {
            newY = (c.pos_y + c.height/2) - height/2;
            guides.push({ axis: 'y', pos: c.pos_y + c.height/2 });
         }
      });

      setActiveGuides(guides);
      updateCampo(dragging, { pos_x: Math.max(0, newX), pos_y: Math.max(0, newY) });
    }

    if (resizing) {
       const start = dragStartRef.current;
       let newX = start.fieldX;
       let newY = start.fieldY;
       let newW = start.width;
       let newH = start.height;

       if (resizing.handle.includes('e')) newW = Math.max(20, start.width + deltaX);
       if (resizing.handle.includes('s')) newH = Math.max(20, start.height + deltaY);
       if (resizing.handle.includes('w')) {
           newW = Math.max(20, start.width - deltaX);
           if (newW > 20) newX = start.fieldX + deltaX;
       }
       if (resizing.handle.includes('n')) {
           newH = Math.max(20, start.height - deltaY);
           if (newH > 20) newY = start.fieldY + deltaY;
       }

       updateCampo(resizing.id, { 
           pos_x: Math.round(newX), 
           pos_y: Math.round(newY), 
           width: Math.round(newW), 
           height: Math.round(newH) 
       });
    }

  }, [dragging, resizing, imgNatural, campos]); // eslint-disable-line react-hooks/exhaustive-deps

  const onMouseUp = () => {
    setDragging(null);
    setResizing(null);
    setActiveGuides([]);
  };

  // ── Sincronización Base de Datos ──────────────────────────────────────────
  const handleSave = async () => {
    if (!eventoId) {
      toast({ title: "Sin evento asociado", description: "No hay evento vinculado.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const currentTypes = new Set(campos.map((c) => c.tipo_campo));
      const typesToDelete = Array.from(dbTipoCampos).filter((t) => !currentTypes.has(t));

      if (typesToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("plantilla_campos_certificado")
          .delete()
          .eq("plantilla_certificado_id", template.id)
          .in("tipo_campo", typesToDelete);
        if (deleteError) throw deleteError;
      }

      for (let i = 0; i < campos.length; i++) {
        await certificateTemplateService.saveFieldConfig(eventoId, { ...campos[i], orden: i });
      }

      setDbTipoCampos(currentTypes);
      toast({ title: "Diseño guardado", description: "Configuración sincronizada exitosamente." });
    } catch (error: any) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const selectedCampo = campos.find((c) => c.id === selected);

  return (
    <div className="space-y-6" onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-black italic text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-indigo-500" />
            Workspace de Edición
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className={cn("gap-2 shadow-sm", showGuides ? "bg-indigo-50/50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800" : "")} onClick={() => setShowGuides(!showGuides)}>
            <ScanLine className="w-4 h-4" /> Guías: {showGuides ? "ON" : "OFF"}
          </Button>
          <Button variant={previewMode ? "default" : "outline"} className="gap-2 shadow-sm" onClick={() => { setPreviewMode(!previewMode); setSelected(null); }}>
            {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {previewMode ? "Salir de Preview" : "Modo Preview"}
          </Button>
          <Button className="gap-2 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={addCampo} disabled={previewMode}>
            <Plus className="w-4 h-4" /> Texto
          </Button>
          <Button className="gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white font-black italic" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? "Grabando..." : "Guardar Diseño"}
          </Button>
        </div>
      </div>

      <div className="flex gap-8 flex-col lg:flex-row items-start">
        {/* CANVAS WORKSPACE */}
        <div className="flex-1 min-w-0 bg-slate-100/50 dark:bg-slate-900/50 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-inner relative overflow-hidden">
          <div
            ref={canvasRef}
            className="relative bg-white shadow-[0_20px_60px_rgb(0,0,0,0.05)] select-none border border-slate-200 dark:border-slate-700"
            style={{ width: '100%', maxWidth: '900px', aspectRatio: `${imgNatural.w} / ${imgNatural.h}` }}
            onMouseMove={onMouseMove}
            onMouseDown={() => { if(!previewMode) setSelected(null) }}
          >
            <img
              src={template.archivo_base_url}
              alt="Fondo de la plantilla"
              className="w-full h-full object-contain pointer-events-none"
              onLoad={(e) => setImgNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              draggable={false}
            />

            {/* Smart Guides Rendering */}
            {!previewMode && showGuides && activeGuides.map((guide, i) => {
              const rect = canvasRef.current?.getBoundingClientRect();
              const scaleX = rect ? rect.width / imgNatural.w : 1;
              const scaleY = rect ? rect.height / imgNatural.h : 1;
              
              if (guide.axis === 'x') {
                return <div key={`gx-${i}`} className="absolute top-0 bottom-0 border-l-[1.5px] border-emerald-500/80 z-40 pointer-events-none" style={{ left: guide.pos * scaleX }} />
              } else {
                return <div key={`gy-${i}`} className="absolute left-0 right-0 border-t-[1.5px] border-emerald-500/80 z-40 pointer-events-none" style={{ top: guide.pos * scaleY }} />
              }
            })}

            {/* Fields Selection & Rendering */}
            {campos.filter((c) => c.visible).map((campo) => {
              const containerRect = canvasRef.current?.getBoundingClientRect();
              const scaleX = containerRect ? containerRect.width / imgNatural.w : 1;
              const scaleY = containerRect ? containerRect.height / imgNatural.h : 1;
              const isSelected = selected === campo.id && !previewMode;

              return (
                <div
                  key={campo.id}
                  className={cn(
                    "absolute flex items-center overflow-visible", // Changed from overflow-hidden to allow handles outside
                    isSelected ? "outline outline-[1.5px] outline-indigo-500 shadow-2xl z-20" : "hover:outline hover:outline-[1px] hover:outline-indigo-400 border border-transparent hover:border-slate-300 z-10",
                    previewMode && "outline-none hover:outline-none shadow-none bg-transparent border-transparent"
                  )}
                  style={{
                    left: campo.pos_x * scaleX,
                    top: campo.pos_y * scaleY,
                    width: campo.width * scaleX,
                    height: campo.height * scaleY,
                    justifyContent: campo.text_align === "center" ? "center" : campo.text_align === "right" ? "flex-end" : "flex-start",
                    cursor: previewMode ? 'default' : 'move'
                  }}
                  onMouseDown={(e) => !previewMode && onMouseDownDrag(e, campo.id)}
                >
                  <span
                    className={cn("px-1 flex items-center h-full w-full", previewMode ? "" : "pointer-events-none overflow-hidden")}
                    style={{
                      fontFamily: campo.font_family,
                      fontSize: Math.max(8, campo.font_size * scaleX),
                      fontWeight: campo.font_weight,
                      color: campo.color,
                      lineHeight: campo.line_height,
                      letterSpacing: campo.letter_spacing,
                      textAlign: campo.text_align as any,
                      display: "flex", // Keep display flex, but ensure text overflows hidden within this span
                    }}
                  >
                    {previewMode || campo.tipo_campo === "nombre_completo"
                      ? (
                        campo.tipo_campo === "nombre_completo" ? testName :
                        PREVIEW_VALUES[campo.tipo_campo] || campo.etiqueta
                      )
                      : <span className="opacity-90">{campo.etiqueta}</span>}
                  </span>

                  {/* Resize Handles (Only when selected) */}
                  {isSelected && (
                     <>
                       {/* Handles configuration: nw, ne, sw, se */}
                       {['nw', 'ne', 'sw', 'se'].map(handle => (
                         <div 
                           key={handle}
                           className="absolute bg-white border border-indigo-600 z-[100] hover:bg-indigo-100" // Increased z-index
                           style={{
                             width: '8px',
                             height: '8px',
                             cursor: `${handle}-resize`,
                             top: handle.includes('n') ? -4 : 'auto',
                             bottom: handle.includes('s') ? -4 : 'auto',
                             left: handle.includes('w') ? -4 : 'auto',
                             right: handle.includes('e') ? -4 : 'auto',
                             borderRadius: '1px' // Slight rounding, square looks more pro
                           }}
                           onMouseDown={(e) => onMouseDownResize(e, campo.id, handle)}
                         />
                       ))}
                       {/* Side handles */}
                       {['n', 's', 'e', 'w'].map(handle => (
                         <div 
                           key={handle}
                           className="absolute z-[90]"
                           style={{
                             cursor: handle === 'n' || handle === 's' ? 'ns-resize' : 'ew-resize',
                             top: handle === 'n' ? -3 : handle === 's' ? 'auto' : '10%',
                             bottom: handle === 's' ? -3 : handle === 'n' ? 'auto' : '10%',
                             left: handle === 'w' ? -3 : handle === 'e' ? 'auto' : '10%',
                             right: handle === 'e' ? -3 : handle === 'w' ? 'auto' : '10%',
                             width: handle === 'e' || handle === 'w' ? 6 : '80%',
                             height: handle === 'n' || handle === 's' ? 6 : '80%',
                             backgroundColor: 'transparent' // Invisible hit area
                           }}
                           onMouseDown={(e) => onMouseDownResize(e, campo.id, handle)}
                         />
                       ))}
                     </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="absolute bottom-4 right-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-800">
             Canvas: {imgNatural.w}x{imgNatural.h}
          </div>
        </div>

        {/* PROPERTY PANEL (RIGHT SIDE) */}
        {selectedCampo && !previewMode ? (
          <div className="w-full lg:w-[380px] shrink-0 space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
             
             {/* General Info Card */}
             <Card className="rounded-3xl border-slate-200/60 shadow-lg overflow-hidden relative">
               <div className="absolute top-0 right-0 p-4 z-10">
                 <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 rounded-full bg-white shadow-sm" onClick={() => removeCampo(selectedCampo.id)}>
                    <Trash2 className="w-4 h-4" />
                 </Button>
               </div>
               <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
                 <div className="flex items-center gap-2 text-indigo-600 mb-1">
                    <Type className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Información de Campo</span>
                 </div>
                 <div className="pr-10">
                     <Select value={selectedCampo.tipo_campo} onValueChange={(v) => updateCampo(selectedCampo.id, { tipo_campo: v, etiqueta: FIELD_TYPES.find(f => f.value === v)?.label || v })}>
                        <SelectTrigger className="h-10 text-base font-bold bg-white focus:ring-2 focus:ring-indigo-100 transition-shadow truncate pr-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {FIELD_TYPES.map((f) => (
                            <SelectItem key={f.value} value={f.value} className="font-medium cursor-pointer py-2">{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                     </Select>
                 </div>
               </CardHeader>

               {/* Advanced Layout & Style tools */}
               <CardContent className="p-6 space-y-8 bg-white">
                  
                  {/* Position & Size */}
                  <div className="space-y-4 relative">
                     <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Move className="w-3 h-3" /> Posición y Tamaño
                     </h3>
                     <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">X</span>
                           <Input type="number" value={selectedCampo.pos_x} onChange={(e) => updateCampo(selectedCampo.id, { pos_x: Number(e.target.value) })} className="pl-7 h-10 font-mono text-sm bg-slate-50" />
                        </div>
                        <div className="relative">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">Y</span>
                           <Input type="number" value={selectedCampo.pos_y} onChange={(e) => updateCampo(selectedCampo.id, { pos_y: Number(e.target.value) })} className="pl-7 h-10 font-mono text-sm bg-slate-50" />
                        </div>
                        <div className="relative">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">W</span>
                           <Input type="number" value={selectedCampo.width} onChange={(e) => updateCampo(selectedCampo.id, { width: Math.max(20, Number(e.target.value)) })} className="pl-8 h-10 font-mono text-sm bg-slate-50" />
                        </div>
                        <div className="relative">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">H</span>
                           <Input type="number" value={selectedCampo.height} onChange={(e) => updateCampo(selectedCampo.id, { height: Math.max(20, Number(e.target.value)) })} className="pl-8 h-10 font-mono text-sm bg-slate-50" />
                        </div>
                     </div>
                     <div className="flex bg-slate-100/80 p-1 rounded-xl">
                        <Button variant="ghost" size="sm" className="flex-1 h-8 text-[11px] font-bold text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg transition-all" onClick={() => updateCampo(selectedCampo.id, { pos_x: Math.round((imgNatural.w - selectedCampo.width) / 2) })}>
                            <AlignHorizontalSpaceAround className="w-3.5 h-3.5 mr-1.5" /> Centrar H
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1 h-8 text-[11px] font-bold text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg transition-all" onClick={() => updateCampo(selectedCampo.id, { pos_y: Math.round((imgNatural.h - selectedCampo.height) / 2) })}>
                            <AlignVerticalSpaceAround className="w-3.5 h-3.5 mr-1.5" /> Centrar V
                        </Button>
                     </div>
                  </div>

                  {/* Typography */}
                  <div className="space-y-4">
                     <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Type className="w-3 h-3" /> Tipografía
                     </h3>
                     <div className="space-y-3">
                         <Select value={selectedCampo.font_family} onValueChange={(v) => updateCampo(selectedCampo.id, { font_family: v })}>
                            <SelectTrigger className="h-10 bg-slate-50">
                              <SelectValue placeholder="Selecciona fuente" />
                            </SelectTrigger>
                            <SelectContent>
                                {FONT_FAMILIES.map(f => (
                                    <SelectItem key={f} value={f} style={{ fontFamily: f }} className="text-base py-2">{f}</SelectItem>
                                ))}
                            </SelectContent>
                         </Select>
                         <div className="flex gap-2">
                             <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">PX</span>
                                <Input type="number" value={selectedCampo.font_size} onChange={(e) => updateCampo(selectedCampo.id, { font_size: Number(e.target.value) })} className="pl-8 h-10 font-bold bg-slate-50" />
                             </div>
                             <Select value={selectedCampo.font_weight} onValueChange={(v) => updateCampo(selectedCampo.id, { font_weight: v })}>
                                <SelectTrigger className="h-10 w-[120px] bg-slate-50 font-bold text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="400">Normal</SelectItem>
                                    <SelectItem value="500">Medium</SelectItem>
                                    <SelectItem value="600">SemiBold</SelectItem>
                                    <SelectItem value="700">Bold</SelectItem>
                                    <SelectItem value="800">Black</SelectItem>
                                </SelectContent>
                             </Select>
                         </div>
                     </div>
                  </div>

                  {/* Aesthetic / Styling */}
                  <div className="space-y-4">
                     <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Palette className="w-3 h-3" /> Diseño Visual
                     </h3>
                     <div className="space-y-3">
                         <div>
                            <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block">Color del texto</Label>
                            <ColorPicker value={selectedCampo.color} onChange={(val) => updateCampo(selectedCampo.id, { color: val })} />
                         </div>
                         <div>
                            <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block">Alineación Int.</Label>
                            <div className="flex bg-slate-100/80 p-1 rounded-xl">
                                {['left', 'center', 'right'].map(align => (
                                    <Button 
                                      key={align}
                                      variant="ghost" 
                                      size="sm" 
                                      className={cn("flex-1 h-8 text-[11px] font-bold rounded-lg capitalize", selectedCampo.text_align === align ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-800")}
                                      onClick={() => updateCampo(selectedCampo.id, { text_align: align })}
                                    >
                                        {align === 'left' ? 'Izq' : align === 'center' ? 'Ctr' : 'Der'}
                                    </Button>
                                ))}
                            </div>
                         </div>
                     </div>
                  </div>

               </CardContent>
             </Card>

             {/* Test Tools Panel */}
             {selectedCampo.tipo_campo === "nombre_completo" && (
                <Card className="rounded-3xl border-indigo-100 shadow-lg overflow-hidden bg-indigo-50/50">
                    <CardContent className="p-6 space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Test de Longitud (Nombre)</Label>
                        <Input value={testName} onChange={(e) => setTestName(e.target.value)} className="h-10 bg-white border-indigo-200 outline-none focus-visible:ring-indigo-500 font-bold" />
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(TEST_NAMES).map(([key, value]) => (
                                <button key={key} onClick={() => setTestName(value)} className="px-3 py-1.5 bg-white border border-indigo-100 text-[10px] font-bold text-indigo-600 rounded-full hover:bg-indigo-600 hover:text-white transition-colors capitalize shadow-sm">
                                    {key}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
             )}
          </div>
        ) : (
          !previewMode && (
             <div className="w-full lg:w-[380px] shrink-0 min-h-[400px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center p-10 text-center gap-4 bg-slate-50/30">
                 <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center text-slate-300">
                    <Type className="w-8 h-8" />
                 </div>
                 <div>
                    <h3 className="font-black italic text-slate-700 text-lg">Ningún elemento seleccionado</h3>
                    <p className="text-sm font-medium text-slate-400 mt-2">Haz clic en un campo sobre el certificado para editar sus propiedades o añade uno nuevo.</p>
                 </div>
                 <Button variant="outline" className="mt-4 gap-2 rounded-xl text-indigo-600 hover:text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-black italic bg-white" onClick={addCampo}>
                    <Plus className="w-4 h-4" /> Añadir Primer Campo
                 </Button>
             </div>
          )
        )}
      </div>
    </div>
  );
}
