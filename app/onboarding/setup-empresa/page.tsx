"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Building2, CheckCircle2 } from "lucide-react"
import { createTenantAction } from "@/app/actions/tenantActions"
import { createClient } from "@/lib/supabaseClient"

export default function SetupEmpresaPage() {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("name", name)
      const res = await createTenantAction(formData)

      if (res.success) {
        // Crucial: Refresh supabase session here on the client so the updated app_metadata token is fetched
        const supabase = createClient()
        await supabase.auth.refreshSession()
        
        router.push("/app/dashboard")
        router.refresh()
      } else {
        setError(res.error || "Ocurrió un error creando tu empresa.")
      }
    } catch (err: any) {
       setError("Fallo de red conectando con el servidor.")
    } finally {
      if (!error) setLoading(false) // Keep loading visual if transitioning
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl shadow-primary/5 border border-slate-100">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary/10 flex items-center justify-center rounded-2xl mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Crea tu Espacio</h2>
          <p className="mt-2 text-sm text-slate-500">
            Dinos el nombre de tu organización o empresa para preparar tu entorno aislado y seguro.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 rounded-lg text-sm bg-red-50 text-red-600 border border-red-100 font-medium">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="company-name" className="block text-sm font-semibold text-slate-700 mb-1">
                Nombre de tu Empresa / Institución
              </label>
              <input
                id="company-name"
                name="name"
                type="text"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 sm:text-sm transition-all"
                placeholder="Ej. Acme Corp, Universidad Nacional..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !name}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md shadow-primary/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-5 w-5" /> Configurando Entorno...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Empezar a Automatizar
                  <CheckCircle2 className="h-5 w-5 ml-1 opacity-80" />
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
