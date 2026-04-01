"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Smartphone, Monitor } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface EmailPreviewProps {
  content: string;
  subject: string;
  config: any; // configuracion_correo_sistema
  exampleData?: Record<string, string>;
}

export function EmailPreview({ content, subject, config, exampleData = {} }: EmailPreviewProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  const defaultExampleData = {
    nombre_participante: "Dario Albenio Bastidas Ortiz",
    tipo_documento_participante: "CC",
    numero_documento_participante: "12.345.678",
    correo_participante: "dario.bastidas@ejemplo.com",
    evento_titulo: "Conferencia de Innovación 2026",
    evento_fecha_inicio: "15 de Septiembre, 2026",
    evento_hora_inicio: "08:00 AM",
    evento_lugar: "Auditorio Central - Bogotá",
    sistema_remitente: config?.nombre_remitente || "GenniAsistent",
    sistema_sitio_web: config?.sitio_web || "www.genniasistent.com",
    ...exampleData
  };

  const renderContent = () => {
    let html = content;
    Object.entries(defaultExampleData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      html = html.replace(regex, `<span class="bg-amber-100 text-amber-800 px-1 rounded font-bold">${value}</span>`);
    });
    return html;
  };

  const fullEmailHtml = `
    <div style="font-family: 'Inter', sans-serif; color: #1e293b; background-color: #f8fafc; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #e2e8f0;">
        
        <!-- Header / Logo -->
        ${config?.logo_url ? `
          <div style="padding: 30px; text-align: center; border-bottom: 1px solid #f1f5f9;">
            <img src="${config.logo_url}" alt="Logo" style="max-height: 50px; width: auto;" />
          </div>
        ` : ''}

        <!-- Content -->
        <div style="padding: 40px; line-height: 1.6;">
          <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">${subject || '(Sin Asunto)'}</h2>
          <div style="font-size: 15px; color: #475569;">
            ${renderContent()}
          </div>
        </div>

        <!-- Signature -->
        ${config?.firma_html ? `
          <div style="padding: 0 40px 40px 40px; font-size: 14px; border-top: 1px solid #f1f5f9; padding-top: 30px;">
            <div style="color: #64748b;">
              ${config.firma_html}
            </div>
          </div>
        ` : ''}

        <!-- Footer -->
        ${config?.mostrar_footer ? `
          <div style="background-color: #f1f5f9; padding: 30px; text-align: center; font-size: 12px; color: #94a3b8;">
            ${config.footer_html || ''}
            <div style="margin-top: 15px; display: flex; justify-content: center; gap: 10px;">
              ${config.sitio_web ? `<a href="${config.sitio_web}" style="color: #3b82f6; text-decoration: none;">Sitio Web</a>` : ''}
              ${config.email_contacto ? `<span style="margin: 0 8px;">•</span><a href="mailto:${config.email_contacto}" style="color: #3b82f6; text-decoration: none;">Contacto</a>` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  return (
    <Card className="border-slate-200/60 dark:border-slate-800 shadow-xl rounded-[2rem] overflow-hidden bg-white dark:bg-slate-950">
      <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          <CardTitle className="text-sm font-black uppercase tracking-widest italic">Vista Previa <span className="text-primary italic">Real-Time</span></CardTitle>
        </div>
        <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setViewMode("desktop")}
            className={`h-8 px-3 rounded-lg ${viewMode === "desktop" ? "bg-white dark:bg-slate-800 shadow-sm text-primary" : "text-slate-500"}`}
          >
            <Monitor className="w-4 h-4 mr-2" /> Desktop
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setViewMode("mobile")}
            className={`h-8 px-3 rounded-lg ${viewMode === "mobile" ? "bg-white dark:bg-slate-800 shadow-sm text-primary" : "text-slate-500"}`}
          >
            <Smartphone className="w-4 h-4 mr-2" /> Mobile
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 bg-slate-100 dark:bg-slate-900/50 flex justify-center py-10 transition-all">
        <div 
          className="transition-all duration-500 shadow-2xl bg-white border border-slate-200/60 rounded-xl overflow-hidden" 
          style={{ width: viewMode === "desktop" ? "100%" : "375px", maxWidth: "600px" }}
        >
          <iframe 
            srcDoc={fullEmailHtml} 
            title="Email Preview"
            className="w-full min-h-[500px] border-0"
          />
        </div>
      </CardContent>
    </Card>
  );
}
