"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { signInWithGoogle } from "@/lib/authHelper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isExpired = searchParams?.get('expired') === 'true';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
       toast({
         title: "Error de autenticación",
         description: "Credenciales inválidas. Por favor intente de nuevo.",
         variant: "destructive"
       });
    } else {
       localStorage.setItem("session_start_time", Date.now().toString());
       localStorage.setItem("last_activity_time", Date.now().toString());
       
       router.push("/app/dashboard");
       router.refresh();
    }
  }
  
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (error: any) {
      setLoading(false);
      toast({
        title: "Error de Google Auth",
        description: error.message,
        variant: "destructive"
       });
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:to-slate-900 px-4">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none opacity-20 dark:opacity-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/30 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-blue-400/20 blur-[100px]" />
      </div>

      {isExpired && (
        <div className="mb-8 animate-in fade-in slide-in-from-top-2 duration-700 w-full max-w-md bg-rose-50/80 backdrop-blur-md border border-rose-100 text-rose-700 px-6 py-4 rounded-3xl flex items-center gap-4 font-semibold shadow-xl shadow-rose-900/5 z-10 transition-all">
          <div className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
          <span className="text-[15px]">Tu sesión ha expirado por seguridad.</span>
        </div>
      )}

      <Card className="w-full max-w-md shadow-[0_32px_64px_-16px_rgba(0,0,0,0.12)] border border-white/50 bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden z-10 transition-all duration-300 hover:shadow-[0_48px_80px_-16px_rgba(0,0,0,0.16)]">
        <CardHeader className="space-y-6 text-center pt-12 pb-8 px-8 md:px-12">
          <div className="flex justify-center mb-4 transform transition-transform hover:scale-105 duration-300">
            <div className="p-4 bg-white rounded-3xl shadow-xl shadow-black/5 border border-slate-50">
              <img src="/assets/Logo asistencia.png" alt="GenniAsistent" className="h-16 w-auto object-contain" />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl md:text-4xl font-black tracking-tight text-[#0f172a] dark:text-white leading-tight">
              Bienvenido
            </CardTitle>
            <CardDescription className="text-[#64748b] dark:text-slate-400 text-[15px] font-medium leading-relaxed max-w-[280px] mx-auto">
              Ingresa tus credenciales para acceder a <span className="text-primary font-bold">GenniAsistent</span>
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="px-8 md:px-12 pb-12">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-[13px] font-bold text-slate-700 dark:text-slate-300 ml-1">Correo electrónico</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="nombre@empresa.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 px-4 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            
            <div className="space-y-2.5">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" title="Contraseña" className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Contraseña</Label>
                <Link href="#" className="text-[12px] font-semibold text-primary hover:underline">¿Olvidaste tu contraseña?</Link>
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 px-4 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 mt-2 bg-primary text-white font-bold text-[15px] rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]" 
              disabled={loading}
            >
              {loading ? "Autenticando..." : "Iniciar Sesión"}
            </Button>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-100 dark:border-slate-800"></span>
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-widest">
                <span className="bg-transparent px-4 text-slate-400 font-bold">O continúa con</span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full h-12 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-[14px] gap-3 rounded-xl transition-all shadow-sm active:scale-[0.98]"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.11c-.22-.66-.35-1.39-.35-2.11s.13-1.45.35-2.11V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Inicia sesión con Google
            </Button>

            <div className="text-center pt-6">
              <p className="text-[14px] text-slate-500 font-medium">
                ¿No tienes una cuenta? {" "}
                <Link href="/registro" className="text-primary font-bold hover:underline decoration-primary/30 underline-offset-4">
                  Contáctanos aquí
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-12 text-[12px] text-slate-400 font-medium tracking-wide z-10 flex items-center gap-6">
        <Link href="#" className="hover:text-slate-600 transition-colors">Términos</Link>
        <div className="w-1 h-1 rounded-full bg-slate-200"></div>
        <Link href="#" className="hover:text-slate-600 transition-colors">Privacidad</Link>
        <div className="w-1 h-1 rounded-full bg-slate-200"></div>
        <Link href="#" className="hover:text-slate-600 transition-colors">Soporte</Link>
      </div>

      <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
    </div>
  );
}
