import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import BenefitsSection from "@/components/BenefitsSection";
import HowItWorksSection from "@/components/HowItWorksSection";

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen font-sans bg-slate-50 selection:bg-primary/20">
      {/* Navbar Publica */}
      <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/50 transition-all">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 flex items-center justify-center">
              <img
                src="/assets/Logo asistencia.png"
                alt="Logo GenniAsistent"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="font-extrabold text-lg tracking-tighter text-slate-800 dark:text-slate-100 uppercase italic">
              Genni<span className="text-primary italic">Asistent</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#beneficios" className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors">Beneficios</Link>
            <Link href="#como-funciona" className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors">Cómo Funciona</Link>
            <Link href="/precios" className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors">Precios</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm font-bold text-slate-700 hover:text-primary transition-colors">
              Iniciar Sesión
            </Link>
            <Link href="/registro">
              <Button className="font-bold rounded-xl shadow-md bg-primary hover:bg-primary/90">
                Pruébalo Gratis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* Superior Hero Section — Compacto para primer viewport */}
        <section className="relative overflow-hidden pt-16 pb-12 md:pt-24 md:pb-24 text-center px-4">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
          
          <div className="container max-w-5xl mx-auto space-y-7 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Badge eliminado para ahorrar espacio vertical */}
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
              Automatiza la <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-500 italic pr-2">Gestión de Eventos</span> 
              <br className="hidden md:block"/>y Emisión de Certificados.
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto font-medium">
              Elimina el trabajo manual. Controla inscripciones, gestiona asistencias con QR y genera miles de certificados PDF verificables en segundos desde un solo SaaS corporativo.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
              <Link href="/registro">
                <Button size="lg" className="h-14 px-8 rounded-full font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-all bg-primary text-white text-base w-full sm:w-auto">
                  Crear mi Organización
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="#como-funciona">
                <Button variant="outline" size="lg" className="h-14 px-8 rounded-full font-bold text-slate-700 border-slate-200 hover:bg-slate-50 text-base w-full sm:w-auto">
                  Descubrir Plataforma
                </Button>
              </Link>
            </div>
            
            <div className="pt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] font-bold text-slate-500/80">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Sin tarjeta requerida</span>
              <div className="hidden sm:block h-1 w-1 rounded-full bg-slate-300"></div>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Setup inicial en minutos</span>
            </div>
          </div>
        </section>

        {/* Logo Cloud / Prueba Social */}
        <section className="py-10 border-y border-slate-100 bg-white/50 backdrop-blur-sm">
           <div className="container max-w-7xl mx-auto px-4 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Confían en nuestra tecnología operativa</p>
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-40 grayscale contrast-125">
                <span className="text-xl font-bold text-slate-900 tracking-tighter uppercase whitespace-nowrap">Cámaras de Comercio</span>
                <span className="text-xl font-bold text-slate-900 tracking-tighter uppercase whitespace-nowrap">Instituciones Educativas</span>
                <span className="text-xl font-bold text-slate-900 tracking-tighter uppercase whitespace-nowrap">Empresas de Capacitación</span>
                <span className="text-xl font-bold text-slate-900 tracking-tighter uppercase whitespace-nowrap">Organizaciones y Eventos</span>
              </div>
           </div>
        </section>

        {/* Beneficios — componente premium con animaciones */}
        <BenefitsSection />

        {/* ¿Cómo funciona? — Stepper interactivo */}
        <HowItWorksSection />

        {/* CTA Final */}
        <section className="py-28 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,hsl(74_55%_51%/0.07),transparent)] pointer-events-none" />
          <div className="container max-w-3xl mx-auto px-4 text-center relative z-10">
            <p className="text-[10.5px] font-black uppercase tracking-[0.25em] text-primary/60 mb-5">
              Empieza hoy
            </p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-5">
              Simplifica tu operación.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-500 italic">
                Desde el primer evento.
              </span>
            </h2>
            <p className="text-[17px] text-slate-500 font-medium mb-10 max-w-xl mx-auto leading-relaxed">
              Crea tu organización, configura tu primer evento y emite certificados en minutos. Sin fricción, sin procesos manuales.
            </p>
            <Link href="/registro">
              <Button
                size="lg"
                className="h-14 px-10 rounded-full font-bold shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 text-[16px] bg-primary text-white"
              >
                Empieza ahora, es gratis
                <ArrowRight className="ml-2.5 w-5 h-5" />
              </Button>
            </Link>
            <p className="mt-5 text-[13px] text-slate-400 font-medium">
              Sin tarjeta requerida · Configuración inicial en minutos
            </p>
          </div>
        </section>
      </main>

      {/* Footer único — unificado */}
      <footer className="bg-white border-t border-slate-100">
        {/* Links legales */}
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-6 flex flex-wrap justify-center gap-x-8 gap-y-2">
          <Link href="#" className="text-[13px] font-semibold text-slate-400 hover:text-primary transition-colors">Términos de uso</Link>
          <div className="hidden sm:block w-px h-4 bg-slate-200 self-center" />
          <Link href="#" className="text-[13px] font-semibold text-slate-400 hover:text-primary transition-colors">Privacidad</Link>
          <div className="hidden sm:block w-px h-4 bg-slate-200 self-center" />
          <Link href="#" className="text-[13px] font-semibold text-slate-400 hover:text-primary transition-colors">Soporte corporativo</Link>
        </div>

        {/* Marca principal */}
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 pb-3 text-center">
          <div className="flex items-center justify-center gap-3">
            <img src="/assets/logo-gennia.png" alt="GENNIA" className="h-5 w-auto object-contain opacity-70" />
            <span className="text-[13px] font-black uppercase tracking-[0.15em] text-slate-700">Desarrollado por GENNIA</span>
          </div>
        </div>

        {/* Copyright */}
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 pb-8 text-center">
          <p className="text-[12px] text-slate-400 font-medium">
            © {new Date().getFullYear()} GenniAsistent. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
