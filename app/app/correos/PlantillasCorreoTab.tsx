"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { saveEmailTemplateAction, deleteEmailTemplateAction } from "@/app/actions/emailActions";
import { Plus, Edit, Trash2, Mail, Save, Loader2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/RichTextEditor";
import { VariableSelector } from "@/components/VariableSelector";
import { EmailPreview } from "@/components/EmailPreview";

interface PlantillasCorreoTabProps {
  initialTemplates: any[];
  eventos: any[];
  config: any;
}

export function PlantillasCorreoTab({ initialTemplates, eventos, config }: PlantillasCorreoTabProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedEventoId, setSelectedEventoId] = useState("");
  const [asunto, setAsunto] = useState("");
  const [mensajeHtml, setMensajeHtml] = useState("");
  const [lastFocusedField, setLastFocusedField] = useState<"asunto" | "mensaje">("mensaje");
  const editorRef = useRef<any>(null);
  const asuntoRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setTemplateName(template.nombre_plantilla);
    setSelectedEventoId(""); 
    setAsunto(template.asunto);
    setMensajeHtml(template.mensaje_html);
    setIsEditing(true);
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setTemplateName("");
    setSelectedEventoId("");
    setAsunto("");
    setMensajeHtml("");
    setIsEditing(true);
  };

  const insertToken = (token: string) => {
    if (lastFocusedField === "asunto" && asuntoRef.current) {
      const input = asuntoRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newValue = asunto.substring(0, start) + token + asunto.substring(end);
      setAsunto(newValue);
      
      // Devolver foco y posicionar cursor
      setTimeout(() => {
        input.focus();
        const newPos = start + token.length;
        input.setSelectionRange(newPos, newPos);
      }, 0);
    } else if (editorRef.current) {
      editorRef.current.chain().focus().insertContent(token).run();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta plantilla?")) return;
    setLoading(true);
    try {
      const res = await deleteEmailTemplateAction(id);
      if (res.success) {
        setTemplates(prev => prev.filter(t => t.id !== id));
        toast({ title: "Plantilla eliminada" });
      } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error de red", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("nombre_plantilla", templateName);
    formData.set("evento_id", selectedEventoId);
    formData.set("asunto", asunto);
    formData.set("mensaje_html", mensajeHtml);
    
    try {
      const res = await saveEmailTemplateAction(formData);
      if (res.success) {
        toast({ title: "Plantilla guardada" });
        setIsEditing(false);
        window.location.reload(); 
      } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error de red", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-primary/10 rounded-xl">
             <Mail className="w-5 h-5 text-primary" />
           </div>
           <div>
              <h2 className="text-xl font-bold">Mis Plantillas</h2>
              <p className="text-sm text-slate-500 font-medium">Gestiona los mensajes predefinidos para tus eventos.</p>
           </div>
        </div>
        <Button onClick={handleNew} className="h-11 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2">
           <Plus className="w-4 h-4" />
           Nueva Plantilla
        </Button>
      </div>

      <Card className="border-slate-200/60 dark:border-slate-800 rounded-3xl overflow-hidden bg-white/50 backdrop-blur-sm shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-b border-slate-100 dark:border-slate-800">
              <TableHead className="font-bold pl-6">Nombre de Plantilla</TableHead>
              <TableHead className="font-bold">Asunto</TableHead>
              <TableHead className="font-bold">Estado</TableHead>
              <TableHead className="font-bold pr-6">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id} className="border-b border-slate-100/50 hover:bg-slate-50/50 transition-colors">
                <TableCell className="font-bold pl-6 py-5 text-slate-800">{template.nombre_plantilla}</TableCell>
                <TableCell className="text-slate-500 font-medium max-w-xs truncate">{template.asunto}</TableCell>
                <TableCell>
                  <Badge variant={template.activo ? "default" : "secondary"} className={template.activo ? "bg-emerald-50 text-emerald-700 border-emerald-100" : ""}>
                    {template.activo ? "Activa" : "Inactiva"}
                  </Badge>
                </TableCell>
                <TableCell className="pr-6">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(template)} className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)} className="h-9 w-9 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {templates.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-20 text-slate-400 font-medium">
                  <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  No hay plantillas creadas todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog para Crear/Editar Premium */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-6xl rounded-[2.5rem] border-slate-200 shadow-2xl overflow-hidden p-0 bg-slate-50">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="p-8 bg-white border-b border-slate-100">
              <DialogTitle className="text-2xl font-black italic uppercase flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <span>{editingTemplate ? "Editar" : "Nueva"} <span className="text-primary italic">Plantilla</span></span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 max-h-[80vh] overflow-y-auto">
              {/* Columna Izquierda: Formulario */}
              <div className="lg:col-span-7 space-y-6">
                {editingTemplate && <input type="hidden" name="id" value={editingTemplate.id} />}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Asociar a Evento / Nombre de Plantilla</Label>
                    <Select 
                      onValueChange={(val) => {
                        const evento = eventos.find(e => e.id === val);
                        if (evento) {
                          setTemplateName(evento.titulo);
                          setSelectedEventoId(evento.id);
                        } else if (val === "custom") {
                          setSelectedEventoId("");
                        }
                      }}
                      defaultValue={selectedEventoId}
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200">
                        <SelectValue placeholder="Seleccione un evento" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventos.map(e => (
                          <SelectItem key={e.id} value={e.id}>{e.titulo}</SelectItem>
                        ))}
                        <SelectItem value="custom" className="font-bold text-primary italic border-t mt-2">Otras / Nombre Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre Confirmado</Label>
                    <Input 
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Ej. Confirmación de Registro" 
                      required 
                      className="h-11 rounded-xl bg-white border-slate-200 focus:ring-2 focus:ring-primary/20" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tipo de Plantilla</Label>
                    <Input 
                      name="tipo_plantilla" 
                      defaultValue={editingTemplate?.tipo_plantilla || "informativo"} 
                      placeholder="Ej. bienvenida, certificado" 
                      className="h-11 rounded-xl bg-white border-slate-200" 
                    />
                  </div>
                  <div className="space-y-2 flex items-end pb-3">
                    <p className="text-[10px] text-slate-500 italic">
                      {selectedEventoId ? "✅ Esta plantilla se asignará automáticamente al evento seleccionado." : "💡 Elige un evento arriba para asociarla."}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Asunto del Correo</Label>
                  <Input 
                    ref={asuntoRef}
                    value={asunto}
                    onChange={(e) => setAsunto(e.target.value)}
                    onFocus={() => setLastFocusedField("asunto")}
                    placeholder="Ej. ¡Bienvenido al evento {{evento_nombre}}!" 
                    required 
                    className="h-11 rounded-xl bg-white border-slate-200 focus:ring-2 focus:ring-primary/20" 
                  />
                </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Cuerpo del Mensaje</Label>
                    <Badge variant="outline" className="text-[9px] font-bold uppercase border-slate-200 text-slate-400 bg-white">HTML Enriquecido</Badge>
                  </div>
                  <div onFocusCapture={() => setLastFocusedField("mensaje")}>
                    <RichTextEditor 
                      content={mensajeHtml} 
                      onChange={setMensajeHtml} 
                      editorRef={editorRef}
                    />
                  </div>

                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <Checkbox id="usar_firma_sistema" name="usar_firma_sistema" defaultChecked={editingTemplate?.usar_firma_sistema ?? true} value="true" />
                    <Label htmlFor="usar_firma_sistema" className="text-xs font-bold cursor-pointer">Usar Firma</Label>
                  </div>
                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <Checkbox id="usar_logo_sistema" name="usar_logo_sistema" defaultChecked={editingTemplate?.usar_logo_sistema ?? true} value="true" />
                    <Label htmlFor="usar_logo_sistema" className="text-xs font-bold cursor-pointer">Usar Logo</Label>
                  </div>
                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <Checkbox id="activo" name="activo" defaultChecked={editingTemplate?.activo ?? true} value="true" />
                    <Label htmlFor="activo" className="text-xs font-bold cursor-pointer">Activa</Label>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Variables y Preview */}
              <div className="lg:col-span-5 space-y-6">
                 <VariableSelector 
                    onSelect={insertToken} 
                    eventFields={[]} // Para plantillas base no hay campos dinámicos específicos aún
                 />
                 
                 <EmailPreview 
                    content={mensajeHtml} 
                    subject={asunto} 
                    config={config} 
                 />
              </div>
            </div>

            <DialogFooter className="p-8 bg-white border-t border-slate-100 flex-row sm:justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-12 px-8 shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {editingTemplate ? "Guardar Cambios" : "Crear Plantilla"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
