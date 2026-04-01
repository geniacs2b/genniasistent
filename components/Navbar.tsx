"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const isFormPage = pathname.startsWith("/inscripcion") || pathname.startsWith("/inscripcion-pendiente");

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-support backdrop-blur-lg supports-[backdrop-filter]:bg-opacity-80 shadow-lg transition-colors",
      isFormPage ? "bg-[#2F4F8F] border-white/10" : "bg-structural/90 shadow-lg"
    )}>
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          {isFormPage ? (
            <div className="h-14 w-auto flex items-center justify-center">
              <img 
                src="/assets/LOGO CCF blanco horizontal.png" 
                alt="Logo CCF" 
                className="h-full w-auto object-contain" 
              />
            </div>
          ) : (
            <>
              <div className="h-10 w-10 flex items-center justify-center p-1 bg-white rounded-lg shadow-sm group-hover:scale-105 transition-transform">
                <img src="/assets/Logo asistencia.png" alt="Logo" className="h-full w-full object-contain" />
              </div>
              <span className="font-extrabold text-2xl tracking-tighter text-white uppercase italic">
                Genni<span className="text-primary italic">Asistent</span>
              </span>
            </>
          )}
        </Link>
        {isHomePage && (
          <nav className="flex items-center space-x-4">
            <Link href="/admin/login">
              <Button variant="ghost" size="sm" className="font-semibold text-white/90 hover:text-primary hover:bg-white/10">
                Iniciar sesión
              </Button>
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
