import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";

import PublicLayoutWrapper from "@/components/PublicLayoutWrapper";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "GenniAsistent | Plataforma de Gestión",
  description: "Gestión integral de capacitaciones, asistencia por QR y certificados.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={cn("font-sans", jakarta.variable)} suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased text-foreground flex flex-col", jakarta.variable)}>
        <PublicLayoutWrapper>
          <div className="flex-grow">
            {children}
          </div>
        </PublicLayoutWrapper>
        
        <Toaster />
      </body>
    </html>
  );
}
