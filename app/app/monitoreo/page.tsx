import { createClient } from "@/lib/supabaseServer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Activity, LayoutList, Layers, Mail, AlertTriangle } from "lucide-react";
import Link from "next/link";

// Forzamos a no cachear para ver el progreso real
export const revalidate = 0; 
export const dynamic = "force-dynamic";

export default async function MonitoreoDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // En un esquema real multitenant: extraemos el ID del session JWT
  const tenantId = user?.app_metadata?.tenant_id;

  // 1. Obtención de Cuotas del Tenant
  const { data: tenantInfo } = await supabase
     .from('tenants')
     .select('name, certificate_quota, total_consumed, use_native_engine')
     .eq('id', tenantId || '') 
     .single();

  // 2. Obtención de Lotes Recientes (Batches)
  const { data: batches } = await supabase
     .from('certificate_batches')
     .select(`
        id,
        total_expected,
        total_processed,
        total_errors,
        status,
        created_at,
        eventos ( titulo )
     `)
     .eq('tenant_id', tenantId || '')
     .order('created_at', { ascending: false })
     .limit(20);

  if (!tenantId || !tenantInfo) {
    return (
       <div className="p-8">
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
             <CardContent className="flex flex-col items-center justify-center p-10 text-center text-red-700 dark:text-red-400">
               <AlertTriangle className="w-10 h-10 mb-4" />
               <h2 className="text-xl font-bold">No se detectó un Tenant Activo</h2>
               <p>Tu usuario no está vinculado a una Empresa. El motor SaaS requiere un tenant_id.</p>
             </CardContent>
          </Card>
       </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      
      {/* Header Dashboard */}
      <div>
         <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
             <Activity className="w-8 h-8 text-primary" />
             Dashboard de Monitoreo SaaS
         </h1>
         <p className="text-slate-500 mt-2">Supervisa las colas de generación de certificados y estados de entrega OAuth para <strong>{tenantInfo.name}</strong>.</p>
      </div>

      {/* Tarjetas de Métricas (Billing & Quotas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="shadow-sm border-slate-200/60 dark:border-slate-800">
            <CardContent className="p-6 flex items-center justify-between">
               <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Créditos Disponibles</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{tenantInfo.certificate_quota}</p>
               </div>
               <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
                  <Layers className="w-6 h-6 text-green-600 dark:text-green-400" />
               </div>
            </CardContent>
         </Card>

         <Card className="shadow-sm border-slate-200/60 dark:border-slate-800">
            <CardContent className="p-6 flex items-center justify-between">
               <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Total Emitidos Históricos</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{tenantInfo.total_consumed}</p>
               </div>
               <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
               </div>
            </CardContent>
         </Card>

         <Card className="shadow-sm border-slate-200/60 dark:border-slate-800">
            <CardContent className="p-6 flex items-center justify-between">
               <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Motor Desplegado</p>
                  <Badge variant={tenantInfo.use_native_engine ? "default" : "secondary"} className="mt-2 text-sm px-4">
                     {tenantInfo.use_native_engine ? '⚡ Nativo Paralelo (QStash)' : '🐢 Legacy (n8n)'}
                  </Badge>
               </div>
               <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl hidden md:flex items-center justify-center">
                  <Activity className="w-6 h-6 text-slate-600 dark:text-slate-400" />
               </div>
            </CardContent>
         </Card>
      </div>

      {/* Tabla de Lotes Activos */}
      <Card className="shadow-sm border-slate-200/60 dark:border-slate-800">
         <CardHeader className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2">
               <LayoutList className="w-5 h-5 text-primary" />
               Lotes de Ejecución Recientes (Batches)
            </CardTitle>
            <CardDescription>Visualiza el progreso real de las campañas masivas.</CardDescription>
         </CardHeader>
         <CardContent className="p-0">
            <Table>
               <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                  <TableRow>
                     <TableHead className="font-semibold px-6 py-4">Evento Asociado</TableHead>
                     <TableHead className="font-semibold py-4">Status</TableHead>
                     <TableHead className="font-semibold py-4">Progreso / Generados</TableHead>
                     <TableHead className="font-semibold py-4">Errores</TableHead>
                     <TableHead className="font-semibold py-4 max-w-[150px]">Fecha Lote</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {batches && batches.length > 0 ? batches.map((batch: any) => {
                      const pct = Math.round((batch.total_processed / batch.total_expected) * 100) || 0;
                      
                      return (
                      <TableRow key={batch.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                         <td className="px-6 py-4 font-medium max-w-[250px] truncate" title={batch.eventos?.titulo}>
                            <Link href={`/app/monitoreo/${batch.id}`} className="hover:underline text-primary">
                               {batch.eventos?.titulo || 'Evento Desconocido'}
                            </Link>
                         </td>
                         <td className="py-4">
                            {batch.status === 'in_progress' && (
                               <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0">En Progreso</Badge>
                            )}
                            {batch.status === 'completed' && <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-0">Completado</Badge>}
                            {batch.status === 'failed' && <Badge variant="destructive">Fallido</Badge>}
                         </td>
                         <td className="py-4">
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 mb-1 max-w-[150px]">
                              <div className="bg-primary h-2.5 rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="text-xs font-bold text-slate-500">{batch.total_processed} / {batch.total_expected} ({pct}%)</span>
                         </td>
                         <td className="py-4">
                            {batch.total_errors > 0 ? (
                               <span className="text-red-500 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {batch.total_errors}</span>
                            ) : (
                               <span className="text-slate-400">0</span>
                            )}
                         </td>
                         <td className="py-4 text-sm text-slate-500">
                            {new Date(batch.created_at).toLocaleString()}
                         </td>
                      </TableRow>
                  )}) : (
                      <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                              No hay campañas en el historial. Intenta generar un certificado en algún evento.
                          </TableCell>
                      </TableRow>
                  )}
               </TableBody>
            </Table>
         </CardContent>
      </Card>
      
    </div>
  );
}
