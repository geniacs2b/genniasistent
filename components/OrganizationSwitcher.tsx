"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronDown,
  Settings,
  Palette,
  Mail,
  UsersRound,
  CreditCard,
  Plus,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

// ─── Acciones rápidas del dropdown ───────────────────────────────────────────
const ORG_ACTIONS = [
  { label: "Configuración",     href: "/app/configuracion", icon: Settings  },
  { label: "Branding",          href: "/app/configuracion", icon: Palette,  note: "tab branding" },
  { label: "Correos",           href: "/app/correos",       icon: Mail      },
  { label: "Equipo",            href: "/app/configuracion", icon: UsersRound, pro: true },
  { label: "Suscripción / Plan",href: "/app/billing",       icon: CreditCard},
] as const;

// ─── Componente ───────────────────────────────────────────────────────────────
export function OrganizationSwitcher() {
  const [open,    setOpen]    = useState(false);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  // Cargar nombre e logo del tenant actual
  useEffect(() => {
    async function loadOrg() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const tenantId = user?.app_metadata?.tenant_id as string | undefined;
        if (!tenantId) return;

        const { data } = await supabase
          .from("tenants")
          .select("name, logo_url")
          .eq("id", tenantId)
          .single();

        if (data) {
          setOrgName(data.name);
          setOrgLogo(data.logo_url ?? null);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    loadOrg();
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Inicial del nombre (fallback cuando no hay logo)
  const initial = orgName ? orgName.charAt(0).toUpperCase() : "O";

  return (
    <div ref={ref} className="relative">
      {/* ── Trigger ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className={`
          flex items-center gap-2.5 h-8 px-3 rounded-lg border transition-all duration-150
          bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20
          text-slate-200 disabled:opacity-40
          ${open ? "bg-white/10 border-white/20" : ""}
        `}
      >
        {/* Avatar / logo */}
        <span className="flex items-center justify-center w-5 h-5 rounded-md overflow-hidden shrink-0 bg-primary/20">
          {orgLogo ? (
            <img src={orgLogo} alt={orgName ?? "Org"} className="w-full h-full object-contain" />
          ) : (
            <span className="text-[10px] font-black text-primary">{initial}</span>
          )}
        </span>

        {/* Nombre */}
        <span className="text-[13px] font-bold leading-none truncate max-w-[140px] text-slate-800 dark:text-slate-100">
          {loading ? "Cargando…" : orgName ?? "Organización"}
        </span>

        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-64 rounded-xl border border-white/10 bg-[#151820] shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">

          {/* Org header */}
          <div className="px-4 py-4 border-b border-white/8 bg-white/5 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 shadow-lg shadow-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                {orgLogo ? (
                  <img src={orgLogo} alt={orgName ?? "Org"} className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-sm font-black text-primary">{initial}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-white leading-tight truncate">
                  {orgName ?? "Mi Organización"}
                </p>
                <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">Organización activa</p>
              </div>
              {/* Check de "activo" */}
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
          </div>

          {/* Nota futura de multi-org (estructura preparada) */}
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-600">
              Acciones rápidas
            </p>
          </div>

          {/* Acciones */}
          <div className="px-2 pb-2 space-y-0.5">
            {ORG_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-slate-300 hover:bg-white/8 hover:text-white transition-colors group"
                >
                  <Icon className="h-3.5 w-3.5 text-slate-500 group-hover:text-primary transition-colors shrink-0" />
                  <span className="flex-1 leading-none">{action.label}</span>
                  {"pro" in action && action.pro && (
                    <span className="text-[9px] font-black uppercase tracking-wide bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full leading-none">
                      Pro
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Separador + Crear org (preparado para multi-org futuro) */}
          <div className="border-t border-white/8 px-2 py-2">
            <button
              disabled
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-slate-600 w-full cursor-not-allowed"
              title="Próximamente disponible"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 text-left leading-none">Crear organización</span>
              <span className="text-[9px] font-black uppercase tracking-wide bg-slate-800 text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded-full leading-none">
                Pronto
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
