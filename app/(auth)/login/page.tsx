"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
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
       // Limpiar marcadores de tiempo de sesión al iniciar
       localStorage.setItem("session_start_time", Date.now().toString());
       localStorage.setItem("last_activity_time", Date.now().toString());
       
       router.push("/app/dashboard");
       router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-950 dark:to-slate-900 px-4">
      {isExpired && (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-500 w-full max-w-sm bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-2xl flex items-center gap-3 font-semibold shadow-sm">
          <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></div>
          Tu sesión ha expirado por seguridad.
        </div>
      )}
      <Card className="w-full max-w-sm shadow-2xl border-0 bg-white/80 backdrop-blur-xl rounded-[1.5rem] overflow-hidden">
        <div className="h-1.5 w-full bg-primary/80"></div>
        <CardHeader className="space-y-4 text-center pt-8">
          <div className="flex justify-center mb-2">
            <img src="/assets/logo-gennia.png" alt="GENNIA" className="h-10 w-auto object-contain" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-slate-800">Iniciar sesión</CardTitle>
          <CardDescription className="text-slate-500 font-medium pt-1">
            Ingresa a la plataforma GENNIA Asistent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@ejemplo.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full mt-4" disabled={loading}>
              {loading ? "Autenticando..." : "Ingresar"}
            </Button>
            <div className="text-center pt-4">
              <p className="text-sm text-slate-500">
                ¿No tienes cuenta? {" "}
                <Link href="/registro" className="text-primary font-bold hover:underline">
                  Regístrate aquí
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
