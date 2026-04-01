"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";
import { createFormulario } from "@/app/actions/formularios";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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

export function CreateFormButton({ eventoId }: { eventoId: string }) {
  const [isPending, startTransition] = useTransition();
  const [selectedFields, setSelectedFields] = useState<typeof PRESETS>(
    PRESETS.filter(p => ["Tipo de Documento", "Número de Documento", "Correo Electrónico", "Nombres", "Apellidos"].includes(p.label))
  );
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const toggleField = (field: typeof PRESETS[0]) => {
    setSelectedFields(prev =>
      prev.some(f => f.label === field.label)
        ? prev.filter(f => f.label !== field.label)
        : [...prev, field]
    );
  };

  const handleCreate = () => {
    startTransition(async () => {
      try {
        await createFormulario(eventoId, selectedFields);
        toast({ title: "Formulario creado correctamente" });
        setOpen(false);
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Crear Formulario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurar Formulario Inicial</DialogTitle>
          <DialogDescription>
            Selecciona los campos que deseas incluir por defecto en el formulario de inscripción.
            Podrás personalizarlos más tarde.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {PRESETS.map((p) => (
            <div key={p.label} className="flex items-center space-x-3 space-y-0">
              <Checkbox
                id={p.label}
                checked={selectedFields.some(f => f.label === p.label)}
                onCheckedChange={() => toggleField(p)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor={p.label}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {p.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  Tipo: {p.tipo_campo} {p.obligatorio ? "(Requerido)" : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleCreate} disabled={isPending}>
            {isPending ? "Creando..." : "Confirmar y Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
