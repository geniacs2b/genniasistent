import Link from "next/link";
import { Button } from "./ui/button";
import { CalendarDays } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/70 backdrop-blur-lg supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 flex items-center justify-center">
            <img src="/assets/logo-genniasistent.png" alt="GenniAsistent" className="h-full w-full object-contain" />
          </div>
          <span className="font-extrabold text-2xl tracking-tighter text-slate-900 dark:text-white uppercase italic">
            Genni<span className="text-primary italic">Asistent</span>
          </span>
        </Link>
        <nav className="flex items-center space-x-4">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm" className="font-semibold text-slate-600 hover:text-primary hover:bg-primary/5">
              Administración
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
