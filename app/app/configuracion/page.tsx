"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Save, Image as ImageIcon, Link2, ExternalLink,
  BarChart3, Trash2, Upload, Lock, Users, Crown,
  Palette, Globe, Mail, UserPlus, Shield, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import {
  updateTenantAction,
  uploadLogoAction,
  deleteLogoAction,
  getTeamMembersAction,
  inviteTeamMemberAction,
} from "@/app/actions/tenantActions";
import { isPlanAtLeast } from "@/lib/planConfig";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Tab = "org" | "branding" | "equipo";

interface TeamMember {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  joined_at: string;
}

/* ─── Pro Lock Overlay ───────────────────────────────────────────────────── */
function ProLock({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40 blur-[1px]">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 px-4 py-2 rounded-full text-sm font-bold shadow">
          <Lock className="w-4 h-4" />
          Función disponible en Plan Pro
        </div>
        <Link href="/app/billing">
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-5">
            <Crown className="w-4 h-4 mr-1.5" /> Ver planes
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ─── Color Input ────────────────────────────────────────────────────────── */
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-shrink-0">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5 bg-white"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{label}</p>
        <input
          type="text"
          value={value}
          onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && onChange(e.target.value)}
          maxLength={7}
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </div>
  );
}

/* ─── Role Badge ─────────────────────────────────────────────────────────── */
const ROLE_LABELS: Record<string, { label: string; cls: string }> = {
  owner:  { label: "Propietario", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  admin:  { label: "Admin",       cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"     },
  member: { label: "Miembro",     cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"    },
};

/* ══════════════════════════════════════════════════════════════════════════
   Main Page Component
═══════════════════════════════════════════════════════════════════════════ */
export default function ConfiguracionEmpresaPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("org");
  const { toast } = useToast();
  const supabase = createClient();

  // Branding state
  const [headerBgColor,     setHeaderBgColor]     = useState("#27498b");
  const [headerBgSecondary, setHeaderBgSecondary] = useState("#3f67d8");

  // Logo state
  const [logoPreview,    setLogoPreview]    = useState<string | null>(null);
  const [logoFile,       setLogoFile]       = useState<File | null>(null);
  const [uploadingLogo,  setUploadingLogo]  = useState(false);
  const [deletingLogo,   setDeletingLogo]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Team state
  const [members,         setMembers]         = useState<TeamMember[]>([]);
  const [loadingMembers,  setLoadingMembers]  = useState(false);
  const [inviteEmail,     setInviteEmail]     = useState("");
  const [inviteRole,      setInviteRole]      = useState<"admin" | "member">("member");
  const [inviting,        setInviting]        = useState(false);

  /* ── Load tenant ────────────────────────────────────────────────────── */
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

        if (data) {
          setTenant(data);
          setLogoPreview(data.logo_url ?? null);
          setHeaderBgColor(data.public_header_bg_color ?? "#27498b");
          setHeaderBgSecondary(data.public_header_bg_secondary ?? "#3f67d8");
        }
      } catch (err) {
        console.error("Error cargando configuración:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTenant();
  }, []);

  /* ── Load team members when tab is activated ────────────────────────── */
  useEffect(() => {
    if (activeTab !== "equipo" || members.length > 0) return;
    setLoadingMembers(true);
    getTeamMembersAction().then((res) => {
      if (res.success) setMembers(res.members as TeamMember[]);
      setLoadingMembers(false);
    });
  }, [activeTab]);

  const isPro = tenant ? isPlanAtLeast(tenant, "pro") : false;

  /* ── Save org info ──────────────────────────────────────────────────── */
  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateTenantAction({
        name:     tenant.name,
        domain:   tenant.domain,
        logo_url: tenant.logo_url,
      });
      if (!res.success) throw new Error(res.error);
      toast({ title: "Organización guardada" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /* ── Logo: preview on file select ──────────────────────────────────── */
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  };

  /* ── Logo: upload ───────────────────────────────────────────────────── */
  const handleUploadLogo = async () => {
    if (!logoFile) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("logo", logoFile);
      const res = await uploadLogoAction(fd);
      if (!res.success) throw new Error(res.error);
      setTenant((t: any) => ({ ...t, logo_url: res.logo_url }));
      setLogoPreview(res.logo_url ?? null);
      setLogoFile(null);
      toast({ title: "Logo actualizado correctamente" });
    } catch (err: any) {
      toast({ title: "Error subiendo logo", description: err.message, variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  /* ── Logo: delete ───────────────────────────────────────────────────── */
  const handleDeleteLogo = async () => {
    setDeletingLogo(true);
    try {
      const res = await deleteLogoAction();
      if (!res.success) throw new Error(res.error);
      setTenant((t: any) => ({ ...t, logo_url: null }));
      setLogoPreview(null);
      setLogoFile(null);
      toast({ title: "Logo eliminado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeletingLogo(false);
    }
  };

  /* ── Save branding ──────────────────────────────────────────────────── */
  const handleSaveBranding = async () => {
    setSaving(true);
    try {
      const res = await updateTenantAction({
        name:                       tenant.name,
        public_header_bg_color:     headerBgColor,
        public_header_bg_secondary: headerBgSecondary,
      });
      if (!res.success) throw new Error(res.error);
      setTenant((t: any) => ({
        ...t,
        public_header_bg_color:     headerBgColor,
        public_header_bg_secondary: headerBgSecondary,
      }));
      toast({ title: "Branding guardado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /* ── Invite team member ─────────────────────────────────────────────── */
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await inviteTeamMemberAction(inviteEmail.trim(), inviteRole);
      if (!res.success) throw new Error(res.error);
      toast({ title: "Invitación enviada", description: res.message });
      setInviteEmail("");
      // Refresh member list
      const fresh = await getTeamMembersAction();
      if (fresh.success) setMembers(fresh.members as TeamMember[]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────────────
     Render
  ─────────────────────────────────────────────────────────────────────── */
  if (loading)
    return <div className="p-8 text-center text-slate-500 animate-pulse">Cargando configuración...</div>;
  if (!tenant)
    return <div className="p-8 text-center text-red-500">No se encontró información del Tenant.</div>;

  const quota    = tenant.certificate_quota ?? 0;
  const consumed = tenant.total_consumed    ?? 0;
  const remaining = Math.max(0, quota - consumed);
  const pct       = quota > 0 ? Math.min(100, Math.round((consumed / quota) * 100)) : 0;
  const barColor  = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "org",      label: "Mi Organización", icon: <Building2 className="w-4 h-4" /> },
    { id: "branding", label: "Branding Público", icon: <Palette className="w-4 h-4" /> },
    { id: "equipo",   label: "Equipo",           icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-primary" />
          Mi Organización
        </h1>
        <p className="text-base text-slate-500 dark:text-slate-400 mt-2">
          Gestiona el perfil, branding y equipo de {tenant.name}.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id !== "org" && !isPro && (
              <Lock className="w-3 h-3 text-amber-500" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Mi Organización ──────────────────────────────────────────── */}
      {activeTab === "org" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            {/* Info form */}
            <form onSubmit={handleSaveOrg} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Nombre de la Empresa
                </label>
                <input
                  type="text"
                  value={tenant.name || ""}
                  onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Dominio <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ej. miempresa.com"
                    value={tenant.domain || ""}
                    onChange={(e) => setTenant({ ...tenant, domain: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5 font-medium">
                  Usado para validación pública de certificados.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button type="submit" disabled={saving} className="h-11 px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white">
                  {saving ? "Guardando..." : <><Save className="w-4 h-4 mr-2" /> Guardar Cambios</>}
                </Button>
              </div>
            </form>

            {/* Logo upload */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Logo de la Organización</h3>
              </div>

              <div className="flex items-start gap-6">
                {/* Preview */}
                <div
                  className="w-24 h-24 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                      <Upload className="w-6 h-6" />
                      <span className="text-[10px] font-medium">Subir</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    PNG, SVG, JPG o WebP · máx. 2 MB · fondo transparente recomendado
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl font-semibold border-primary/30 text-primary hover:bg-primary/5"
                    >
                      <Upload className="w-4 h-4 mr-1.5" />
                      {logoPreview ? "Cambiar logo" : "Subir logo"}
                    </Button>

                    {logoFile && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleUploadLogo}
                        disabled={uploadingLogo}
                        className="rounded-xl font-bold bg-primary text-white"
                      >
                        {uploadingLogo ? "Subiendo..." : <><Save className="w-4 h-4 mr-1.5" /> Guardar logo</>}
                      </Button>
                    )}

                    {(tenant.logo_url || logoPreview) && !logoFile && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteLogo}
                        disabled={deletingLogo}
                        className="rounded-xl font-semibold border-red-200 text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                      >
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        {deletingLogo ? "Eliminando..." : "Quitar logo"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoFileChange}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Cuota */}
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

            {/* Correos */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Gestión de Correos</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4">Conecta tu cuenta Gmail Workspace para envíos desde tu dominio.</p>
              <Link href="/app/correos">
                <Button variant="outline" className="w-full text-primary border-primary/20 hover:bg-primary/5 font-semibold rounded-xl h-10">
                  Configurar envíos <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* System ID */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-amber-900 dark:text-amber-500 mb-2 text-sm">ID del Tenant</h3>
              <p className="text-[11px] font-mono bg-white dark:bg-slate-950 px-2 py-1.5 rounded-md border border-amber-100 dark:border-amber-900/50 text-slate-600 break-all">
                {tenant.id}
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-600 mt-2">Proporciona este ID al soporte ante cualquier incidencia.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Branding Público ─────────────────────────────────────────── */}
      {activeTab === "branding" && (
        <div className="max-w-2xl space-y-6">
          {isPro ? (
            <>
              {/* Preview */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Vista previa — Cabecera de formularios</h3>
                </div>
                <p className="text-sm text-slate-500">
                  Así verán el encabezado los participantes al abrir un formulario de registro o página de sesión.
                </p>

                {/* Mini preview */}
                <div
                  className="rounded-xl overflow-hidden shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${headerBgColor} 0%, ${headerBgSecondary} 100%)`,
                  }}
                >
                  <div className="flex items-center justify-center py-6 px-8">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="max-h-14 max-w-[160px] object-contain" />
                    ) : (
                      <span className="text-white/60 text-sm font-semibold italic">Sin logo</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Color pickers */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Colores de cabecera</h3>

                <ColorField
                  label="Color primario (izquierda del degradado)"
                  value={headerBgColor}
                  onChange={setHeaderBgColor}
                />
                <ColorField
                  label="Color secundario (derecha del degradado)"
                  value={headerBgSecondary}
                  onChange={setHeaderBgSecondary}
                />

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <Button
                    onClick={handleSaveBranding}
                    disabled={saving}
                    className="h-11 px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white"
                  >
                    {saving ? "Guardando..." : <><Save className="w-4 h-4 mr-2" /> Guardar Branding</>}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-slate-400 px-1">
                Estos colores afectan los formularios de inscripción pública y las páginas de sesión.
                El logo se gestiona en la pestaña <strong>Mi Organización</strong>.
              </p>
            </>
          ) : (
            <ProLock>
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-8 space-y-6 pointer-events-none">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Colores de formularios públicos</h3>
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl w-full" />
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl w-3/4" />
                <div className="h-32 rounded-xl" style={{ background: "linear-gradient(135deg, #27498b 0%, #3f67d8 100%)" }} />
              </div>
            </ProLock>
          )}
        </div>
      )}

      {/* ── Tab: Equipo ───────────────────────────────────────────────────── */}
      {activeTab === "equipo" && (
        <div className="max-w-2xl space-y-6">
          {isPro ? (
            <>
              {/* Invite form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Invitar miembro</h3>
                </div>
                <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    placeholder="correo@empresa.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="member">Miembro</option>
                    <option value="admin">Admin</option>
                  </select>
                  <Button type="submit" disabled={inviting} className="rounded-xl font-bold bg-primary text-white h-12 px-6">
                    {inviting ? "Enviando..." : "Invitar"}
                  </Button>
                </form>
                <p className="text-xs text-slate-400">El invitado recibirá un correo con un enlace válido por 7 días.</p>
              </div>

              {/* Members list */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Miembros activos</h3>
                  <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                    {members.length}
                  </span>
                </div>

                {loadingMembers ? (
                  <div className="p-8 text-center text-slate-400 animate-pulse">Cargando equipo...</div>
                ) : members.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No hay miembros registrados.</div>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {members.map((m) => {
                      const role = ROLE_LABELS[m.role] ?? { label: m.role, cls: "bg-slate-100 text-slate-600" };
                      return (
                        <li key={m.user_id} className="flex items-center gap-4 px-6 py-4">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {(m.full_name || m.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{m.full_name || "—"}</p>
                            <p className="text-xs text-slate-500 truncate">{m.email}</p>
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${role.cls}`}>
                            {role.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <ProLock>
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-8 space-y-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Gestión de equipo</h3>
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-4 py-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                      </div>
                      <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </ProLock>
          )}
        </div>
      )}
    </div>
  );
}
