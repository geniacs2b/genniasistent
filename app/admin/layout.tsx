"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Calendar, FileText, Users, Clock, QrCode, FileImage, Award, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

const sidebarLinks = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Eventos", href: "/admin/eventos", icon: Calendar },
  { name: "Formularios", href: "/admin/formularios", icon: FileText },
  { name: "Inscritos", href: "/admin/inscritos", icon: Users },
  { name: "Sesiones", href: "/admin/sesiones", icon: Clock },
  { name: "Generar QR", href: "/admin/qr", icon: QrCode },
  { name: "Plantillas Cert.", href: "/admin/plantillas", icon: FileImage },
  { name: "Certificados", href: "/admin/certificados", icon: Award },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      {/* Premium Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-800 hidden md:flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)] z-10 relative">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/60">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-8 w-8 flex items-center justify-center">
              <img src="/assets/Logo asistencia.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <span className="font-extrabold text-lg tracking-tighter text-slate-800 dark:text-white uppercase italic">
              Genni<span className="text-primary italic">Asistent</span>
            </span>
          </Link>
          <div className="mt-6 border-t border-slate-100 dark:border-slate-800/40 pt-4">
            <span className="text-[10px] uppercase tracking-[0.2em] font-black text-primary/60 block mb-1">Plataforma</span>
            <span className="font-extrabold text-xl tracking-tighter text-slate-800 dark:text-white uppercase italic">
              Genni<span className="text-primary italic">Asistent</span>
            </span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            // Exact match for dashboard to prevent it from always being highlighted if others start with /admin
            const isActive = link.href === "/admin/dashboard" 
              ? pathname === "/admin/dashboard" 
              : pathname.startsWith(link.href);
              
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                  isActive 
                    ? "bg-indigo-50/80 dark:bg-indigo-500/10 text-primary font-semibold" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_8px_rgba(0,0,0,0.5)] shadow-primary/40"></div>
                )}
                <Icon className={`h-4 w-4 transition-colors ${isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`} />
                {link.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/60">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors group"
          >
            <LogOut className="h-4 w-4 text-rose-500/70 group-hover:text-rose-600 transition-colors" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header (Only visible when sidebar is hidden) */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between px-4 md:hidden z-10 sticky top-0 shadow-sm">
          <div className="flex items-center gap-3">
            <img src="/assets/Logo asistencia.png" alt="Logo" className="h-8 w-8 object-contain" />
            <span className="font-extrabold text-sm tracking-tighter text-slate-800 dark:text-white uppercase italic">
              Genni<span className="text-primary italic">Asistent</span>
            </span>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 flex items-center gap-1.5">
            <LogOut className="h-3 w-3" />
            Salir
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {/* Subtle background element */}
          <div className="fixed top-0 right-0 -m-32 w-96 h-96 bg-indigo-100/40 dark:bg-indigo-900/20 rounded-full blur-3xl pointer-events-none -mr-48 -mt-48"></div>
          <div className="relative z-10 min-h-full flex flex-col">
            <div className="flex-grow">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
