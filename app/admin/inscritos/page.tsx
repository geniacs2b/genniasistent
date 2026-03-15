import { createClient } from "@/lib/supabaseServer";
import { InscritosClient } from "./InscritosClient";
import { InscritosActions } from "./InscritosActions";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function InscritosPage() {
  const supabase = createClient();

  // Obtener inscripciones con join a personas
  const { data: inscripciones, error } = await supabase
    .from("inscripciones")
    .select(`
      id,
      estado,
      created_at,
      personas (
        id,
        tipo_documento,
        numero_documento,
        correo,
        correo_verificado
      ),
      eventos (
        titulo
      )
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">Inscritos</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-2">Lista general de todos los participantes registrados en el sistema.</p>
        </div>
        <InscritosActions inscripciones={inscripciones || []} />
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-4 text-sm text-rose-600 font-medium border border-rose-200 dark:border-rose-800">
          Error al cargar inscritos: {error?.message}
        </div>
      )}

      <InscritosClient initialInscripciones={inscripciones || []} />
    </div>
  );
}
