"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, Eye, AlignCenter, AlignHorizontalSpaceAround, AlignVerticalSpaceAround, Grid3X3 } from "lucide-react";
import { certificateTemplateService } from "@/services/certificateTemplateService";

const FIELD_TYPES = [
  { label: "Nombre Completo", value: "nombre_completo" },
  { label: "Número de Documento", value: "numero_documento" },
  { label: "Evento", value: "evento" },
  { label: "Fecha", value: "fecha" },
  { label: "Código de Certificado", value: "codigo_certificado" },
];

// Textos de muestra con casos complicados (nombres largos)
const PREVIEW_VALUES: Record<string, string> = {
  nombre_completo: "María Alejandra",
  numero_documento: "1.234.567.890",
  evento: "XIV Congreso Internacional de Innovación y Tecnología Educativa",
  fecha: "15 de marzo de 2026",
  codigo_certificado: "CERT-2026-001234",
};
const TEST_NAMES = {
  corto: "Ana Ruiz",
  medio: "Laura Camila Prada Martínez",
  largo: "María Fernanda Del Pilar Rodríguez Castañeda",
  extremo: "Juan Sebastián De Los Ríos Castellanos Montoya Fernández",
};

const TEST_DOCUMENTS = {
  corto: "12345678",
  medio: "1122334455",
  largo: "100123456789",
  extremo: "900123456789012",
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
  eventoId?: string; // Prop opcional para vincular campos al evento
}

export default function CertificateEditor({ template, initialFields, eventoId }: CertificateEditorProps) {
  const [campos, setCampos] = useState<Campo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testName, setTestName] = useState(TEST_NAMES.medio);
  const [testDocument, setTestDocument] = useState(TEST_DOCUMENTS.medio);
  const [showGuides, setShowGuides] = useState(true);
  const [imgNatural, setImgNatural] = useState({ w: template.ancho_px || 800, h: template.alto_px || 600 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const { toast } = useToast();
  const supabase = createClient();

  // Cargar configuración existente
  useEffect(() => {
    supabase
      .from("plantilla_campos_certificado")
      .select("*")
      .eq("plantilla_certificado_id", template.id)
      .order("orden", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setCampos(
            data.map((d) => ({ ...d, id: d.id || `${Date.now()}` }))
          );
        }
      });
  }, [template.id]);

  const addCampo = () => {
    const newCampo: Campo = {
      id: `local-${Date.now()}`,
      tipo_campo: "nombre_completo",
      etiqueta: "Nombre Completo",
      pos_x: 100,
      pos_y: 100,
      width: 400,
      height: 60,
      font_family: "Arial",
      font_size: 28,
      font_weight: "bold",
      text_align: "center",
      color: "#000000",
      line_height: 1.2,
      letter_spacing: 0,
      auto_fit: true,
      visible: true,
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

  const centerHorizontal = () => {
    if (!selected || !selectedCampo) return;
    const newX = Math.round((imgNatural.w - selectedCampo.width) / 2);
    updateCampo(selected, { pos_x: newX });
  };

  const centerVertical = () => {
    if (!selected || !selectedCampo) return;
    const newY = Math.round((imgNatural.h - selectedCampo.height) / 2);
    updateCampo(selected, { pos_y: newY });
  };

  const centerBoth = () => {
    if (!selected || !selectedCampo) return;
    updateCampo(selected, { 
      pos_x: Math.round((imgNatural.w - selectedCampo.width) / 2),
      pos_y: Math.round((imgNatural.h - selectedCampo.height) / 2)
    });
  };

  // Drag logic
  const onMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const campo = campos.find((c) => c.id === id);
    if (!campo) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = imgNatural.w / rect.width;
    const scaleY = imgNatural.h / rect.height;
    dragOffsetRef.current = {
      x: (e.clientX - rect.left) * scaleX - campo.pos_x,
      y: (e.clientY - rect.top) * scaleY - campo.pos_y,
    };
    setDragging(id);
    setSelected(id);
  };

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scaleX = imgNatural.w / rect.width;
      const scaleY = imgNatural.h / rect.height;
      const newX = Math.max(0, (e.clientX - rect.left) * scaleX - dragOffsetRef.current.x);
      const newY = Math.max(0, (e.clientY - rect.top) * scaleY - dragOffsetRef.current.y);
      updateCampo(dragging, { pos_x: Math.round(newX), pos_y: Math.round(newY) });
    },
    [dragging, imgNatural]
  );

  const onMouseUp = () => setDragging(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Guardar cada campo individualmente usando la nueva lógica RPC centralizada
      // Buscamos el eventoId si no está disponible directamente
      const targetEventoId = eventoId;
      
      if (!targetEventoId) {
        throw new Error("No hay un evento asociado para guardar esta configuración.");
      }

      for (const field of campos) {
        await certificateTemplateService.saveFieldConfig(targetEventoId, field);
      }
      
      toast({ 
        title: "Configuración guardada", 
        description: "Los campos se han vinculado al evento y plantilla correctamente." 
      });
    } catch (error: any) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const selectedCampo = campos.find((c) => c.id === selected);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Editor: {template.nombre}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setPreviewMode(!previewMode)}>
            <Eye className="w-4 h-4" />
            {previewMode ? "Editar" : "Vista previa"}
          </Button>
          <Button variant="outline" size="sm" className={`gap-2 ${showGuides ? "bg-primary/10 border-primary" : ""}`} onClick={() => setShowGuides(!showGuides)}>
            <Grid3X3 className="w-4 h-4" />
            Guías
          </Button>

          <Button size="sm" className="gap-2" onClick={addCampo} disabled={previewMode}>
            <Plus className="w-4 h-4" />
            Añadir campo
          </Button>
          <Button size="sm" className="gap-2" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Canvas de edición */}
        <div className="flex-1 min-w-0">
          <div
            ref={canvasRef}
            className="relative w-full border rounded-lg overflow-hidden shadow-lg cursor-crosshair select-none"
            style={{ aspectRatio: `${imgNatural.w} / ${imgNatural.h}` }}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <img
              src={template.archivo_base_url}
              alt="Plantilla"
              className="w-full h-full object-contain"
              onLoad={(e) => {
                const img = e.currentTarget;
                setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
              }}
              draggable={false}
            />

            {/* Guías centrales */}
            {showGuides && (
              <>
                <div className="absolute top-0 bottom-0 left-1/2 border-l border-primary/40 border-dashed pointer-events-none" />
                <div className="absolute left-0 right-0 top-1/2 border-t border-primary/40 border-dashed pointer-events-none" />
              </>
            )}

            {campos.filter((c) => c.visible).map((campo) => {
              const containerRect = canvasRef.current?.getBoundingClientRect();
              const scaleX = containerRect ? containerRect.width / imgNatural.w : 1;
              const scaleY = containerRect ? containerRect.height / imgNatural.h : 1;
              return (
                <div
                  key={campo.id}
                  className={`absolute border-2 rounded cursor-move flex items-center overflow-hidden ${
                    selected === campo.id && !previewMode
                      ? "border-primary bg-primary/10"
                      : "border-blue-400/60 bg-blue-50/20"
                  }`}
                  style={{
                    left: campo.pos_x * scaleX,
                    top: campo.pos_y * scaleY,
                    width: campo.width * scaleX,
                    height: campo.height * scaleY,
                    justifyContent: campo.text_align === "center" ? "center" : campo.text_align === "right" ? "flex-end" : "flex-start",
                  }}
                  onMouseDown={(e) => !previewMode && onMouseDown(e, campo.id)}
                  onClick={() => !previewMode && setSelected(campo.id)}
                >
                  <span
                    className="truncate px-1"
                    style={{
                      fontFamily: campo.font_family,
                      fontSize: Math.max(8, campo.font_size * scaleX),
                      fontWeight: campo.font_weight,
                      color: campo.color,
                      lineHeight: campo.line_height,
                      letterSpacing: campo.letter_spacing,
                      textAlign: campo.text_align as any,
                      width: "100%",
                    }}
                  >
                    {previewMode || campo.tipo_campo === "nombre_completo" || campo.tipo_campo === "numero_documento"
                      ? (
                        campo.tipo_campo === "nombre_completo" ? testName : 
                        campo.tipo_campo === "numero_documento" ? testDocument :
                        PREVIEW_VALUES[campo.tipo_campo] || campo.etiqueta
                      ) 
                      : campo.etiqueta}
                  </span>
                  {/* Indicador de desbordamiento (solo ayuda visual) */}
                  <div className="absolute inset-0 pointer-events-none border-2 border-transparent hover:border-dashed hover:border-white/20" />
                </div>
              );
            })}

            {/* Guía visual del nombre cuando se edita el documento */}
            {!previewMode && selectedCampo?.tipo_campo === "numero_documento" && campos.find(c => c.tipo_campo === "nombre_completo") && (
              (() => {
                const nombreCampo = campos.find(c => c.tipo_campo === "nombre_completo")!;
                const containerRect = canvasRef.current?.getBoundingClientRect();
                const scaleX = containerRect ? containerRect.width / imgNatural.w : 1;
                const scaleY = containerRect ? containerRect.height / imgNatural.h : 1;
                return (
                  <div 
                    className="absolute border-2 border-primary/30 border-dashed pointer-events-none flex items-center justify-center"
                    style={{
                      left: nombreCampo.pos_x * scaleX,
                      top: nombreCampo.pos_y * scaleY,
                      width: nombreCampo.width * scaleX,
                      height: nombreCampo.height * scaleY,
                    }}
                  >
                    <span className="text-[10px] text-primary/40 uppercase font-bold">Referencia: Nombre</span>
                  </div>
                );
              })()
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Dimensiones reales: {imgNatural.w} × {imgNatural.h} px. Arrastra los campos para reposicionarlos.
          </p>
        </div>

        {/* Panel de propiedades del campo seleccionado */}
        {selectedCampo && !previewMode && (
          <Card className="w-80 shrink-0 shadow-sm border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Propiedades</CardTitle>
                <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => removeCampo(selectedCampo.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <Label>Tipo de Campo</Label>
                <Select value={selectedCampo.tipo_campo} onValueChange={(v) => updateCampo(selectedCampo.id, { tipo_campo: v, etiqueta: FIELD_TYPES.find(f => f.value === v)?.label || v })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>X (px)</Label>
                  <Input type="number" value={selectedCampo.pos_x} onChange={(e) => updateCampo(selectedCampo.id, { pos_x: Number(e.target.value) })} className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label>Y (px)</Label>
                  <Input type="number" value={selectedCampo.pos_y} onChange={(e) => updateCampo(selectedCampo.id, { pos_y: Number(e.target.value) })} className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label>Ancho</Label>
                  <Input type="number" value={selectedCampo.width} onChange={(e) => updateCampo(selectedCampo.id, { width: Number(e.target.value) })} className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label>Alto</Label>
                  <Input type="number" value={selectedCampo.height} onChange={(e) => updateCampo(selectedCampo.id, { height: Number(e.target.value) })} className="h-8" />
                </div>
              </div>

              {/* Botones de Alineación Rápida */}
              <div className="space-y-1.5 px-0.5">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold">Alineación Rápida</Label>
                <div className="flex gap-1.5">
                  <Button variant="secondary" size="sm" className="flex-1 h-8 text-[11px] gap-1" onClick={centerHorizontal} title="Centrar Horizontalmente">
                    <AlignHorizontalSpaceAround className="w-3 h-3" />
                    H
                  </Button>
                  <Button variant="secondary" size="sm" className="flex-1 h-8 text-[11px] gap-1" onClick={centerVertical} title="Centrar Verticalmente">
                    <AlignVerticalSpaceAround className="w-3 h-3" />
                    V
                  </Button>
                  <Button variant="secondary" size="sm" className="flex-1 h-8 text-[11px] gap-1" onClick={centerBoth} title="Centrar en ambos ejes">
                    <AlignCenter className="w-3 h-3" />
                    Centro
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Tamaño Fuente</Label>
                  <Input type="number" value={selectedCampo.font_size} onChange={(e) => updateCampo(selectedCampo.id, { font_size: Number(e.target.value) })} className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label>Alineación</Label>
                  <Select value={selectedCampo.text_align} onValueChange={(v) => updateCampo(selectedCampo.id, { text_align: v })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Izquierda</SelectItem>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="right">Derecha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Estilos tipográficos simplificados para n8n */}
                <div className="col-span-2 p-2 bg-blue-50/50 rounded text-[11px] text-blue-700 border border-blue-100">
                  <p>Nota: Las opciones de fuente y colores técnicos se configuran en n8n.</p>
                </div>
              </div>

              {/* Sección de Prueba de Datos Dinámica */}
              <div className="pt-4 border-t space-y-3">
                <Label className="text-xs font-bold text-primary uppercase">Vista Previa de Datos</Label>
                
                {selectedCampo.tipo_campo === "nombre_completo" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre de prueba</Label>
                      <Input 
                        value={testName} 
                        onChange={(e) => setTestName(e.target.value)} 
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Button variant="outline" size="sm" className="text-[10px] h-7 px-2" onClick={() => setTestName(TEST_NAMES.corto)}>Corto</Button>
                      <Button variant="outline" size="sm" className="text-[10px] h-7 px-2" onClick={() => setTestName(TEST_NAMES.medio)}>Medio</Button>
                      <Button variant="outline" size="sm" className="text-[10px] h-7 px-2" onClick={() => setTestName(TEST_NAMES.largo)}>Largo</Button>
                      <Button variant="outline" size="sm" className="text-[10px] h-7 px-2" onClick={() => setTestName(TEST_NAMES.extremo)}>Extremo</Button>
                    </div>
                  </>
                )}

                {selectedCampo.tipo_campo === "numero_documento" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Documento de prueba</Label>
                      <Input 
                        value={testDocument} 
                        onChange={(e) => setTestDocument(e.target.value)} 
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Button variant="outline" size="sm" className="text-[10px] h-7 px-2" onClick={() => setTestDocument(TEST_DOCUMENTS.corto)}>Corto</Button>
                      <Button variant="outline" size="sm" className="text-[10px] h-7 px-2" onClick={() => setTestDocument(TEST_DOCUMENTS.medio)}>Medio</Button>
                      <Button variant="outline" size="sm" className="text-[10px] h-7 px-2" onClick={() => setTestDocument(TEST_DOCUMENTS.largo)}>Largo</Button>
                      <Button variant="outline" size="sm" className="text-[10px] h-7 px-2" onClick={() => setTestDocument(TEST_DOCUMENTS.extremo)}>Extremo</Button>
                    </div>
                  </>
                )}

                {!["nombre_completo", "numero_documento"].includes(selectedCampo.tipo_campo) && (
                  <p className="text-[11px] text-muted-foreground italic">No hay herramientas de prueba específicas para este campo.</p>
                )}
                
                {/* Detección visual de desbordamiento */}
                <div className="p-2 bg-muted rounded-md text-[11px] space-y-1">
                  <p className="font-semibold text-primary">Validación Visual:</p>
                  <p className="text-muted-foreground leading-tight">
                    Asegúrate de que el texto quepa en la caja azul. 
                    Si se desborda, ajusta <span className="font-medium">Ancho</span> o <span className="font-medium">Tamaño</span> manualmente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
