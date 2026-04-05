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
        <section className="py-24 bg-white relative">
           <div className="container max-w-4xl mx-auto px-4 text-center">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-6">¿Listo para evolucionar la operación de tus eventos?</h2>
              <p className="text-xl text-slate-600 mb-10 font-medium">Únete a las empresas que ya automatizan miles de horas manuales cada mes.</p>
              <Link href="/registro">
                <Button size="lg" className="h-16 px-10 rounded-full font-bold shadow-2xl shadow-primary/30 hover:scale-105 transition-all text-lg bg-primary text-white">
                  Empieza ahora, es gratis
                  <ArrowRight className="ml-2 w-6 h-6" />
                </Button>
              </Link>
           </div>
        </section>
      </main>

      {/* Footer Público */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-tighter text-slate-500 uppercase italic">
              Genni<span className="text-primary italic">Asistent</span>
            </span>
            <span className="text-slate-400 text-sm">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6 text-sm font-semibold text-slate-500">
            <Link href="#" className="hover:text-primary transition-colors">Términos</Link>
            <Link href="#" className="hover:text-primary transition-colors">Privacidad</Link>
            <Link href="#" className="hover:text-primary transition-colors">Soporte Corporativo</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
