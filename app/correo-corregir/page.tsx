"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { correctEmailAndResend } from "@/app/actions/emailCorrection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const schema = z.object({
  tipo_documento: z.string().min(1, "Seleccione el tipo de documento"),
  numero_documento: z.string().min(1, "El número de documento es requerido"),
  nuevo_correo: z.string().email("Debe ser un correo válido"),
});

export default function CorregirCorreoPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo_documento: "",
      numero_documento: "",
      nuevo_correo: "",
    }
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    const res = await correctEmailAndResend(data.numero_documento, data.tipo_documento, data.nuevo_correo);
    setLoading(false);

    if (res.success) {
      toast({
        title: "Correo Actualizado",
        description: "Hemos enviado un nuevo enlace de verificación a tu correo.",
      });
      router.push("/");
    } else {
      toast({
        title: "Error",
        description: res.error,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-24 px-4 max-w-lg">
      <Card className="shadow-lg border-0 bg-card">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">Corregir Correo</CardTitle>
          <CardDescription>
            Si cometiste un error en tu correo durante la inscripción, puedes actualizarlo aquí para recibir el enlace de verificación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Select onValueChange={(val) => form.setValue('tipo_documento', val)} defaultValue={form.getValues('tipo_documento')}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                  <SelectItem value="TI">Tarjeta de Identidad</SelectItem>
                  <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                  <SelectItem value="PAS">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.tipo_documento && <p className="text-sm text-destructive">{form.formState.errors.tipo_documento.message as string}</p>}
            </div>

            <div className="space-y-2">
              <Label>Número de Documento</Label>
              <Input {...form.register('numero_documento')} placeholder="Ej. 123456789" />
               {form.formState.errors.numero_documento && <p className="text-sm text-destructive">{form.formState.errors.numero_documento.message as string}</p>}
            </div>

            <div className="space-y-2">
              <Label>Nuevo Correo Electrónico</Label>
              <Input type="email" {...form.register('nuevo_correo')} placeholder="nuevo.correo@ejemplo.com" />
               {form.formState.errors.nuevo_correo && <p className="text-sm text-destructive">{form.formState.errors.nuevo_correo.message as string}</p>}
            </div>

            <Button type="submit" className="w-full mt-6" disabled={loading}>
              {loading ? "Procesando..." : "Actualizar correo y reenviar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
