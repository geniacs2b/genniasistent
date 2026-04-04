"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Users,
  Clock,
  QrCode,
  FileImage,
  Award,
  LogOut,
  Settings,
  Mail,
  Sparkles,
  Activity,
  UsersRound,
  ChevronRight,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabaseClient";
import Image from "next/image";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";

// ─── Navegación operativa (sin grupo "Organización") ──────────────────────────
const NAV_GROUPS = [
  {
    label: "Principal",
    items: [
      { name: "Dashboard",     href: "/app/dashboard",     icon: LayoutDashboard },
      { name: "Eventos",       href: "/app/eventos",       icon: Calendar },
      { name: "Participantes", href: "/app/participantes", icon: Users },
      { name: "Sesiones",      href: "/app/sesiones",      icon: Clock },
      { name: "Formularios",   href: "/app/formularios",   icon: FileText },
      { name: "Leads",         href: "/app/leads",         icon: Sparkles },
    ],
  },
  {
    label: "Herramientas",
    items: [
      { name: "Genera QR",  href: "/app/qr",        icon: QrCode },
      { name: "Diseño PDF", href: "/app/plantillas", icon: FileImage },
      { name: "Correos",    href: "/app/correos",    icon: Mail },
      { name: "Monitoreo",  href: "/app/monitoreo",  icon: Activity },
    ],
  },
];

// ─── Tooltips para estado plegado ─────────────────────────────────────────────
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip flex">
      {children}
      <span
        className="
          pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3
          whitespace-nowrap rounded-md bg-slate-800 text-slate-100 text-[12px]
          font-medium px-2.5 py-1.5 shadow-xl border border-white/10
          opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100
          transition-all duration-150 z-50
        "
      >
        {text}
      </span>
    </div>
  );
}

// ─── NavItem — soporte expandido + plegado ────────────────────────────────────
function NavItem({
  href,
  icon: Icon,
  name,
  isActive,
  collapsed,
  pro = false,
}: {
  href: string;
  icon: React.ElementType;
  name: string;
  isActive: boolean;
  collapsed: boolean;
  pro?: boolean;
}) {
  const link = (
    <Link
      href={href}
      className={`
        relative flex items-center gap-3 rounded-lg text-[13px] font-medium
        transition-all duration-150 group
        ${collapsed ? "justify-center px-2 py-2.5 w-10" : "px-3 py-2 w-full"}
        ${isActive
          ? "bg-primary/15 text-primary"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
        }
      `}
    >
      {/* Acento activo */}
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
      )}

      <Icon
        className={`h-[15px] w-[15px] shrink-0 transition-colors ${
          isActive ? "text-primary" : "text-slate-500 group-hover:text-slate-300"
        }`}
      />

      {!collapsed && (
        <>
          <span className="flex-1 truncate leading-none">{name}</span>

          {pro && !isActive && (
            <span className="text-[9px] font-black tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full leading-none">
              Pro
            </span>
          )}

          {isActive && (
            <ChevronRight className="h-3 w-3 text-primary/60 ml-auto shrink-0" />
          )}
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return <Tooltip text={name}>{link}</Tooltip>;
  }

  return link;
}

// ─── Breadcrumb dinámico ──────────────────────────────────────────────────────
const ROUTE_LABELS: Record<string, string> = {
  "/app/dashboard":     "Dashboard",
  "/app/eventos":       "Eventos",
  "/app/participantes": "Participantes",
  "/app/sesiones":      "Sesiones",
  "/app/formularios":   "Formularios",
  "/app/leads":         "Leads",
  "/app/qr":            "Genera QR",
  "/app/plantillas":    "Diseño PDF",
  "/app/correos":       "Correos",
  "/app/monitoreo":     "Monitoreo",
  "/app/configuracion": "Configuración",
  "/app/equipo":        "Equipo",
  "/app/billing":       "Suscripción",
};

function usePageTitle(pathname: string): string {
  const match = Object.entries(ROUTE_LABELS).find(([key]) =>
    pathname === key || pathname.startsWith(key + "/")
  );
  return match ? match[1] : "GenniAsistent";
}

// ─── Layout principal ─────────────────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const supabase  = createClient();
  const [collapsed, setCollapsed] = useState(false);

  const pageTitle = usePageTitle(pathname);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) =>
    href === "/app/dashboard"
      ? pathname === "/app/dashboard"
      : pathname.startsWith(href);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">

      {/* ── Sidebar colapsable ────────────────────────────────────────────── */}
      <aside
        className={`
          hidden md:flex flex-col
          bg-[#0f1117] border-r border-white/5
          transition-all duration-200 ease-in-out
          z-20 relative shrink-0
          ${collapsed ? "w-[60px]" : "w-[220px]"}
        `}
      >
        {/* Logo — solo visible en estado expandido */}
        <div
          className={`
            h-14 flex items-center border-b border-white/5 shrink-0 overflow-hidden
            ${collapsed ? "justify-center px-0" : "px-5"}
          `}
        >
          {collapsed ? (
            <div className="h-7 w-7 shrink-0">
              <Image
                src="/assets/Logo asistencia.png"
                alt="GenniAsistent"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 shrink-0">
                <Image
                  src="/assets/Logo asistencia.png"
                  alt="GenniAsistent"
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
              <span className="font-extrabold text-[14px] tracking-tight text-white uppercase italic leading-none whitespace-nowrap">
                Genni<span className="text-primary">Asistent</span>
              </span>
            </div>
          )}
        </div>

        {/* Navegación agrupada */}
        <nav
          className={`
            flex-1 overflow-y-auto py-4 space-y-5
            scrollbar-thin scrollbar-thumb-white/10
            ${collapsed ? "px-2" : "px-3"}
          `}
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {/* Etiqueta de grupo — oculta en modo plegado */}
              {!collapsed && (
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-600 px-3 mb-1.5">
                  {group.label}
                </p>
              )}

              {/* Separador mínimo en modo plegado */}
              {collapsed && (
                <div className="h-px bg-white/5 mx-1 mb-2" />
              )}

              <div className={`space-y-0.5 ${collapsed ? "flex flex-col items-center" : ""}`}>
                {group.items.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    name={item.name}
                    isActive={isActive(item.href)}
                    collapsed={collapsed}
                    pro={"pro" in item ? (item as { pro?: boolean }).pro : false}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer — Cerrar Sesión */}
        <div
          className={`
            shrink-0 py-4 border-t border-white/5
            ${collapsed ? "px-2 flex justify-center" : "px-3"}
          `}
        >
          {collapsed ? (
            <Tooltip text="Cerrar Sesión">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150"
              >
                <LogOut className="h-[15px] w-[15px] shrink-0" />
              </button>
            </Tooltip>
          ) : (
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150 group"
            >
              <LogOut className="h-[15px] w-[15px] shrink-0 text-slate-600 group-hover:text-rose-400 transition-colors" />
              Cerrar Sesión
            </button>
          )}
        </div>
      </aside>

      {/* ── Contenido principal ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Header limpio ─────────────────────────────────────────────── */}
        <header className="
          h-14 bg-white dark:bg-[#0d1117]
          border-b border-slate-200/70 dark:border-white/6
          flex items-center justify-between px-4
          z-10 sticky top-0
          shadow-[0_1px_3px_rgba(0,0,0,0.06)]
          transition-colors shrink-0
        ">
          {/* Zona izquierda: botón colapsar + breadcrumb */}
          <div className="flex items-center gap-3">
            {/* Botón toggle sidebar (desktop) */}
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="hidden md:flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/6 transition-all duration-150"
              aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
              {collapsed
                ? <PanelLeftOpen className="h-4 w-4" />
                : <PanelLeftClose className="h-4 w-4" />
              }
            </button>

            {/* Botón hamburguesa móvil (placeholder visual; lógica mobile expandible si se necesita) */}
            <button
              className="md:hidden flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/6 transition"
              aria-label="Menú"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Separador visual */}
            <div className="hidden md:block h-5 w-px bg-slate-200 dark:bg-white/8" />

            {/* Breadcrumb / contexto de página */}
            <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 leading-none">
              {pageTitle}
            </span>
          </div>

          {/* Zona derecha: org switcher */}
          <div className="flex items-center gap-3">
            <OrganizationSwitcher />
          </div>
        </header>

        {/* ── Canvas principal ───────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 relative">
          <div className="fixed top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none -mr-32 -mt-32" />
          <div className="relative z-10 min-h-full flex flex-col max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
