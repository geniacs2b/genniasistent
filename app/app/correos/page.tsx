import { emailConfigService } from "@/services/emailConfigService";
import { CorreosClient } from "./CorreosClient";
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';

export default async function CorreosPage() {
  noStore();

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id as string | undefined;

  // Obtener configuración, plantillas, eventos y oauth config en paralelo
  const [config, templates, { data: eventos }, { data: oauthConfig }] = await Promise.all([
    emailConfigService.getSystemConfig().catch(() => null),
    emailConfigService.getEmailTemplates().catch(() => []),
    supabase.from("eventos").select("id, titulo").eq("activo", true).order("titulo"),
    tenantId
      ? supabase
          .from("email_configurations")
          .select("id, provider, sender_email, is_active, token_expires_at")
          .eq("tenant_id", tenantId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 italic uppercase">
            Gestión de <span className="text-primary italic">Correos</span>
          </h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Configura la identidad institucional y las plantillas de comunicación del sistema.
          </p>
        </div>
      </div>

      <CorreosClient
        initialConfig={config}
        initialTemplates={templates}
        eventos={eventos || []}
        oauthConfig={oauthConfig ?? null}
      />
    </div>
  );
}
