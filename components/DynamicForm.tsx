"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { submitRegistration, updateRegistrationAction, cancelRegistrationAction } from "@/app/actions/registration";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { formatToBogota, isAvailable } from "@/lib/date";
import { checkExistingRegistration } from "@/app/actions/validation";
import { Loader2, AlertCircle, XCircle, MapPin, Building2, CreditCard } from "lucide-react";
import { COLOMBIA_DATA } from "@/lib/colombiaData";

const DOCUMENT_TYPES = [
  "Cédula de ciudadanía",
  "Tarjeta de identidad",
  "Cédula de extranjería",
  "Pasaporte",
  "Permiso por protección temporal",
  "NIT",
  "Registro civil",
  "Documento de identidad extranjero",
  "Otro"
];

const COMPANY_TYPES = [
  "Persona natural",
  "Persona jurídica",
  "SAS",
  "LTDA",
  "SA",
  "Sucursal extranjera",
  "Entidad pública",
  "ONG / ESAL",
  "Cooperativa",
  "Fundación",
  "Asociación",
  "Otro"
];

interface DynamicFormProps {
  eventoId: string;
  formularioId: string;
  eventoTitulo: string;
  eventoDescripcion?: string | null;
  eventoFechaInicio?: string | null;
  eventoHoraInicio?: string | null;
  eventoLugar?: string | null;
  fields: any[];
  fechaApertura?: string | null;
  fechaCierre?: string | null;
  formSlug: string;
  initialData?: any;
}

export function DynamicForm({ 
  eventoId, 
  formularioId, 
  eventoTitulo, 
  eventoDescripcion,
  eventoFechaInicio,
  eventoHoraInicio,
  eventoLugar,
  fields, 
  fechaApertura, 
  fechaCierre,
  formSlug,
  initialData
}: DynamicFormProps) {
  const [loading, setLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [validatingDoc, setValidatingDoc] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // 0. Normalizar campos (DB -> UI)
  const normalizedFields = (fields || []).map(f => {
    let type = f.tipo_campo;
    if (type === 'documento') type = 'documento_colombia';
    if (type === 'ubicacion') type = 'ubicacion_colombia';
    if (type === 'empresa') type = 'empresa_colombia';
    if (type === 'numero') type = 'number';
    return { ...f, tipo_campo: type };
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const availability = isAvailable(fechaApertura, fechaCierre);
  const isBeforeOpen = availability.isBefore;
  const isAfterClose = availability.isAfter;
  const isExpired = !availability.available;

  // LOGS TEMPORALES DE DIAGNÓSTICO
  useEffect(() => {
    if (mounted) {
      console.log("--- DIAGNÓSTICO DISPONIBILIDAD ---");
      console.log("Evento ID:", eventoId);
      console.log("Evento Título:", eventoTitulo);
      console.log("Formulario ID:", formularioId);
      console.log("Form Slug:", formSlug);
      console.log("Apertura (DB/Prop):", fechaApertura);
      console.log("Cierre (DB/Prop):", fechaCierre);
      console.log("Evento Fecha Inicio (Prop):", eventoFechaInicio);
      console.log("Evento Hora Inicio (Prop):", eventoHoraInicio);
      console.log("Ahora (System):", new Date().toISOString());
      console.log("Apertura (Parsed):", fechaApertura ? new Date(fechaApertura).toISOString() : 'N/A');
      console.log("Cierre (Parsed):", fechaCierre ? new Date(fechaCierre).toISOString() : 'N/A');
      console.log("isBeforeOpen:", isBeforeOpen);
      console.log("isAfterClose:", isAfterClose);
      console.log("isExpired:", isExpired);
      console.log("--- DIAGNÓSTICO CAMPOS ---");
      fields.forEach(f => {
        const normalized = normalizedFields.find(nf => nf.id === f.id);
        console.log(`Campo: ${f.label} | Original: ${f.tipo_campo} | Normalizado: ${normalized?.tipo_campo}`);
      });
      console.log("---------------------------");
    }
  }, [mounted, isBeforeOpen, isAfterClose, isExpired, fechaApertura, fechaCierre, fields, normalizedFields]);

  // Construir validación dinámica con Zod
  const buildZodSchema = () => {
    let schemaObj: any = {};
    
    // Iteramos por los campos dinámicos
    normalizedFields.forEach((field) => {
      if (field.tipo_campo === 'checkbox' && field.obligatorio) {
        schemaObj[field.id] = z.boolean().refine((val) => val === true, { message: "Debe aceptar esta condición" });
      } else if (field.tipo_campo === 'documento_colombia') {
        schemaObj[`${field.id}_tipo`] = z.string().min(1, "Seleccione el tipo de documento");
        schemaObj[`${field.id}_numero`] = z.string().min(1, "Ingrese el número de documento");
      } else if (field.tipo_campo === 'ubicacion_colombia') {
        schemaObj[`${field.id}_departamento`] = z.string().min(1, "Seleccione el departamento");
        schemaObj[`${field.id}_municipio`] = z.string().min(1, "Seleccione el municipio");
      } else if (field.tipo_campo === 'empresa_colombia') {
        schemaObj[`${field.id}_nombre`] = field.obligatorio ? z.string().min(1, "Ingrese el nombre de la empresa") : z.any().optional();
        schemaObj[`${field.id}_tipo`] = field.obligatorio ? z.string().min(1, "Seleccione el tipo de empresa") : z.any().optional();
      } else if (field.tipo_campo === 'tel') {
        schemaObj[field.id] = field.obligatorio ? z.string().min(1, "Este campo es obligatorio") : z.any().optional();
      } else if (field.tipo_campo === 'date') {
        schemaObj[field.id] = field.obligatorio ? z.string().min(1, "Seleccione una fecha") : z.any().optional();
      } else if (field.obligatorio) {
        if (field.tipo_campo === 'email') {
          schemaObj[field.id] = z.string().email("Correo electrónico inválido");
        } else {
          schemaObj[field.id] = z.string().min(1, "Este campo es obligatorio");
        }
      } else {
        schemaObj[field.id] = z.any().optional();
      }
    });

    return z.object({
      ...schemaObj,
      acepta_tratamiento: z.boolean().refine((val) => val === true, { message: "Debe aceptar el tratamiento de datos para continuar" })
    });
  };

  const schema = buildZodSchema();
  
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      ...normalizedFields.reduce((acc, field) => {
        // Si hay datos iniciales en respuestas_formulario, usarlos
        if (initialData?.respuestas?.[field.id] !== undefined) {
          acc[field.id] = initialData.respuestas[field.id];
          return acc;
        }

        const persona = initialData?.persona || {};

        if (field.tipo_campo === 'documento_colombia') {
          acc[`${field.id}_tipo`] = persona.tipo_documento || '';
          acc[`${field.id}_numero`] = persona.numero_documento || '';
          return acc;
        }
        if (field.tipo_campo === 'ubicacion_colombia') {
          acc[`${field.id}_departamento`] = persona.departamento || '';
          acc[`${field.id}_municipio`] = persona.municipio || '';
          return acc;
        }
        if (field.tipo_campo === 'empresa_colombia') {
          acc[`${field.id}_nombre`] = persona.empresa || '';
          acc[`${field.id}_tipo`] = (initialData?.respuestas?.[`${field.id}_tipo`]) || '';
          return acc;
        }

        // Mapeo legacy por si acaso
        const name = field.nombre_campo.toLowerCase();
        if (['tipo_documento', 'tipo_de_documento'].some(v => name.includes(v))) {
          acc[field.id] = persona.tipo_documento || '';
        } else if (['numero_documento', 'documento'].some(v => name.includes(v)) && !name.includes('tipo')) {
          acc[field.id] = persona.numero_documento || '';
        } else if (['nombres', 'nombre'].some(v => name === v || name.startsWith('nombre'))) {
          acc[field.id] = persona.nombres || '';
        } else if (['apellidos', 'apellido'].some(v => name === v || name.startsWith('apellido'))) {
          acc[field.id] = persona.apellidos || '';
        } else if (['correo', 'email'].some(v => name.includes(v))) {
          acc[field.id] = persona.correo || '';
        } else if (['telefono', 'teléfono', 'celular'].some(v => name.includes(v))) {
          acc[field.id] = persona.telefono || '';
        } else if (name.includes('empresa')) {
          acc[field.id] = persona.empresa || '';
        } else if (name.includes('cargo')) {
          acc[field.id] = persona.cargo || '';
        } else if (name.includes('municipio')) {
          acc[field.id] = persona.municipio || '';
        } else if (name.includes('departamento')) {
          acc[field.id] = persona.departamento || '';
        } else {
          acc[field.id] = field.tipo_campo === 'checkbox' ? false : '';
        }
        return acc;
      }, {} as any),
      acepta_tratamiento: initialData?.persona?.tratamiento_datos_aceptado || false
    }
  });

  const onCancel = async () => {
    if (!initialData?.persona?.id) return;
    if (!confirm("¿Estás seguro de que deseas cancelar tu inscripción? Se borrarán todos tus datos.")) return;
    
    setCanceling(true);
    try {
      const res = await cancelRegistrationAction(
        initialData.persona.id, 
        eventoId
      );
      if (res.success) {
        toast({ title: "Registro cancelado", description: "Tus datos han sido eliminados correctamente." });
        router.push("/");
      } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCanceling(false);
    }
  };

  if (mounted && isExpired) {
    return (
      <Card className="max-w-2xl mx-auto shadow-lg border-0 bg-muted/30">
        <CardContent className="py-12 flex flex-col items-center text-center space-y-4">
          <div className="bg-muted p-4 rounded-full">
            <span className="text-4xl text-muted-foreground">⏳</span>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Inscripciones no disponibles</CardTitle>
            <CardDescription className="text-lg mt-2">
              {isBeforeOpen 
                ? `Este formulario abrirá el ${formatToBogota(fechaApertura)}`
                : `Las inscripciones para este evento cerraron el ${formatToBogota(fechaCierre)}`
              }
            </CardDescription>
          </div>
          <div className="pt-4">
            <p className="text-sm text-muted-foreground italic">Puedes cerrar esta pestaña.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const validateDocument = async (value: string) => {
    if (!value || value.trim().length === 0) return;
    
    setValidatingDoc(true);
    setDuplicateError(null);
    
    try {
      const { exists, error } = await checkExistingRegistration(eventoId, value);
      if (error) {
        console.error("Validation error:", error);
      } else if (exists) {
        setDuplicateError("Esta cédula ya se encuentra registrada en este evento.");
      }
    } catch (err) {
      console.error("Error calling validation action:", err);
    } finally {
      setValidatingDoc(false);
    }
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    
    // Extraer campos individuales para el nuevo RPC
    const values: any = {
      tipo_documento: '',
      numero_documento: '',
      nombres: '',
      apellidos: '',
      correo: '',
      telefono: null,
      empresa: null,
      cargo: null,
      municipio: null,
      departamento: null,
      tratamiento_datos_aceptado: data.acepta_tratamiento || false
    };

    normalizedFields.forEach(f => {
      if (f.tipo_campo === 'documento_colombia') {
        values.tipo_documento = data[`${f.id}_tipo`];
        values.numero_documento = data[`${f.id}_numero`];
      } else if (f.tipo_campo === 'ubicacion_colombia') {
        values.departamento = data[`${f.id}_departamento`];
        values.municipio = data[`${f.id}_municipio`];
      } else if (f.tipo_campo === 'empresa_colombia') {
        values.empresa = data[`${f.id}_nombre`];
      } else {
        const val = data[f.id];
        const name = f.nombre_campo.toLowerCase();
        
        if (['tipo_documento', 'tipo_de_documento'].some(v => name.includes(v))) {
          values.tipo_documento = val;
        }
        if (['numero_documento', 'nmero_de_documento', 'documento'].some(v => name.includes(v)) && !name.includes('tipo')) {
          values.numero_documento = val;
        }
        if (['nombres', 'nombre'].some(v => name === v || name.startsWith('nombre'))) {
          values.nombres = val;
        }
        if (['apellidos', 'apellido'].some(v => name === v || name.startsWith('apellido'))) {
          values.apellidos = val;
        }
        if (['correo', 'email'].some(v => name.includes(v))) {
          values.correo = val;
        }
        if (['telefono', 'teléfono', 'celular', 'mvil', 'movil'].some(v => name.includes(v))) {
          values.telefono = val;
        }
        if (name.includes('empresa') || name.includes('organizacion')) {
          values.empresa = val;
        }
        if (name.includes('cargo') || name.includes('puesto')) {
          values.cargo = val;
        }
        if (name.includes('municipio') || name.includes('ciudad')) {
          values.municipio = val;
        }
        if (name.includes('departamento')) {
          values.departamento = val;
        }
        if (['tratamiento_datos', 'acepta_terminos', 'habeus_data', 'politica'].some(v => name.includes(v))) {
          if (!!val) values.tratamiento_datos_aceptado = true;
        }
      }
    });

    const payload = {
      ...values,
      p_respuesta_json: data
    };

    let res;
    if (initialData?.persona?.id) {
      res = await updateRegistrationAction(
        initialData.persona.id,
        eventoId,
        formularioId,
        payload,
        eventoTitulo
      );
    } else {
      res = await submitRegistration(formularioId, eventoId, payload, eventoTitulo);
    }
    
    setLoading(false);

    if (res.success) {
      toast({
        title: initialData ? "¡Edición exitosa!" : "¡Registro exitoso!",
        description: "Redirigiendo a verificación...",
      });
      
      const finalPersonaId = res.data?.persona_id || initialData?.persona?.id || '';
      
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('lastPersonaId', finalPersonaId);
        sessionStorage.setItem('lastEventId', eventoId);
      }

      const params = new URLSearchParams({
        personaId: finalPersonaId,
        inscripcionId: res.data?.inscripcion_id || initialData?.inscripcion_id || '',
        eventId: eventoId,
        email: values.correo,
        doc: values.numero_documento,
        type: values.tipo_documento,
        event: eventoTitulo,
        slug: formSlug
      });
      
      router.push(`/inscripcion-pendiente?${params.toString()}`);
    } else {
      toast({
        title: "Error en la inscripción",
        description: res.error,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8 text-center sm:text-left space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {eventoTitulo}
        </h1>
        
        {eventoDescripcion && (
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            {eventoDescripcion}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-4">
          {eventoFechaInicio && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200/60 dark:border-slate-700">
              <span className="text-primary text-xl">📅</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {formatToBogota(eventoFechaInicio, { weekday: 'short', day: 'numeric', month: 'long' })}
              </span>
            </div>
          )}
          {eventoHoraInicio && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200/60 dark:border-slate-700">
              <span className="text-primary text-xl">⏰</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {eventoHoraInicio}
              </span>
            </div>
          )}
          {eventoLugar && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200/60 dark:border-slate-700">
              <span className="text-primary text-xl">📍</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {eventoLugar}
              </span>
            </div>
          )}
        </div>
      </div>

      <Card className="shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border-0 bg-white/95 backdrop-blur-xl overflow-hidden rounded-[1.5rem] dark:bg-slate-900/90 relative">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-primary brightness-110"></div>
        
        <CardHeader className="pb-6 pt-10 px-6 sm:px-10 border-b border-slate-100 dark:border-slate-800/50">
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Registro de Asistencia</CardTitle>
          <CardDescription className="text-base mt-2 text-slate-500 dark:text-slate-400">
            Por favor, ingresa tu información para confirmar tu participación en este evento.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 sm:px-10 py-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

          {normalizedFields.map((field) => (
            <div key={field.id} className="space-y-3">
              <div className="flex items-center gap-2">
                {field.tipo_campo === 'checkbox' ? (
                  <div className="flex items-start gap-3 mt-2">
                    <Checkbox id={field.id} checked={form.watch(field.id)} onCheckedChange={(val) => form.setValue(field.id, val)} className="mt-1" />
                    <Label htmlFor={field.id} className="cursor-pointer text-base leading-relaxed text-slate-700 dark:text-slate-300">
                      {field.label} {field.obligatorio && <span className="text-destructive font-bold">*</span>}
                    </Label>
                  </div>
                ) : (
                  <Label className="text-base font-medium text-slate-700 dark:text-slate-300">
                    {field.label} {field.obligatorio && <span className="text-destructive font-bold">*</span>}
                  </Label>
                )}
              </div>
              
              {field.tipo_campo === 'text' && (
                <Input 
                  {...form.register(field.id)} 
                  onBlur={(e) => {
                    const name = field.nombre_campo.toLowerCase();
                    if (['numero_documento', 'nmero_de_documento', 'documento'].some(v => name.includes(v)) && !name.includes('tipo')) {
                      validateDocument(e.target.value);
                    }
                    form.register(field.id).onBlur(e);
                  }}
                />
              )}
              {field.tipo_campo === 'number' && (
                <Input 
                  type="number" 
                  {...form.register(field.id)} 
                  onBlur={(e) => {
                    const name = field.nombre_campo.toLowerCase();
                    if (['numero_documento', 'nmero_de_documento', 'documento'].some(v => name.includes(v)) && !name.includes('tipo')) {
                      validateDocument(e.target.value);
                    }
                    form.register(field.id).onBlur(e);
                  }}
                />
              )}
              {field.tipo_campo === 'tel' && (
                <Input type="tel" {...form.register(field.id)} />
              )}
              {field.tipo_campo === 'date' && (
                <Input type="date" {...form.register(field.id)} />
              )}
              {field.tipo_campo === 'email' && <Input type="email" {...form.register(field.id)} />}
              {field.tipo_campo === 'textarea' && <Textarea {...form.register(field.id)} />}
              
              {field.tipo_campo === 'select' && (
                <Select 
                  onValueChange={(val) => form.setValue(field.id, val)}
                  value={form.watch(field.id)}
                >
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(field.opciones_json) ? field.opciones_json : []).map((op: string, idx: number) => (
                      <SelectItem key={idx} value={op}>{op}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {field.tipo_campo === 'documento_colombia' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-12 lg:col-span-5">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Tipo</Label>
                      <Select 
                        onValueChange={(val) => form.setValue(`${field.id}_tipo`, val)}
                        value={form.watch(`${field.id}_tipo`)}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                          <CreditCard className="w-4 h-4 mr-2 text-primary/60" />
                          <SelectValue placeholder="Tipo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors[`${field.id}_tipo`] && (
                        <p className="text-xs text-destructive mt-1 font-medium">{form.formState.errors[`${field.id}_tipo`]?.message as string}</p>
                      )}
                    </div>
                    <div className="md:col-span-12 lg:col-span-7">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Número de Documento</Label>
                      <Input 
                        placeholder="Ingrese número"
                        className="h-12 rounded-xl"
                        {...form.register(`${field.id}_numero`)} 
                        onBlur={(e) => {
                          validateDocument(e.target.value);
                          form.register(`${field.id}_numero`).onBlur(e);
                        }}
                      />
                      {form.formState.errors[`${field.id}_numero`] && (
                        <p className="text-xs text-destructive mt-1 font-medium">{form.formState.errors[`${field.id}_numero`]?.message as string}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {field.tipo_campo === 'ubicacion_colombia' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Departamento</Label>
                    <Select 
                      onValueChange={(val) => {
                        form.setValue(`${field.id}_departamento`, val);
                        form.setValue(`${field.id}_municipio`, '');
                      }}
                      value={form.watch(`${field.id}_departamento`)}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                        <MapPin className="w-4 h-4 mr-2 text-primary/60" />
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {COLOMBIA_DATA.map((d) => (
                          <SelectItem key={d.departamento} value={d.departamento}>{d.departamento}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors[`${field.id}_departamento`] && (
                      <p className="text-xs text-destructive mt-1 font-medium">{form.formState.errors[`${field.id}_departamento`]?.message as string}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Municipio</Label>
                    <Select 
                      onValueChange={(val) => form.setValue(`${field.id}_municipio`, val)}
                      value={form.watch(`${field.id}_municipio`)}
                      disabled={!form.watch(`${field.id}_departamento`)}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(COLOMBIA_DATA.find(d => d.departamento === form.watch(`${field.id}_departamento`))?.municipios || []).map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors[`${field.id}_municipio`] && (
                      <p className="text-xs text-destructive mt-1 font-medium">{form.formState.errors[`${field.id}_municipio`]?.message as string}</p>
                    )}
                  </div>
                </div>
              )}

              {field.tipo_campo === 'empresa_colombia' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-12 lg:col-span-7">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Nombre de la Empresa</Label>
                    <Input 
                      placeholder="Ej. Mi Empresa S.A."
                      className="h-12 rounded-xl"
                      {...form.register(`${field.id}_nombre`)} 
                    />
                    {form.formState.errors[`${field.id}_nombre`] && (
                      <p className="text-xs text-destructive mt-1 font-medium">{form.formState.errors[`${field.id}_nombre`]?.message as string}</p>
                    )}
                  </div>
                  <div className="md:col-span-12 lg:col-span-5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Tipo de Empresa</Label>
                    <Select 
                      onValueChange={(val) => form.setValue(`${field.id}_tipo`, val)}
                      value={form.watch(`${field.id}_tipo`)}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                        <Building2 className="w-4 h-4 mr-2 text-primary/60" />
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors[`${field.id}_tipo`] && (
                      <p className="text-xs text-destructive mt-1 font-medium">{form.formState.errors[`${field.id}_tipo`]?.message as string}</p>
                    )}
                  </div>
                </div>
              )}
              
              {validatingDoc && (field.nombre_campo.toLowerCase().includes('documento') || field.tipo_campo === 'documento_colombia') && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Verificando disponibilidad...
                </div>
              )}

              {duplicateError && (field.nombre_campo.toLowerCase().includes('documento') || field.tipo_campo === 'documento_colombia') && (
                <div className="flex items-center gap-2 text-sm font-medium text-destructive bg-destructive/5 p-2 rounded-md border border-destructive/20 mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {duplicateError}
                </div>
              )}
              
              {form.formState.errors[field.id] && <p className="text-sm text-destructive">{form.formState.errors[field.id]?.message as string}</p>}
            </div>
          ))}

          <div className="space-y-5 pt-8 mt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-start gap-4 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200/60 dark:border-slate-700">
              <Checkbox 
                id="acepta_tratamiento" 
                checked={form.watch('acepta_tratamiento')} 
                onCheckedChange={(val) => form.setValue('acepta_tratamiento', val)} 
                className="mt-0.5"
              />
              <div className="grid gap-2 leading-none">
                <Label 
                  htmlFor="acepta_tratamiento" 
                  className="text-sm sm:text-base font-semibold leading-tight cursor-pointer text-slate-800 dark:text-slate-200"
                >
                  Acepto el tratamiento de mis datos personales <span className="text-destructive">*</span>
                </Label>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Al marcar esta casilla, autorizas el manejo de tu información de acuerdo con nuestra política de privacidad general para los eventos registrados.
                </p>
              </div>
            </div>
            {form.formState.errors.acepta_tratamiento && (
              <p className="text-sm text-destructive">{form.formState.errors.acepta_tratamiento?.message as string}</p>
            )}
          </div>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full mt-10 h-14 text-lg font-bold shadow-md hover:shadow-xl transition-all hover:-translate-y-1 active:scale-95 px-8" 
            disabled={loading || canceling || validatingDoc || !!duplicateError}
          >
            {loading ? "Procesando..." : initialData ? "Actualizar Inscripción ✨" : "Completar Inscripción ✨"}
          </Button>

          {initialData && (
            <Button 
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={loading || canceling}
              className="w-full mt-4 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold"
            >
              {canceling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              Cancelar Mi Inscripción (Eliminar datos)
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
    </div>
  );
}
