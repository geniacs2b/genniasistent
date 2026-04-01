"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Calendar, FileText, Users, Clock, QrCode, FileImage, Award, LogOut, Settings, Mail, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

const sidebarLinks = [
  { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { name: "Eventos", href: "/app/eventos", icon: Calendar },
  { name: "Formularios", href: "/app/formularios", icon: FileText },
  { name: "Participantes", href: "/app/participantes", icon: Users },
  { name: "Sesiones", href: "/app/sesiones", icon: Clock },
  { name: "Generar QR", href: "/app/qr", icon: QrCode },
  { name: "Diseño PDF", href: "/app/plantillas", icon: FileImage },
  { name: "Gestión de Correos", href: "/app/correos", icon: Mail },
  { name: "Leads", href: "/app/leads", icon: Sparkles },
  { name: "Configuración", href: "/app/configuracion", icon: Settings },
  { name: "Suscripción", href: "/app/billing", icon: Award },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Layout principal de la aplicación

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      {/* Premium Sidebar */}
      <aside className="w-64 bg-structural dark:bg-slate-950 border-r border-support hidden md:flex flex-col shadow-2xl z-10 relative">
        <div className="p-6 border-b border-support/50">
          <div className="pt-2">
            <span className="text-[10px] uppercase tracking-[0.2em] font-black text-primary block mb-1">Plataforma</span>
            <span className="font-extrabold text-xl tracking-tighter text-white uppercase italic">
              Genni<span className="text-primary italic">Asistent</span>
            </span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 scrollbar-thin scrollbar-thumb-support">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.href === "/app/dashboard" 
              ? pathname === "/app/dashboard" 
              : pathname.startsWith(link.href);
              
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                  isActive 
                    ? "bg-primary text-structural font-bold shadow-lg shadow-primary/20" 
                    : "text-white/70 hover:bg-white/5 hover:text-white font-medium"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-structural rounded-r-full"></div>
                )}
                <Icon className={`h-4 w-4 transition-colors ${isActive ? "text-structural" : "text-white/40 group-hover:text-primary"}`} />
                {link.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-support/50">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors group"
          >
            <LogOut className="h-4 w-4 text-rose-400/70 group-hover:text-rose-400 transition-colors" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header Unificado SaaS (Desktop & Mobile) */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 z-10 sticky top-0 shadow-sm transition-colors">
          <div className="flex items-center gap-3 md:hidden">
            <div className="h-8 w-8 bg-brand-green/10 rounded flex items-center justify-center p-1">
              <span className="text-brand-green font-bold text-sm">GA</span>
            </div>
            <span className="font-extrabold text-sm tracking-tighter text-slate-800 dark:text-slate-100 uppercase italic">
              Genni<span className="text-primary italic">Asistent</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-2">
            <div className="h-6 w-1 bg-primary rounded-full"></div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-none">Espacio de Trabajo</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center text-sm font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
               <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
               Operativo
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
            <button onClick={handleLogout} className="text-sm font-semibold text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-500/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 relative">
          {/* Subtle background element */}
          <div className="fixed top-0 right-0 -m-32 w-96 h-96 bg-primary/5 dark:bg-primary/5 rounded-full blur-[100px] pointer-events-none -mr-32 -mt-32"></div>
          <div className="relative z-10 min-h-full flex flex-col max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
