"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { usePathname } from "next/navigation";

export default function PublicLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Ocultar Navbar y Footer en rutas del app shell (sidebar + header propio) y autenticación
  const isAppShell = pathname.startsWith("/app");
  const isAuthPage = pathname === "/login" || pathname === "/registro";
  // La landing y precios tienen su propio header, footer y CTA inline
  const isCustomLayout = pathname === "/" || pathname === "/precios";

  if (isAppShell || isAuthPage || isCustomLayout) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
