"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Building2, Save, Image as ImageIcon, Link2, ExternalLink, Award, TrendingUp, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { updateTenantAction } from "@/app/actions/tenantActions";

export default function ConfiguracionEmpresaPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function loadTenant() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const tenantId = user?.app_metadata?.tenant_id;
        
        if (!tenantId) return;

        const { data } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", tenantId)
          .single();

        if (data) setTenant(data);
      } catch (err) {
        console.error("Error cargando configuración:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTenant();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await updateTenantAction({
        name:     tenant.name,
        domain:   tenant.domain,
        logo_url: tenant.logo_url,
      });

      if (!res.success) throw new Error(res.error);

      toast({
        title: "Configuración guardada",
        description: "Los datos de tu organización se han actualizado correctamente.",
      });
    } catch (err: any) {
      toast({
        title: "Error al guardar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Cargando perfil de organización...</div>;
  if (!tenant) return <div className="p-8 text-center text-red-500">No se encontró información del Tenant.</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-primary" />
          Mi Organización
        </h1>
        <p className="text-base text-slate-500 dark:text-slate-400 mt-2">
          Gestiona los detalles generales, imagen de marca corporativa y configuración de dominios transaccionales de {tenant.name}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Main Settings Form */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
             <div className="space-y-6">
                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nombre de la Empresa Comercial</label>
                   <input 
                      type="text" 
                      value={tenant.name || ""} 
                      onChange={(e) => setTenant({...tenant, name: e.target.value})}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                   />
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                     Dominio de Organización <span className="text-slate-400 font-normal">(opcional)</span>
                   </label>
                   <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Link2 className="h-4 w-4 text-slate-400" />
                      </div>
                      <input 
                          type="text" 
                          placeholder="ej. miempresa.com"
                          value={tenant.domain || ""}
                          onChange={(e) => setTenant({...tenant, domain: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                   </div>
                   <p className="text-xs text-slate-500 mt-2 font-medium">Usado para la validación pública de códigos de autenticidad en un futuro.</p>
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">URL del Logo (Branding)</label>
                   <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <ImageIcon className="h-4 w-4 text-slate-400" />
                      </div>
                      <input 
                          type="url" 
                          placeholder="https://..."
                          value={tenant.logo_url || ""}
                          onChange={(e) => setTenant({...tenant, logo_url: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                   </div>
                   <p className="text-xs text-slate-500 mt-2 font-medium">Debe ser una URL pública y en formato PNG / SVG con fondo transparente.</p>
                </div>
             </div>

             <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button type="submit" disabled={saving} className="h-12 px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-md">
                   {saving ? "Guardando..." : <><Save className="w-5 h-5 mr-2" /> Guardar Cambios</>}
                </Button>
             </div>
          </form>
        </div>

        {/* Sidebar Configuraciones Auxiliares */}
        <div className="space-y-6">

           {/* Cuota de Certificados */}
           {(tenant.certificate_quota != null || tenant.total_consumed != null) && (() => {
             const quota    = tenant.certificate_quota ?? 0;
             const consumed = tenant.total_consumed ?? 0;
             const remaining = Math.max(0, quota - consumed);
             const pct = quota > 0 ? Math.min(100, Math.round((consumed / quota) * 100)) : 0;
             const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
             return (
               <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                 <div className="flex items-center gap-2">
                   <BarChart3 className="w-5 h-5 text-primary" />
                   <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Cuota de Certificados</h3>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                     <p className="text-2xl font-extrabold text-emerald-600">{remaining.toLocaleString()}</p>
                     <p className="text-[11px] text-slate-500 font-medium mt-0.5">Disponibles</p>
                   </div>
                   <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                     <p className="text-2xl font-extrabold text-slate-700 dark:text-slate-300">{consumed.toLocaleString()}</p>
                     <p className="text-[11px] text-slate-500 font-medium mt-0.5">Emitidos</p>
                   </div>
                 </div>
                 <div className="space-y-1.5">
                   <div className="flex justify-between text-xs text-slate-500 font-medium">
                     <span>Uso del plan</span>
                     <span>{consumed.toLocaleString()} / {quota.toLocaleString()}</span>
                   </div>
                   <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                     <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                   </div>
                   <p className="text-[11px] text-slate-400">{pct}% consumido del plan actual</p>
                 </div>
               </div>
             );
           })()}

           <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
              {tenant.logo_url ? (
                  <div className="w-24 h-24 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center p-2 mb-4">
                     <img src={tenant.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                  </div>
              ) : (
                  <div className="w-24 h-24 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-4 border border-dashed border-slate-300 dark:border-slate-700">
                     <ImageIcon className="w-8 h-8 text-slate-400" />
                  </div>
              )}
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Logo Previsualizado</h3>
              <p className="text-xs text-slate-500 mt-1">Así lo verán tus participantes.</p>
           </div>

           <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
               <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Remitente Corporativo</h3>
               <p className="text-sm text-slate-500 mb-4 font-medium">Asegúrate de conectar tu propia cuenta de correo (GMail Workspace) para que los diplomas se envíen desde tu dominio.</p>
               <Link href="/app/correos">
                  <Button variant="outline" className="w-full text-primary border-primary/20 hover:bg-primary/5 font-semibold rounded-xl h-10">
                     Ir a Configuración de Envíos <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
               </Link>
           </div>

           <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-6 shadow-sm">
               <h3 className="font-bold text-amber-900 dark:text-amber-500 mb-2">ID Único de Sistema</h3>
               <p className="text-xs font-mono bg-white dark:bg-slate-950 px-2 py-1.5 rounded-md border border-amber-100 dark:border-amber-900/50 text-slate-600 block break-all">
                  {tenant.id}
               </p>
               <p className="text-[11px] text-amber-700 dark:text-amber-600 mt-3 font-medium">Usa este UUID proporcionándolo al equipo de soporte de GenniAsistent ante cualquier incidencia.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
