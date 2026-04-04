"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { saveEmailConfigAction, sendTestEmailAction } from "@/app/actions/emailActions";
import { connectGmailWithSupabase } from "@/lib/authHelper";
import {
  Save, Globe, Phone, Mail, MapPin as MapMarker, Facebook, Instagram, Linkedin, Twitter,
  Loader2, Info, CheckCircle2, XCircle, AlertCircle, Send, RefreshCw, Eye,
} from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { EmailPreview } from "@/components/EmailPreview";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.849L.057 23.571a.75.75 0 0 0 .921.921l5.799-1.485A11.946 11.946 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.715 9.715 0 0 1-4.963-1.357l-.356-.212-3.683.943.976-3.565-.232-.368A9.718 9.718 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.6-4.12-1.31a8.776 8.776 0 0 1-1.87-1.42v7.74c.04 4.14-2.88 8.04-6.99 8.91-4.11.87-8.49-1.39-9.84-5.32-1.39-3.91.43-8.52 4.19-10.34 1.16-.57 2.45-.83 3.73-.81v3.91c-.81-.07-1.63.05-2.38.38-.93.41-1.67 1.2-1.99 2.16-.39.98-.24 2.16.42 2.94.61.76 1.61 1.15 2.58 1.01.99-.11 1.84-.81 2.13-1.74.12-.42.15-.86.15-1.3v-11.4c-.01-1.05.01-2.11-.01-3.16Z" />
  </svg>
);

// ── Códigos de país para WhatsApp ────────────────────────────────────────────
const PAISES_WHATSAPP = [
  { code: '+57',  flag: '🇨🇴', nombre: 'Colombia' },
  { code: '+58',  flag: '🇻🇪', nombre: 'Venezuela' },
  { code: '+51',  flag: '🇵🇪', nombre: 'Perú' },
  { code: '+593', flag: '🇪🇨', nombre: 'Ecuador' },
  { code: '+56',  flag: '🇨🇱', nombre: 'Chile' },
  { code: '+54',  flag: '🇦🇷', nombre: 'Argentina' },
  { code: '+55',  flag: '🇧🇷', nombre: 'Brasil' },
  { code: '+52',  flag: '🇲🇽', nombre: 'México' },
  { code: '+53',  flag: '🇨🇺', nombre: 'Cuba' },
  { code: '+502', flag: '🇬🇹', nombre: 'Guatemala' },
  { code: '+503', flag: '🇸🇻', nombre: 'El Salvador' },
  { code: '+504', flag: '🇭🇳', nombre: 'Honduras' },
  { code: '+505', flag: '🇳🇮', nombre: 'Nicaragua' },
  { code: '+506', flag: '🇨🇷', nombre: 'Costa Rica' },
  { code: '+507', flag: '🇵🇦', nombre: 'Panamá' },
  { code: '+591', flag: '🇧🇴', nombre: 'Bolivia' },
  { code: '+595', flag: '🇵🇾', nombre: 'Paraguay' },
  { code: '+598', flag: '🇺🇾', nombre: 'Uruguay' },
  { code: '+1',   flag: '🇺🇸', nombre: 'EE.UU. / Canadá' },
  { code: '+34',  flag: '🇪🇸', nombre: 'España' },
  { code: '+44',  flag: '🇬🇧', nombre: 'Reino Unido' },
  { code: '+49',  flag: '🇩🇪', nombre: 'Alemania' },
  { code: '+33',  flag: '🇫🇷', nombre: 'Francia' },
  { code: '+39',  flag: '🇮🇹', nombre: 'Italia' },
  { code: '+351', flag: '🇵🇹', nombre: 'Portugal' },
];

/** Separa el código de país del número local al cargar un valor guardado. */
function parsearNumeroWhatsapp(valor: string | null | undefined): { pais: string; numero: string } {
  if (!valor) return { pais: '+57', numero: '' };
  const limpio = valor.startsWith('+') ? valor : `+${valor}`;
  // Ordenar de mayor a menor longitud para evitar falso match (+1 antes de +57)
  const codigosOrdenados = [...PAISES_WHATSAPP]
    .map(p => p.code)
    .sort((a, b) => b.length - a.length);
  for (const codigo of codigosOrdenados) {
    if (limpio.startsWith(codigo)) {
      return { pais: codigo, numero: limpio.slice(codigo.length) };
    }
  }
  // Fallback: sin coincidencia conocida — mantener todo como número
  return { pais: '+57', numero: limpio.replace(/^\+/, '') };
}

interface OAuthConfig {
  id: string;
  provider: string;
  sender_email: string;
  is_active: boolean;
  token_expires_at: string | null;
}

interface ConfigCorreoTabProps {
  config: any;
  oauthConfig: OAuthConfig | null;
}

export function ConfigCorreoTab({ config, oauthConfig }: ConfigCorreoTabProps) {
  const [loading, setLoading] = useState(false);
  const [firmaHtml, setFirmaHtml] = useState(config?.firma_html || "");
  const [footerHtml, setFooterHtml] = useState(config?.footer_html || "");
  const [mostrarFooter, setMostrarFooter] = useState(config?.mostrar_footer ?? true);
  const [showPreview, setShowPreview] = useState(false);
  const [testEmail, setTestEmail]   = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const { toast } = useToast();

  // WhatsApp: código de país + número local separados
  const { pais: paisInicial, numero: numeroInicial } = parsearNumeroWhatsapp(config?.whatsapp_numero);
  const [whatsappPais, setWhatsappPais]     = useState(paisInicial);
  const [whatsappNumero, setWhatsappNumero] = useState(numeroInicial);

  // Colores del correo
  const [headerBgColor,     setHeaderBgColor]     = useState<string>(config?.header_bg_color     || '#27498b');
  const [headerBgSecondary, setHeaderBgSecondary] = useState<string>(config?.header_bg_secondary || '#3f67d8');
  const [footerBgColor,     setFooterBgColor]     = useState<string>(config?.footer_bg_color     || '#1e2847');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("firma_html", firmaHtml);
    formData.set("footer_html", footerHtml);
    formData.set("mostrar_footer", String(mostrarFooter));
    const numLimpio = whatsappNumero.replace(/\D/g, '');
    formData.set("whatsapp_numero",     numLimpio ? `${whatsappPais}${numLimpio}` : '');
    formData.set("header_bg_color",     headerBgColor);
    formData.set("header_bg_secondary", headerBgSecondary);
    formData.set("footer_bg_color",     footerBgColor);

    try {
      const res = await saveEmailConfigAction(formData);
      if (res.success) {
        toast({ title: "Configuración guardada", description: "Los cambios se aplicaron correctamente." });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error de red", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSendTest() {
    if (!testEmail.trim()) {
      toast({ title: "Ingresa un correo", description: "Escribe la dirección destino del correo de prueba.", variant: "destructive" });
      return;
    }
    setSendingTest(true);
    try {
      const res = await sendTestEmailAction(testEmail.trim());
      if (res.success) {
        toast({ title: "Correo de prueba enviado", description: res.message });
      } else {
        toast({ title: "Error al enviar", description: res.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error de red", description: err.message, variant: "destructive" });
    } finally {
      setSendingTest(false);
    }
  }

  // Estado del OAuth para el indicador visual
  const oauthConnected = !!oauthConfig?.is_active;
  const tokenExpired   = oauthConfig?.token_expires_at
    ? new Date(oauthConfig.token_expires_at) < new Date()
    : false;

  // Config actual para la vista previa (usa datos del formulario actual)
  const previewConfig = config ?? {};

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-12">
      <input type="hidden" name="id" value={config?.id || ""} />

      {/* ── Motor de Envío OAuth ─────────────────────────────────────────── */}
      <Card className="shadow-sm border-slate-200/60 dark:border-slate-800 rounded-3xl overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Motor de Envío (OAuth)</CardTitle>
              <CardDescription>Conecta una cuenta de Google Workspace o Gmail para enviar tus certificados.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-6">

          {/* ── Indicador de estado de conexión ──────────────────────────── */}
          {oauthConfig ? (
            <div className={`rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              oauthConnected && !tokenExpired
                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30"
                : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30"
            }`}>
              <div className="flex items-center gap-4">
                {oauthConnected && !tokenExpired ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-amber-500 shrink-0" />
                )}
                <div>
                  <p className={`font-bold text-sm ${oauthConnected && !tokenExpired ? "text-emerald-800 dark:text-emerald-400" : "text-amber-800 dark:text-amber-400"}`}>
                    {oauthConnected && !tokenExpired ? "Cuenta conectada y activa" : tokenExpired ? "Token expirado — reconectar" : "Cuenta desconectada"}
                  </p>
                  <p className="text-sm font-mono text-slate-600 dark:text-slate-400 mt-0.5">{oauthConfig.sender_email}</p>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">Proveedor: {oauthConfig.provider}</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => connectGmailWithSupabase()}
                className="shrink-0 flex items-center gap-2 h-10 px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 shadow-sm rounded-xl font-bold transition-all text-slate-700 dark:text-slate-300 text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Reconectar
              </Button>
            </div>
          ) : (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <XCircle className="w-8 h-8 text-red-500 shrink-0" />
                <div>
                  <p className="font-bold text-sm text-red-800 dark:text-red-400">Sin cuenta de envío conectada</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Los certificados no podrán ser enviados por correo hasta que conectes una cuenta.</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => connectGmailWithSupabase()}
                className="shrink-0 flex items-center gap-2 h-10 px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 shadow-sm rounded-xl font-bold transition-all text-slate-700 dark:text-slate-300 text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Conectar cuenta Google
              </Button>
            </div>
          )}

          {/* ── Correo de prueba ─────────────────────────────────────────── */}
          {oauthConnected && !tokenExpired && (
            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" /> Enviar Correo de Prueba
              </p>
              <div className="flex gap-3">
                <Input
                  type="email"
                  placeholder="destinatario@ejemplo.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="h-11 bg-white dark:bg-slate-900 rounded-xl border-slate-200 flex-1"
                />
                <Button
                  type="button"
                  onClick={handleSendTest}
                  disabled={sendingTest}
                  className="h-11 px-5 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shrink-0"
                >
                  {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Enviar</>}
                </Button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Se enviará un correo con datos de ejemplo usando tu branding actual.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Identidad del Remitente ──────────────────────────────────────── */}
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

      {/* ── Firma y Footer ───────────────────────────────────────────────── */}
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
            <RichTextEditor content={firmaHtml} onChange={setFirmaHtml} placeholder="Ej. Cordialmente, Equipo de Eventos" />
            <p className="text-[11px] text-slate-500 font-medium italic">Esta firma se añadirá al final de los correos si la plantilla lo permite.</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700">
              <Checkbox
                id="mostrar_footer"
                checked={mostrarFooter}
                onCheckedChange={(v) => setMostrarFooter(v as boolean)}
                className="w-5 h-5"
              />
              <Label htmlFor="mostrar_footer" className="text-sm font-bold cursor-pointer">Mostrar Footer Institucional en cada correo</Label>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Mensaje del Footer (Opcional)</Label>
            <RichTextEditor content={footerHtml} onChange={setFooterHtml} placeholder="Ej. Este es un correo automático, por favor no lo respondas." />
          </div>
        </CardContent>
      </Card>

      {/* ── Apariencia del Correo ────────────────────────────────────────── */}
      <Card className="shadow-sm border-slate-200/60 dark:border-slate-800 rounded-3xl overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-xl">
              <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Apariencia del Correo</CardTitle>
              <CardDescription>Personaliza los colores del header y footer del correo institucional.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8">

          {/* Previsualización en miniatura */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
            {/* Mini header */}
            <div
              className="h-14 flex items-center justify-center"
              style={{ background: `linear-gradient(90deg,${headerBgColor} 0%,${headerBgSecondary} 100%)` }}
            >
              <span className="text-[10px] font-semibold tracking-widest text-white/60 uppercase">
                Logo institucional
              </span>
            </div>
            {/* Mini body */}
            <div className="bg-white dark:bg-slate-900 px-6 py-4 text-xs text-slate-400 text-center">
              Cuerpo del correo · botones · redes sociales
            </div>
            {/* Mini footer */}
            <div className="h-8 flex items-center justify-center"
                 style={{ background: footerBgColor }}>
              <span className="text-[10px]" style={{ color: '#8b95b0' }}>Aviso legal del correo</span>
            </div>
          </div>

          {/* Inputs de colores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Color principal del header */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Color principal del header
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={headerBgColor}
                  onChange={e => setHeaderBgColor(e.target.value)}
                  className="h-11 w-11 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-900 shrink-0"
                />
                <Input
                  value={headerBgColor}
                  onChange={e => setHeaderBgColor(e.target.value)}
                  className="h-11 font-mono text-sm bg-white/70 rounded-xl border-slate-200 uppercase flex-1"
                  maxLength={7}
                  placeholder="#27498b"
                />
              </div>
            </div>

            {/* Color secundario del header (gradiente) */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Color secundario del header
                <span className="ml-1 font-normal text-slate-400 normal-case">(gradiente)</span>
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={headerBgSecondary}
                  onChange={e => setHeaderBgSecondary(e.target.value)}
                  className="h-11 w-11 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-900 shrink-0"
                />
                <Input
                  value={headerBgSecondary}
                  onChange={e => setHeaderBgSecondary(e.target.value)}
                  className="h-11 font-mono text-sm bg-white/70 rounded-xl border-slate-200 uppercase flex-1"
                  maxLength={7}
                  placeholder="#3f67d8"
                />
              </div>
              <p className="text-[11px] text-slate-400">Deja igual al principal para color sólido.</p>
            </div>

            {/* Color del footer */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Color del footer legal
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={footerBgColor}
                  onChange={e => setFooterBgColor(e.target.value)}
                  className="h-11 w-11 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-900 shrink-0"
                />
                <Input
                  value={footerBgColor}
                  onChange={e => setFooterBgColor(e.target.value)}
                  className="h-11 font-mono text-sm bg-white/70 rounded-xl border-slate-200 uppercase flex-1"
                  maxLength={7}
                  placeholder="#1e2847"
                />
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ── Contacto y Redes Sociales ────────────────────────────────────── */}
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

          {/* WhatsApp — selector de país + número */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 tracking-wider">
              <WhatsAppIcon className="w-3 h-3 text-green-500" /> WhatsApp
            </Label>
            <div className="flex gap-2">
              <select
                value={whatsappPais}
                onChange={e => setWhatsappPais(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white/70 px-2 text-sm text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                title="Código de país"
              >
                {PAISES_WHATSAPP.map(p => (
                  <option key={p.code} value={p.code}>
                    {p.flag} {p.code} {p.nombre}
                  </option>
                ))}
              </select>
              <Input
                value={whatsappNumero}
                onChange={e => setWhatsappNumero(e.target.value.replace(/\D/g, ''))}
                placeholder="3118121136"
                maxLength={15}
                className="h-11 bg-white/70 rounded-xl border-slate-200 flex-1"
              />
            </div>
            {whatsappNumero && (
              <p className="text-xs text-slate-400">
                Enlace generado: wa.me/{whatsappPais.replace('+', '')}{whatsappNumero}
              </p>
            )}
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
          <div className="space-y-3">
            <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 tracking-wider">
              <TikTokIcon className="w-3 h-3 text-[#000000] dark:text-white" /> TikTok (URL)
            </Label>
            <Input name="tiktok_url" defaultValue={config?.tiktok_url} className="h-11 bg-white/70 rounded-xl border-slate-200" />
          </div>
        </CardContent>
      </Card>

      {/* ── Vista Previa en tiempo real ──────────────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={() => setShowPreview(v => !v)}
          className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors mb-4"
        >
          <Eye className="w-4 h-4" />
          {showPreview ? "Ocultar vista previa del correo" : "Ver cómo lucirá el correo de certificado"}
        </button>

        {showPreview && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-400">
            <EmailPreview
              content="<p>Estimado/a <strong>{{nombre_participante}}</strong>, te informamos que tu certificado de participación en <strong>{{evento_titulo}}</strong> ya está disponible.</p>"
              subject={`Certificado de "${config?.nombre_remitente ?? "tu organización"}"`}
              config={previewConfig}
            />
          </div>
        )}
      </div>

      {/* ── Botón de Guardado ────────────────────────────────────────────── */}
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
