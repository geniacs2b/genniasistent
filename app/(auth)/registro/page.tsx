"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye, EyeOff, ArrowRight, Building2, User,
  CheckCircle2, Globe, Loader2, Phone, Mail, Lock,
} from "lucide-react";
import { registerWithTenantAction } from "@/app/actions/registroActions";
import { createClient } from "@/lib/supabaseClient";
import { signInWithGoogle } from "@/lib/authHelper";

// ─── Opciones ────────────────────────────────────────────────────
const TIPOS_ORG = [
  "Universidad / Instituto",
  "Academia / Centro de formación",
  "Empresa / Corporación",
  "ONG / Fundación",
  "Gobierno / Entidad pública",
  "Asociación / Gremio",
  "Otro",
];

const PAISES = [
  "Colombia", "México", "Argentina", "Chile", "Perú", "Ecuador",
  "Venezuela", "Bolivia", "Uruguay", "Paraguay", "Costa Rica", "Panamá",
  "Guatemala", "Honduras", "El Salvador", "Nicaragua", "Cuba",
  "República Dominicana", "España", "Estados Unidos", "Otro",
];

// ─── Estilos reutilizables ───────────────────────────────────────
const inputCls =
  "w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 " +
  "text-sm font-medium bg-white hover:border-slate-300 focus:outline-none focus:ring-2 " +
  "focus:ring-primary/30 focus:border-primary transition-all";

const selectCls =
  "w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium " +
  "bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30 " +
  "focus:border-primary transition-all appearance-none cursor-pointer";

// ─── Helper: campo con label ─────────────────────────────────────
function Field({
  label,
  id,
  children,
  className = "",
}: {
  label: string;
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Pantalla de confirmación de correo ─────────────────────────
function EmailSentScreen({ email }: { email: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center shadow-lg shadow-emerald-100">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            ¡Organización creada!
          </h1>
          <p className="text-slate-600 mt-3 font-medium leading-relaxed">
            Hemos enviado un correo de verificación a{" "}
            <strong className="text-slate-900">{email}</strong>.
          </p>
          <p className="text-slate-500 mt-2 text-sm">
            Confirma tu correo para activar tu cuenta y comenzar a automatizar tus eventos.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 font-medium text-left space-y-1">
          <p className="font-bold">Revisa tu bandeja de entrada</p>
          <p className="text-amber-700">
            Si no ves el correo, revisa la carpeta de spam o correo no deseado.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
          >
            Ir a iniciar sesión <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 font-medium">
            Volver a la landing
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────
export default function RegistroPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    email: "",
    password: "",
    confirmPassword: "",
    whatsapp: "",
    empresaNombre: "",
    tipoOrganizacion: "",
    ciudad: "",
    pais: "",
    sitioWeb: "",
    aceptaDatos: false,
    aceptaTerminos: false,
  });

  const set =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val =
        e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value;
      setForm((prev) => ({ ...prev, [field]: val }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!form.aceptaDatos || !form.aceptaTerminos) {
      setError("Debes aceptar los términos y la política de datos personales.");
      return;
    }

    startTransition(async () => {
      const result = await registerWithTenantAction({
        nombres:          form.nombres,
        apellidos:        form.apellidos,
        email:            form.email,
        password:         form.password,
        whatsapp:         form.whatsapp,
        empresaNombre:    form.empresaNombre,
        tipoOrganizacion: form.tipoOrganizacion,
        ciudad:           form.ciudad,
        pais:             form.pais,
        sitioWeb:         form.sitioWeb,
      });

      if (!result.success) {
        setError(result.error ?? "Error inesperado. Por favor intenta de nuevo.");
        return;
      }

      if (result.requiresEmailConfirmation) {
        // Email confirmation habilitado en Supabase → mostrar pantalla "revisa tu correo"
        setSentEmail(result.email ?? form.email);
        setEmailSent(true);
        return;
      }

      // Email confirmation deshabilitado → sesión activa inmediatamente
      const supabase = createClient();
      await supabase.auth.refreshSession();
      router.push("/app/dashboard");
      router.refresh();
    });
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "Error al conectar con Google");
    }
  }

  if (emailSent) return <EmailSentScreen email={sentEmail} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary/5 font-sans">
      {/* ── Navbar mínima ──────────────────────────────────────── */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="container max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 bg-primary/10 rounded flex items-center justify-center">
              <span className="text-primary font-bold text-xs">GA</span>
            </div>
            <span className="font-extrabold text-base tracking-tighter text-slate-800 uppercase italic">
              Genni<span className="text-primary italic">Asistent</span>
            </span>
          </Link>
          <p className="hidden sm:block text-sm text-slate-500 font-medium">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </header>

      <main className="pt-14 pb-16">
        <div className="container max-w-3xl mx-auto px-4 py-12">
          {/* ── Encabezado ───────────────────────────────────────── */}
          <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary mb-4 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
              Prueba gratuita · Sin tarjeta requerida
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
              Crea tu organización
            </h1>
            <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto">
              En menos de 2 minutos tendrás tu espacio listo para gestionar
              eventos y emitir certificados.
            </p>
          </div>

          {/* ── Formulario unificado ─────────────────────────────── */}
          <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/60 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
            <form onSubmit={handleSubmit} noValidate>

              {/* ── Sección 1: Información Personal ─────────────── */}
              <div className="p-8 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-9 w-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-lg leading-tight">
                      Información Personal
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">
                      Datos de la cuenta de administrador
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Nombres *" id="nombres">
                    <input
                      id="nombres"
                      type="text"
                      required
                      autoComplete="given-name"
                      placeholder="Carlos"
                      value={form.nombres}
                      onChange={set("nombres")}
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Apellidos *" id="apellidos">
                    <input
                      id="apellidos"
                      type="text"
                      required
                      autoComplete="family-name"
                      placeholder="Bastidas"
                      value={form.apellidos}
                      onChange={set("apellidos")}
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Correo electrónico *" id="email" className="sm:col-span-2">
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="carlos@empresa.com"
                        value={form.email}
                        onChange={set("email")}
                        className={`${inputCls} pl-10`}
                      />
                    </div>
                  </Field>

                  <Field label="Contraseña *" id="password">
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="password"
                        type={showPwd ? "text" : "password"}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        placeholder="Mínimo 6 caracteres"
                        value={form.password}
                        onChange={set("password")}
                        className={`${inputCls} pl-10 pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                        tabIndex={-1}
                      >
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </Field>

                  <Field label="Confirmar contraseña *" id="confirmPassword">
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="confirmPassword"
                        type={showConfirmPwd ? "text" : "password"}
                        required
                        autoComplete="new-password"
                        placeholder="Repite tu contraseña"
                        value={form.confirmPassword}
                        onChange={set("confirmPassword")}
                        className={`${inputCls} pl-10 pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPwd((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </Field>

                  <Field label="WhatsApp *" id="whatsapp" className="sm:col-span-2">
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="whatsapp"
                        type="tel"
                        required
                        autoComplete="tel"
                        placeholder="+57 300 000 0000"
                        value={form.whatsapp}
                        onChange={set("whatsapp")}
                        className={`${inputCls} pl-10`}
                      />
                    </div>
                  </Field>
                </div>
              </div>

              {/* ── Sección 2: Organización ──────────────────────── */}
              <div className="p-8 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-9 w-9 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-lg leading-tight">
                      Tu Organización
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">
                      Datos del espacio empresarial que administrarás
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field
                    label="Nombre de la empresa / institución *"
                    id="empresaNombre"
                    className="sm:col-span-2"
                  >
                    <input
                      id="empresaNombre"
                      type="text"
                      required
                      placeholder="Ej. Universidad Nacional, Acme Corp..."
                      value={form.empresaNombre}
                      onChange={set("empresaNombre")}
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Tipo de organización *" id="tipoOrganizacion">
                    <select
                      id="tipoOrganizacion"
                      required
                      value={form.tipoOrganizacion}
                      onChange={set("tipoOrganizacion")}
                      className={selectCls}
                    >
                      <option value="">Selecciona...</option>
                      {TIPOS_ORG.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="País *" id="pais">
                    <select
                      id="pais"
                      required
                      value={form.pais}
                      onChange={set("pais")}
                      className={selectCls}
                    >
                      <option value="">Selecciona...</option>
                      {PAISES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Ciudad *" id="ciudad">
                    <input
                      id="ciudad"
                      type="text"
                      required
                      placeholder="Ej. Bogotá, Ciudad de México..."
                      value={form.ciudad}
                      onChange={set("ciudad")}
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Sitio web (opcional)" id="sitioWeb">
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="sitioWeb"
                        type="url"
                        placeholder="https://miweb.com"
                        value={form.sitioWeb}
                        onChange={set("sitioWeb")}
                        className={`${inputCls} pl-10`}
                      />
                    </div>
                  </Field>
                </div>
              </div>

              {/* ── Sección 3: Aceptaciones + Envío ─────────────── */}
              <div className="p-8 bg-slate-50/60">
                <div className="space-y-3 mb-6">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.aceptaDatos}
                      onChange={set("aceptaDatos")}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary shrink-0 accent-primary"
                    />
                    <span className="text-sm text-slate-600 font-medium leading-relaxed">
                      Autorizo el{" "}
                      <strong className="text-slate-800">
                        tratamiento de mis datos personales
                      </strong>{" "}
                      conforme a la Política de Privacidad de GenniAsistent.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.aceptaTerminos}
                      onChange={set("aceptaTerminos")}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary shrink-0 accent-primary"
                    />
                    <span className="text-sm text-slate-600 font-medium leading-relaxed">
                      He leído y acepto los{" "}
                      <Link
                        href="#"
                        className="text-primary font-bold hover:underline"
                      >
                        Términos y Condiciones
                      </Link>{" "}
                      del servicio.
                    </span>
                  </label>
                </div>

                {error && (
                  <div className="mb-5 flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium px-4 py-3 rounded-xl">
                    <span className="shrink-0 mt-0.5">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-14 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 transition-all hover:-translate-y-0.5 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0 text-base"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creando tu organización...
                    </>
                  ) : (
                    <>
                      Crear mi Organización
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-100"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-50 px-2 text-slate-400 font-medium">O registrarse con</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full h-12 rounded-xl font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.11c-.22-.66-.35-1.39-.35-2.11s.13-1.45.35-2.11V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Google
                </button>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Sin tarjeta de crédito
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    5 certificados de prueba gratis
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Cancela cuando quieras
                  </span>
                </div>

                <p className="text-center text-sm text-slate-500 font-medium mt-6">
                  ¿Ya tienes cuenta?{" "}
                  <Link href="/login" className="text-primary font-bold hover:underline">
                    Inicia sesión
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
