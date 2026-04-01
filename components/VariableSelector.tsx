"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Calendar, Settings, FormInput, Copy } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Variable {
  label: string;
  token: string;
}

interface VariableSelectorProps {
  onSelect: (token: string) => void;
  eventFields?: any[]; // Campos adicionales del formulario del evento
}

export function VariableSelector({ onSelect, eventFields = [] }: VariableSelectorProps) {
  const baseVariables = {
    participante: [
      { label: "Nombre Completo", token: "{{nombre_participante}}" },
      { label: "Tipo Documento", token: "{{tipo_documento_participante}}" },
      { label: "Nro. Documento", token: "{{numero_documento_participante}}" },
      { label: "Correo Electrónico", token: "{{correo_participante}}" },
    ],
    evento: [
      { label: "Título", token: "{{evento_titulo}}" },
      { label: "Fecha Inicio", token: "{{evento_fecha_inicio}}" },
      { label: "Fecha Fin", token: "{{evento_fecha_fin}}" },
      { label: "Hora Inicio", token: "{{evento_hora_inicio}}" },
      { label: "Hora Fin", token: "{{evento_hora_fin}}" },
      { label: "Lugar", token: "{{evento_lugar}}" },
    ],
    sistema: [
      { label: "Nombre Remitente", token: "{{sistema_remitente}}" },
      { label: "Correo Contacto", token: "{{sistema_correo_contacto}}" },
      { label: "Teléfono Contacto", token: "{{sistema_telefono_contacto}}" },
      { label: "Sitio Web", token: "{{sistema_sitio_web}}" },
    ],
  };

  const VariableButton = ({ variable }: { variable: Variable }) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSelect(variable.token)}
            className="h-8 justify-start px-3 py-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-primary/5 rounded-lg text-[11px] font-bold group transition-all"
          >
            <Copy className="w-3 h-3 mr-2 text-slate-400 group-hover:text-primary transition-colors" />
            <span className="truncate">{variable.label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-slate-900 text-white border-0 text-[10px] font-bold">
          Insertar: {variable.token}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden">
      <CardHeader className="p-4 border-b border-slate-200/60 dark:border-slate-800">
        <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <FormInput className="w-3.5 h-3.5" />
          Variables Dinámicas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="p-4 space-y-6">
            
            {/* Categoría: Participante */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                <User className="w-3 h-3" /> Participante
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {baseVariables.participante.map((v) => (
                  <VariableButton key={v.token} variable={v} />
                ))}
              </div>
            </div>

            {/* Categoría: Evento */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Evento
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {baseVariables.evento.map((v) => (
                  <VariableButton key={v.token} variable={v} />
                ))}
              </div>
            </div>

            {/* Categoría: Formulario (Dinámico) */}
            {eventFields.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-amber-500/80 uppercase flex items-center gap-2">
                  <FormInput className="w-3.5 h-3.5" /> Formulario del Evento
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {eventFields.map((field) => (
                    <VariableButton 
                      key={field.nombre_campo || field.label} 
                      variable={{ 
                        label: field.label || field.nombre_campo, 
                        token: `{{${field.nombre_campo || field.label}}}`.toLowerCase().replace(/\s+/g, '_') 
                      }} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Categoría: Sistema */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                <Settings className="w-3 h-3" /> Sistema
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {baseVariables.sistema.map((v) => (
                  <VariableButton key={v.token} variable={v} />
                ))}
              </div>
            </div>

          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
