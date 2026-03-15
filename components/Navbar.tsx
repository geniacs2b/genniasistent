import Link from "next/link";
import { Button } from "./ui/button";
import { CalendarDays } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-support bg-structural/90 backdrop-blur-lg supports-[backdrop-filter]:bg-structural/80 shadow-lg">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 flex items-center justify-center p-1 bg-white rounded-lg shadow-sm group-hover:scale-105 transition-transform">
            <img src="/assets/Logo asistencia.png" alt="Logo" className="h-full w-full object-contain" />
          </div>
          <span className="font-extrabold text-2xl tracking-tighter text-white uppercase italic">
            Genni<span className="text-primary italic">Asistent</span>
          </span>
        </Link>
        <nav className="flex items-center space-x-4">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm" className="font-semibold text-white/90 hover:text-primary hover:bg-white/10">
              Administración
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
