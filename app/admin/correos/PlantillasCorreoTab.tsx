"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { saveEmailTemplateAction, deleteEmailTemplateAction } from "@/app/actions/emailActions";
import { Plus, Edit, Trash2, Mail, Save, Loader2, X, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface PlantillasCorreoTabProps {
  initialTemplates: any[];
}

export function PlantillasCorreoTab({ initialTemplates }: PlantillasCorreoTabProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setIsEditing(true);
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setIsEditing(true);
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
    
    try {
      const res = await saveEmailTemplateAction(formData);
      if (res.success) {
        toast({ title: "Plantilla guardada" });
        setIsEditing(false);
        // Recargar idealmente o actualizar localmente (Next.js revalidatePath ayudará en el refresh de la página)
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

      {/* Dialog para Crear/Editar */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-3xl rounded-[2rem] border-slate-200 shadow-2xl overflow-hidden p-0">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="p-8 bg-slate-50/50 border-b border-slate-100">
              <DialogTitle className="text-2xl font-black italic uppercase">
                {editingTemplate ? "Editar" : "Nueva"} <span className="text-primary italic">Plantilla</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {editingTemplate && <input type="hidden" name="id" value={editingTemplate.id} />}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-bold">Nombre de la Plantilla</Label>
                  <Input name="nombre_plantilla" defaultValue={editingTemplate?.nombre_plantilla} placeholder="Ej. Confirmación de Registro" required className="rounded-xl" />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold">Tipo de Plantilla</Label>
                  <Input name="tipo_plantilla" defaultValue={editingTemplate?.tipo_plantilla || "informativo"} placeholder="Ej. bienvenida, certificado" className="rounded-xl" />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold">Asunto del Correo</Label>
                <Input name="asunto" defaultValue={editingTemplate?.asunto} placeholder="Ej. ¡Bienvenido al evento {{evento_nombre}}!" required className="rounded-xl" />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold">Mensaje (Rich Text Simulation)</Label>
                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                   <textarea 
                     name="mensaje_html" 
                     defaultValue={editingTemplate?.mensaje_html} 
                     className="w-full min-h-[150px] p-4 text-sm focus:outline-none resize-none font-sans bg-white" 
                     placeholder="Escribe el cuerpo del mensaje..."
                     required
                   />
                </div>
                <p className="text-[10px] text-slate-500 font-medium italic">Puedes usar placeholders como &#123;&#123;nombre_participante&#125;&#125;, &#123;&#123;evento_titulo&#125;&#125;, etc.</p>
              </div>

              <div className="flex flex-wrap gap-6 pt-2">
                <div className="flex items-center gap-3">
                  <Checkbox id="usar_firma_sistema" name="usar_firma_sistema" defaultChecked={editingTemplate?.usar_firma_sistema ?? true} value="true" />
                  <Label htmlFor="usar_firma_sistema" className="text-xs font-bold whitespace-nowrap">Usar Firma del Sistema</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="usar_logo_sistema" name="usar_logo_sistema" defaultChecked={editingTemplate?.usar_logo_sistema ?? true} value="true" />
                  <Label htmlFor="usar_logo_sistema" className="text-xs font-bold whitespace-nowrap">Usar Logo del Sistema</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="activo" name="activo" defaultChecked={editingTemplate?.activo ?? true} value="true" />
                  <Label htmlFor="activo" className="text-xs font-bold whitespace-nowrap">Plantilla Activa</Label>
                </div>
              </div>
            </div>

            <DialogFooter className="p-8 bg-slate-50/50 border-t border-slate-100 flex-row sm:justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest text-slate-500">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-12 px-8 shadow-lg shadow-primary/20">
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
