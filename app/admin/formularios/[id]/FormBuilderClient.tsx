"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabaseClient";
import { Plus, Trash2, GripVertical, Save, ArrowLeft, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteFormulario } from "@/app/actions/formularios";
import { toBogotaISO, fromBogotaLocal, getBogotaDate } from "@/lib/date";
import { DateTimePicker } from "@/components/ui/date-time-picker";

interface Campo {
  id: string;
  label: string;
  tipo_campo: string;
  obligatorio: boolean;
  opciones_json: string[] | null;
  orden: number;
  placeholder?: string | null;
  ayuda?: string | null;
  activo?: boolean;
  es_base?: boolean;
  validacion_json?: any;
  ancho_visual?: number | null;
  isNew?: boolean;
}

const PRESETS = [
  { label: "Tipo de Documento", tipo_campo: "select", obligatorio: true, opciones_json: ["CC", "TI", "CE", "PAS"] },
  { label: "Número de Documento", tipo_campo: "text", obligatorio: true },
  { label: "Correo Electrónico", tipo_campo: "email", obligatorio: true },
  { label: "Nombres", tipo_campo: "text", obligatorio: true },
  { label: "Apellidos", tipo_campo: "text", obligatorio: true },
  { label: "Teléfono", tipo_campo: "text", obligatorio: false },
  { label: "Empresa", tipo_campo: "text", obligatorio: false },
  { label: "Cargo", tipo_campo: "text", obligatorio: false },
  { label: "Universidad", tipo_campo: "text", obligatorio: false },
];

const TIPOS = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "email", label: "Email" },
  { value: "select", label: "Selección" },
  { value: "checkbox", label: "Casilla de verificación" },
  { value: "textarea", label: "Texto largo" },
];
export function FormBuilderClient({ 
  formularioId, 
  initialCampos,
  initialFechaApertura,
  initialFechaCierre,
  eventoFechaInicio
}: { 
  formularioId: string; 
  initialCampos: any[];
  initialFechaApertura?: string | null;
  initialFechaCierre?: string | null;
  eventoFechaInicio?: string | null;
}) {
  const [campos, setCampos] = useState<Campo[]>(
    initialCampos.map((c) => ({
      ...c,
      opciones_json: c.opciones_json || c.opciones || null,
      isNew: false 
    }))
  );
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [fechaAperturaDate, setFechaAperturaDate] = useState<Date | undefined>(
    getBogotaDate(initialFechaApertura) || undefined
  );
  const [fechaCierreDate, setFechaCierreDate] = useState<Date | undefined>(
    getBogotaDate(initialFechaCierre) || undefined
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sincronizar estado local cuando las props cambien (ej: tras router.refresh())
  useEffect(() => {
    setCampos(initialCampos.map((c) => ({
      ...c,
      opciones_json: c.opciones_json || c.opciones || null,
      isNew: false 
    })));
    setFechaAperturaDate(getBogotaDate(initialFechaApertura) || undefined);
    setFechaCierreDate(getBogotaDate(initialFechaCierre) || undefined);
  }, [initialCampos, initialFechaApertura, initialFechaCierre]);

  const addCampo = (preset?: any) => {
    setCampos([
      ...campos,
      {
        id: `new-${Date.now()}-${Math.random()}`,
        label: preset?.label || "",
        tipo_campo: preset?.tipo_campo || "text",
        obligatorio: preset?.obligatorio || false,
        opciones_json: preset?.opciones_json || null,
        orden: campos.length,
        activo: true,
        es_base: false,
        ancho_visual: 12,
        isNew: true,
      },
    ]);
  };

  const removeCampo = (id: string) => {
    if (!id.startsWith("new-")) {
      setDeletedIds((prev) => [...prev, id]);
    }
    setCampos(campos.filter((c) => c.id !== id));
  };

  const updateCampo = (id: string, patch: Partial<Campo>) => {
    setCampos(campos.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Actualizar metadatos del formulario (fechas)
      const { error: formError } = await supabase
        .from("formularios")
        .update({
          fecha_apertura: fechaAperturaDate ? fromBogotaLocal(toBogotaISO(fechaAperturaDate)) : null,
          fecha_cierre: fechaCierreDate ? fromBogotaLocal(toBogotaISO(fechaCierreDate)) : null,
        })
        .eq("id", formularioId);

      if (formError) throw formError;

      // 2. Procesar cambios en los campos quirúrgicamente

      // 2.a Eliminar campos descartados
      if (deletedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("formulario_campos")
          .delete()
          .in("id", deletedIds);
        if (deleteError) throw deleteError;
      }

      // 2.b Diferenciar entre nuevos y existentes
      const registrosIdExistentes = campos.filter(c => !c.id.startsWith("new-"));
      const registrosNuevos = campos.filter(c => c.id.startsWith("new-"));

      // 2.c Actualizar campos existentes individualmente o por lote si se prefiere (lote es más complejo con ids)
      // Usaremos un mapeo limpio de columnas
      const mapFieldRow = (c: Campo, i: number) => ({
        formulario_id: formularioId,
        nombre_campo: (c.label || `campo_${i}`).toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
        label: c.label || "Campo sin nombre",
        tipo_campo: c.tipo_campo,
        obligatorio: c.obligatorio,
        placeholder: c.placeholder || null,
        ayuda: c.ayuda || null,
        orden: i,
        activo: c.activo ?? true,
        es_base: c.es_base ?? false,
        validacion_json: c.validacion_json || null,
        opciones_json: (c.tipo_campo === "select" || c.tipo_campo === "checkbox") ? c.opciones_json : null,
        ancho_visual: c.ancho_visual ?? 12
      });

      // Actualizar existentes
      for (const campo of registrosIdExistentes) {
        const { id, isNew, ...rest } = campo;
        const rowIndex = campos.findIndex(c => c.id === id);
        const { error: updateError } = await supabase
          .from("formulario_campos")
          .update(mapFieldRow(campo, rowIndex))
          .eq("id", id);
        if (updateError) throw updateError;
      }

      // Insertar nuevos
      if (registrosNuevos.length > 0) {
        const newRows = registrosNuevos.map(c => {
          const rowIndex = campos.findIndex(f => f.id === c.id);
          return mapFieldRow(c, rowIndex);
        });
        const { error: insertError } = await supabase
          .from("formulario_campos")
          .insert(newRows);
        if (insertError) throw insertError;
      }

      setDeletedIds([]); // Limpiar tras éxito
      toast({ title: "Formulario guardado correctamente" });
      router.refresh();
    } catch (err: any) {
      toast({ title: "Error al guardar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que deseas eliminar este formulario? Se borrarán todos sus campos.")) return;
    setDeleting(true);
    try {
      await deleteFormulario(formularioId);
      toast({ title: "Formulario eliminado" });
      router.push("/admin/formularios");
      router.refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Sticky Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 sm:px-6 rounded-[1.25rem] border border-slate-200/60 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.06)] sticky top-4 z-50">
        <div className="flex items-center gap-4">
          <Link href="/admin/formularios">
            <Button variant="outline" size="sm" className="gap-2 rounded-xl h-10 px-4 font-bold border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </Link>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Constructor de Formulario</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {campos.length} campo(s) configurado(s)
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 gap-2 rounded-xl h-10 px-4 font-bold transition-colors" 
            onClick={handleDelete} 
            disabled={deleting}
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">{deleting ? "Eliminando..." : "Eliminar Formulario"}</span>
          </Button>
          <Button size="sm" className="gap-2 bg-primary hover:bg-secondary text-primary-foreground rounded-xl h-10 px-6 font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Sidebar Configuradora */}
        <aside className="lg:col-span-1 space-y-6 sticky top-28">
          <Card className="border border-slate-200/60 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[1.5rem] overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-yellow-400 to-amber-500"></div>
            <CardHeader className="py-4 px-5 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                Campos Rápidos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 gap-1.5">
              {PRESETS.map((p) => (
                <Button 
                  key={p.label} 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start font-semibold h-9 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg group text-slate-600 dark:text-slate-300"
                  onClick={() => addCampo(p)}
                >
                  <Plus className="w-3.5 h-3.5 mr-2 text-slate-400 group-hover:text-primary transition-colors" />
                  {p.label}
                </Button>
              ))}
              <div className="border-t border-slate-200 dark:border-slate-800 my-3 mx-2" />
              <Button 
                variant="outline" 
                size="sm" 
                className="justify-start h-10 text-xs font-bold gap-2 border-dashed border-2 border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5 rounded-xl text-slate-700 dark:text-slate-300 transition-all"
                onClick={() => addCampo()}
              >
                <Plus className="w-4 h-4" />
                Campo Personalizado
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/60 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[1.5rem] overflow-hidden">
             <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-500"></div>
            <CardHeader className="py-4 px-5 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">Disponibilidad del Formulario</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="space-y-2">
                <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Apertura</Label>
                {mounted && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
                    <DateTimePicker date={fechaAperturaDate} setDate={setFechaAperturaDate} className="w-full text-xs border-0 bg-transparent shadow-none" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Cierre</Label>
                {mounted && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
                    <DateTimePicker 
                      date={fechaCierreDate} 
                      setDate={setFechaCierreDate} 
                      className="w-full text-xs border-0 bg-transparent shadow-none" 
                      disabled={eventoFechaInicio ? (date) => date >= new Date(eventoFechaInicio) : undefined}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="p-5 bg-primary/5 dark:bg-primary/10 rounded-[1.5rem] border border-primary/20 dark:border-primary/20">
            <h4 className="text-xs font-bold text-secondary dark:text-primary mb-2 flex items-center gap-1.5">
              <span className="text-base">💡</span> Tip de uso
            </h4>
            <p className="text-[11px] text-secondary/80 dark:text-primary/70 leading-relaxed font-medium">
              Usa los campos rápidos para añadir la información básica requerida por la base de datos automáticamente. Arrastra los campos en el lienzo para reordenarlos.
            </p>
          </div>
        </aside>

        {/* Lienzo del Formulario */}
        <section className="lg:col-span-3 space-y-4">
          {campos.map((campo, idx) => (
            <Card key={campo.id} className="group hover:border-primary/40 border border-slate-200/60 dark:border-slate-800 transition-all duration-300 shadow-sm hover:shadow-md bg-white dark:bg-slate-900 rounded-[1.5rem] overflow-hidden">
              <div className="flex h-full">
                {/* Drag Handle Area */}
                <div className="w-12 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-start py-6 border-r border-slate-100 dark:border-slate-800 cursor-grab active:cursor-grabbing hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                  <GripVertical className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  <span className="text-[10px] font-extrabold text-slate-400 mt-2">{idx + 1}</span>
                </div>
                
                <CardContent className="flex-1 p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-5">
                      <div className="md:col-span-6 lg:col-span-7 space-y-2">
                        <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Etiqueta del Campo</Label>
                        <Input
                          value={campo.label}
                          onChange={(e) => updateCampo(campo.id, { label: e.target.value })}
                          placeholder="Ej. Nombres del participante"
                          className="h-12 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-100 transition-colors"
                        />
                      </div>
                      
                      <div className="md:col-span-4 lg:col-span-3 space-y-2">
                        <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Tipo Módulo</Label>
                        <Select
                          value={campo.tipo_campo}
                          onValueChange={(v) => updateCampo(campo.id, { tipo_campo: v })}
                        >
                          <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800/50 focus:bg-white border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS.map((t) => (
                              <SelectItem key={t.value} value={t.value} className="font-medium text-slate-700 dark:text-slate-300 py-2.5">{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-2 flex flex-col items-start md:items-center justify-end pb-1.5">
                        <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors">
                          <input
                            type="checkbox"
                            id={`req-${campo.id}`}
                            checked={campo.obligatorio}
                            onChange={(e) => updateCampo(campo.id, { obligatorio: e.target.checked })}
                            className="w-4 h-4 accent-primary cursor-pointer rounded-sm"
                          />
                          <Label htmlFor={`req-${campo.id}`} className="text-[11px] font-extrabold cursor-pointer text-slate-600 dark:text-slate-300">REQ.</Label>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 mt-6 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0 self-start transition-colors rounded-xl"
                      onClick={() => removeCampo(campo.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {campo.tipo_campo === "select" && (
                     <div className="mt-4 p-5 bg-primary/5 dark:bg-primary/5 rounded-xl border border-dashed border-primary/30 dark:border-primary/20 space-y-3">
                      <Label className="text-[11px] uppercase tracking-wider font-bold text-secondary dark:text-primary flex items-center gap-2">
                        Opciones de Selección
                        <span className="text-[10px] font-medium lowercase text-secondary/70 dark:text-primary/50">(separadas por coma)</span>
                      </Label>
                      <Input
                        placeholder="Ej. VIP, General, Estudiante"
                        defaultValue={(campo.opciones_json || []).join(", ")}
                        onChange={(e) =>
                          updateCampo(campo.id, {
                            opciones_json: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
                          })
                        }
                        className="bg-white dark:bg-slate-900 h-12 border-support/30 focus:border-primary focus:ring-primary/20"
                      />
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>
          ))}

          {campos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-28 px-6 text-center border-2 border-dashed rounded-[2rem] border-slate-300/60 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <div className="bg-slate-100 dark:bg-slate-800 p-5 rounded-full mb-6">
                <Zap className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 mb-2">Construye tu Formulario</h3>
              <p className="text-base text-slate-500 dark:text-slate-400 max-w-md mb-8">
                El lienzo está vacío. Usa los <strong>campos rápidos</strong> del panel lateral para añadir la estructura base y empezar a recolectar datos.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {PRESETS.slice(0, 3).map(p => (
                  <Button key={p.label} variant="outline" className="rounded-xl h-11 px-5 border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => addCampo(p)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
