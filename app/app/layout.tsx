"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Building2,
  UsersRound,
  Palette,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabaseClient";
import Image from "next/image";

// ─── Estructura de navegación por grupos ─────────────────────────────────────
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
      { name: "Genera QR",         href: "/app/qr",        icon: QrCode },
      { name: "Diseño PDF",        href: "/app/plantillas", icon: FileImage },
      { name: "Correos",           href: "/app/correos",    icon: Mail },
      { name: "Monitoreo",         href: "/app/monitoreo",  icon: Activity },
    ],
  },
  {
    label: "Organización",
    items: [
      { name: "Configuración",  href: "/app/configuracion", icon: Settings },
      { name: "Equipo",         href: "/app/equipo",        icon: UsersRound,  pro: true },
      { name: "Suscripción",    href: "/app/billing",       icon: Award },
    ],
  },
];

// ─── Componente NavItem ───────────────────────────────────────────────────────
function NavItem({
  href,
  icon: Icon,
  name,
  isActive,
  pro = false,
}: {
  href: string;
  icon: React.ElementType;
  name: string;
  isActive: boolean;
  pro?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium
        transition-all duration-150 group
        ${isActive
          ? "bg-primary/15 text-primary"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
        }
      `}
    >
      {/* Acento activo */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
      )}

      <Icon
        className={`h-[15px] w-[15px] shrink-0 transition-colors ${
          isActive ? "text-primary" : "text-slate-500 group-hover:text-slate-300"
        }`}
      />

      <span className="flex-1 truncate leading-none">{name}</span>

      {pro && !isActive && (
        <span className="text-[9px] font-black tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full leading-none">
          Pro
        </span>
      )}

      {isActive && (
        <ChevronRight className="h-3 w-3 text-primary/60 ml-auto shrink-0" />
      )}
    </Link>
  );
}

// ─── Layout principal ─────────────────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

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
    <div className="flex h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">

      {/* ── Sidebar Pro ──────────────────────────────────────────────────── */}
      <aside className="w-[220px] bg-[#0f1117] border-r border-white/5 hidden md:flex flex-col z-10 relative">

        {/* Marca / Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/5 shrink-0">
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
            <span className="font-extrabold text-[15px] tracking-tight text-white uppercase italic leading-none">
              Genni<span className="text-primary">Asistent</span>
            </span>
          </div>
        </div>

        {/* Navegación agrupada */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin scrollbar-thumb-white/10">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {/* Etiqueta de grupo */}
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-600 px-3 mb-1.5">
                {group.label}
              </p>

              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    name={item.name}
                    isActive={isActive(item.href)}
                    pro={item.pro}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer del sidebar — Cerrar Sesión */}
        <div className="shrink-0 px-3 py-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150 group"
          >
            <LogOut className="h-[15px] w-[15px] shrink-0 text-slate-600 group-hover:text-rose-400 transition-colors" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── Contenido principal ───────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden relative">

        {/* Header — solo visible en móvil (el sidebar está hidden en mobile) */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 z-10 sticky top-0 shadow-sm transition-colors">
          {/* Logo móvil */}
          <div className="flex items-center gap-3 md:hidden">
            <div className="h-8 w-8 flex items-center justify-center">
              <img
                src="/assets/Logo asistencia.png"
                alt="Logo GenniAsistent"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="font-extrabold text-sm tracking-tighter text-slate-800 dark:text-slate-100 uppercase italic">
              Genni<span className="text-primary italic">Asistent</span>
            </span>
          </div>

          {/* Placeholder desktop (header limpio) */}
          <div className="hidden md:block" />

          {/* Bloque Operativo + Cerrar Sesión — oculto visualmente, lógica intacta */}
          <div className="hidden">
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center text-sm font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                Operativo
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
              <button
                onClick={handleLogout}
                className="text-sm font-semibold text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-500/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </header>

        {/* Canvas principal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 relative">
          <div className="fixed top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none -mr-32 -mt-32" />
          <div className="relative z-10 min-h-full flex flex-col max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
