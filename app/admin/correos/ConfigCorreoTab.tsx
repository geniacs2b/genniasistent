"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { saveEmailConfigAction } from "@/app/actions/emailActions";
import { Save, Globe, Phone, Mail, MapPin as MapMarker, Facebook, Instagram, Linkedin, Twitter, Loader2, Info } from "lucide-react";

interface ConfigCorreoTabProps {
  config: any;
}

export function ConfigCorreoTab({ config }: ConfigCorreoTabProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await saveEmailConfigAction(formData);
      if (res.success) {
        toast({ title: "Configuración guardada", description: "Los cambios se aplicaron correctamente." });
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
    <form onSubmit={handleSubmit} className="space-y-8 pb-12">
      <input type="hidden" name="id" value={config?.id || ""} />
      
      {/* Sección 1: Identidad del Remitente */}
      <Card className="shadow-sm border-slate-200/60 dark:border-slate-800 rounded-3xl overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Identidad del Remitente</CardTitle>
              <CardDescription>Configura cómo aparecerán tus correos ante los destinatarios.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nombre del Remitente</Label>
            <Input name="nombre_remitente" defaultValue={config?.nombre_remitente} placeholder="Ej. Eventos Institucionales" className="h-12 bg-white/70 dark:bg-slate-900 rounded-xl border-slate-200" required />
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Email de Respuesta (Reply-To)</Label>
            <Input name="email_respuesta" type="email" defaultValue={config?.email_respuesta} placeholder="ejemplo@organizacion.com" className="h-12 bg-white/70 dark:bg-slate-900 rounded-xl border-slate-200" required />
          </div>
          <div className="space-y-3 md:col-span-2">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">URL del Logo Institucional</Label>
            <Input name="logo_url" defaultValue={config?.logo_url} placeholder="https://tusitio.com/logo.png" className="h-12 bg-white/70 dark:bg-slate-900 rounded-xl border-slate-200" />
            <p className="text-[11px] text-slate-500 font-medium italic">Se recomienda una imagen con fondo transparente y altura de 60px.</p>
          </div>
        </CardContent>
      </Card>

      {/* Sección 2: Firma y Footer (Rich Text Simulation) */}
      <Card className="shadow-sm border-slate-200/60 dark:border-slate-800 rounded-3xl overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <Info className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Diseño del Correo</CardTitle>
              <CardDescription>Personaliza la firma y el pie de página institucional.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="space-y-3">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Firma Institucional (Texto Enriquecido)</Label>
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-inner focus-within:ring-2 focus-within:ring-primary/20 transition-all">
               <textarea 
                 name="firma_html" 
                 defaultValue={config?.firma_html} 
                 className="w-full min-h-[120px] p-4 text-sm focus:outline-none resize-none font-sans" 
                 placeholder="Ej. <p>Cordialmente,<br><b>Equipo de Eventos</b></p>"
               />
            </div>
            <p className="text-[11px] text-slate-500 font-medium italic">Próximamente editor WYSIWYG completo. Por ahora puedes usar etiquetas HTML básicas.</p>
          </div>

          <div className="space-y-3">
             <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700">
                <Checkbox id="mostrar_footer" name="mostrar_footer" defaultChecked={config?.mostrar_footer ?? true} value="true" className="w-5 h-5" />
                <Label htmlFor="mostrar_footer" className="text-sm font-bold cursor-pointer">Mostrar Footer Institucional en cada correo</Label>
             </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Mensaje del Footer (Opcional)</Label>
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-inner focus-within:ring-2 focus-within:ring-primary/20 transition-all">
               <textarea 
                 name="footer_html" 
                 defaultValue={config?.footer_html} 
                 className="w-full min-h-[80px] p-4 text-sm focus:outline-none resize-none font-sans" 
                 placeholder="Ej. <p>Este es un correo automático, por favor no lo respondas.</p>"
               />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección 3: Datos de Contacto y Redes */}
      <Card className="shadow-sm border-slate-200/60 dark:border-slate-800 rounded-3xl overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Globe className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Contacto y Redes Sociales</CardTitle>
              <CardDescription>Información complementaria para el pie de página.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-3 flex flex-col">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Phone className="w-3 h-3" /> Teléfono
            </Label>
            <Input name="telefono_contacto" defaultValue={config?.telefono_contacto} className="h-11 bg-white/70 rounded-xl border-slate-200" />
          </div>
          <div className="space-y-3 flex flex-col">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Mail className="w-3 h-3" /> Email Contacto
            </Label>
            <Input name="email_contacto" defaultValue={config?.email_contacto} className="h-11 bg-white/70 rounded-xl border-slate-200" />
          </div>
          <div className="space-y-3 flex flex-col">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-3 h-3" /> Sitio Web
            </Label>
            <Input name="sitio_web" defaultValue={config?.sitio_web} className="h-11 bg-white/70 rounded-xl border-slate-200" />
          </div>
          <div className="space-y-3 flex flex-col md:col-span-2 lg:col-span-3">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <MapMarker className="w-3 h-3" /> Dirección
            </Label>
            <Input name="direccion_contacto" defaultValue={config?.direccion_contacto} className="h-11 bg-white/70 rounded-xl border-slate-200" />
          </div>
          
          <div className="space-y-3">
            <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 tracking-wider">
               <Facebook className="w-3 h-3 text-blue-600" /> Facebook (URL)
            </Label>
            <Input name="facebook_url" defaultValue={config?.facebook_url} className="h-11 bg-white/70 rounded-xl border-slate-200" />
          </div>
          <div className="space-y-3">
            <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 tracking-wider">
               <Instagram className="w-3 h-3 text-pink-600" /> Instagram (URL)
            </Label>
            <Input name="instagram_url" defaultValue={config?.instagram_url} className="h-11 bg-white/70 rounded-xl border-slate-200" />
          </div>
          <div className="space-y-3">
            <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 tracking-wider">
               <Linkedin className="w-3 h-3 text-blue-700" /> LinkedIn (URL)
            </Label>
            <Input name="linkedin_url" defaultValue={config?.linkedin_url} className="h-11 bg-white/70 rounded-xl border-slate-200" />
          </div>
          <div className="space-y-3">
            <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 tracking-wider">
               <Twitter className="w-3 h-3 text-slate-900" /> X / Twitter (URL)
            </Label>
            <Input name="x_url" defaultValue={config?.x_url} className="h-11 bg-white/70 rounded-xl border-slate-200" />
          </div>
        </CardContent>
      </Card>

      {/* Botón Flotante / Sticky de Guardado */}
      <div className="sticky bottom-8 flex justify-center z-50">
        <Button 
          type="submit" 
          disabled={loading}
          className="h-14 px-10 rounded-full font-bold shadow-2xl shadow-primary/40 flex items-center gap-3 scale-110 active:scale-100 transition-all hover:-translate-y-1 bg-primary text-white"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Guardar Configuración Institucional
        </Button>
      </div>
    </form>
  );
}
