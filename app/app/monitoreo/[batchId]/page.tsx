import { createClient } from "@/lib/supabaseServer";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle2, ChevronLeft, Clock, FileWarning, SearchX, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BatchRefresher } from "./BatchRefresher";

export const revalidate = 0;

export default async function BatchDetailPage({ params }: { params: { batchId: string } }) {
  const supabase = createClient();
  const batchId = params.batchId;

  const { data: { user } } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id;

  // 1. Verificar primero si el Batch existe y pertenece al Tenant
  const { data: batch, error: batchError } = await supabase
     .from('certificate_batches')
     .select(`
        id,
        status,
        total_expected,
        created_at,
        eventos ( titulo )
     `)
     .eq('id', batchId)
     .eq('tenant_id', tenantId || '')
     .single();
  
  if (batchError || !batch) {
      return (
          <div className="p-10 flex flex-col items-center justify-center min-h-[400px] text-center">
              <SearchX className="w-16 h-16 text-slate-300 mb-6" />
              <h2 className="text-2xl font-black text-slate-800">Lote no encontrado</h2>
              <p className="text-slate-500 max-w-sm mt-2 font-medium">No se encontró la campaña solicitada o no tienes permisos para verla en este espacio de trabajo.</p>
              <Link href="/app/monitoreo" className="mt-8">
                <Button variant="outline" className="rounded-xl font-bold">Volver al Monitoreo</Button>
              </Link>
          </div>
      );
  }

  // 2. Obtener los Jobs asociados al Batch
  const { data: jobs, error: jobsError } = await supabase
     .from('certificate_jobs')
     .select(`
        id,
        status,
        pdf_url,
        error_log,
        participante:personas ( nombre_completo, correo ),
        email_deliveries ( status, error_log, retry_count, dispatched_at )
     `)
     .eq('batch_id', batchId)
     .eq('tenant_id', tenantId || '')
     .order('created_at', { ascending: false });

  // Si no hay jobs todavía, pero el batch existe (puede pasar durante la ingesta masiva)
  const jobsList = jobs || [];

  // Contadores para métricas rápidas
  const total = batch.total_expected;
  const totalInDB = jobsList.length;
  const pdfCompletos = jobsList.filter(j => j.status === 'generated').length;
  const emailsEnviados = jobsList.filter(j => j.email_deliveries?.[0]?.status === 'sent').length;
  const pdfErrores = jobsList.filter(j => j.status === 'failed').length;
  const emailErrores = jobsList.filter(j => j.email_deliveries?.[0]?.status === 'failed').length;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      {/* Auto-refresh mientras el batch esté activo */}
      {batch.status === 'in_progress' && <BatchRefresher intervalMs={5000} />}

      {/* Header y Back Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <Link href="/app/monitoreo">
               <Button variant="ghost" className="mb-2 -ml-3 text-slate-500 hover:text-slate-800">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Volver al Monitoreo
               </Button>
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Auditoría del Lote</h1>
              {batch.status === 'in_progress' && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" /> EN VIVO
                </span>
              )}
            </div>
            <p className="text-sm font-mono text-slate-500 mt-1">ID: {batchId}</p>
            <p className="text-sm text-slate-500 mt-1">{(batch.eventos as any)?.titulo ?? 'Evento desconocido'}</p>
         </div>

         {/* Resumen Rápidos */}
         <div className="flex gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
             <div className="text-center px-4 border-r border-slate-200 dark:border-slate-800 text-sm">
                <p className="text-slate-500 font-medium">Volumen</p>
                <p className="font-bold text-lg">{total}</p>
             </div>
             <div className="text-center px-4 border-r border-slate-200 dark:border-slate-800 text-sm">
                <p className="text-slate-500 font-medium">PDFs Exitosos</p>
                <p className="font-bold text-lg text-green-600">{pdfCompletos}</p>
             </div>
             <div className="text-center px-4 text-sm">
                <p className="text-slate-500 font-medium">Emails Entregados</p>
                <p className="font-bold text-lg text-blue-600">{emailsEnviados}</p>
             </div>
         </div>
      </div>

      {/* Tabla de Detalle de Personas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <Table>
           <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80">
              <TableRow>
                 <TableHead className="py-4">Participante</TableHead>
                 <TableHead className="py-4">Estado (Worker PDF)</TableHead>
                 <TableHead className="py-4">Documento PDF</TableHead>
                 <TableHead className="py-4">Estado Emisión (Token OAuth)</TableHead>
                 <TableHead className="py-4 max-w-[200px]">Logs de Motor</TableHead>
              </TableRow>
           </TableHeader>
           <TableBody>
               {jobsList.length > 0 ? jobsList.map((job: any) => {
                  const delivery = job.email_deliveries?.[0]; // Ocurre 1-a-1 por Job
                  return (
                  <TableRow key={job.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                     <TableCell className="py-4">
                        <p className="font-bold text-slate-800 dark:text-slate-200">{job.participante?.nombre_completo || 'N/A'}</p>
                        <p className="text-xs text-slate-500">{job.participante?.correo || 'Sin Correo'}</p>
                     </TableCell>
                     
                     {/* Badge PDF Status */}
                     <TableCell className="py-4">
                        {job.status === 'generating' && <span className="flex items-center gap-1 text-sm text-amber-500 font-medium"><Clock className="w-3 h-3 animate-pulse"/> Generando</span>}
                        {job.status === 'pending' && <span className="flex items-center gap-1 text-sm text-slate-400 font-medium"><Clock className="w-3 h-3"/> Encolado</span>}
                        {job.status === 'generated' && <span className="flex items-center gap-1 text-sm text-green-600 font-medium"><CheckCircle2 className="w-3 h-3"/> Listo</span>}
                        {job.status === 'failed' && <span className="flex items-center gap-1 text-sm text-red-500 font-medium"><AlertCircle className="w-3 h-3"/> Error</span>}
                     </TableCell>

                     {/* PDF URL Link */}
                     <TableCell className="py-4">
                        {job.pdf_url ? (
                           <a href={job.pdf_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm truncate max-w-[150px] inline-block font-medium">
                              Ver Certificado
                           </a>
                        ) : <span className="text-slate-300 text-sm">-</span>}
                     </TableCell>

                     {/* Badge Email OAuth Status */}
                     <TableCell className="py-4">
                        {!delivery && <span className="text-slate-300 text-sm">- Esperando a PDF -</span>}
                        {delivery?.status === 'pending' && <span className="flex items-center gap-1 text-sm text-amber-500 font-medium"><Clock className="w-3 h-3"/> Proceso OAuth</span>}
                        {delivery?.status === 'sent' && <span className="flex items-center gap-1 text-sm text-blue-600 font-medium"><CheckCircle2 className="w-3 h-3"/> Enviado ({delivery.dispatched_at ? new Date(delivery.dispatched_at).toLocaleTimeString() : '?'})</span>}
                        {delivery?.status === 'failed' && <span className="flex items-center gap-1 text-sm text-red-500 font-medium"><AlertCircle className="w-3 h-3"/> Bloqueado</span>}
                     </TableCell>

                     {/* Error Logs for Diagnosis */}
                     <TableCell className="py-4 max-w-[200px]">
                        {job.error_log ? (
                           <div className="flex items-start gap-1 text-xs text-red-500">
                              <FileWarning className="w-3 h-3 mt-0.5 shrink-0"/>
                              <span className="truncate" title={job.error_log}>PDF: {job.error_log}</span>
                           </div>
                        ) : delivery?.error_log ? (
                           <div className="flex items-start gap-1 text-xs text-orange-500">
                              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0"/>
                              <span className="truncate" title={delivery.error_log}>Mail: {delivery.error_log} (Intento {delivery.retry_count})</span>
                           </div>
                        ) : (
                           <span className="text-xs text-slate-400 italic">Limpio</span>
                        )}
                     </TableCell>
                  </TableRow>
               )}) : (
                  <TableRow>
                     <TableCell colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2">
                           <Clock className="w-10 h-10 text-amber-500 animate-spin" />
                           <p className="font-bold text-slate-800">Iniciando Generación...</p>
                           <p className="text-sm text-slate-500">Estamos preparando las {batch.total_expected} tareas en el motor de colas.</p>
                        </div>
                     </TableCell>
                  </TableRow>
               )}
            </TableBody>
        </Table>
      </div>
    </div>
  );
}
