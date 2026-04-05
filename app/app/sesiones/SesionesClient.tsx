"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabaseClient";
import { SesionesForm } from "./SesionesForm";
import { formatToBogota } from "@/lib/date";
import { 
  Users, Clock9, Trash2, Plus, Search, Filter, 
  ExternalLink, Calendar, MoreHorizontal 
} from "lucide-react";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface SesionesClientProps {
  sesiones: any[];
  eventos: any[];
}

type QrEstado = 'generado' | 'activo' | 'cerrado' | 'cancelado' | string | null;

function QrBadge({ estado, activo }: { estado: QrEstado; activo: boolean }) {
  const ef = estado ?? (activo ? 'activo' : 'generado');
  if (ef === 'activo') return (
    <Badge className="bg-emerald-500/12 text-[#15803D] dark:bg-emerald-500/10 dark:text-emerald-400 border-0 font-black text-[10px] uppercase tracking-wider h-6 flex items-center gap-1.5 px-3">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
      QR Activo
    </Badge>
  );
  if (ef === 'cerrado') return <Badge className="bg-orange-500/12 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border-0 font-black text-[10px] uppercase tracking-wider h-6 px-3">QR Cerrado</Badge>;
  if (ef === 'cancelado') return <Badge className="bg-rose-500/12 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border-0 font-black text-[10px] uppercase tracking-wider h-6 px-3">QR Cancelado</Badge>;
  return <Badge className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-0 font-black text-[10px] uppercase tracking-wider h-6 px-3">QR Generado</Badge>;
}

export function SesionesClient({ sesiones, eventos }: SesionesClientProps) {
  const [sessionData, setSessionData] = useState(sesiones);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvento, setSelectedEvento] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setSessionData(sesiones);
  }, [sesiones]);

  const refreshSessions = async () => {
    // Re-fetch using the same enriched logic as the server component to keep counts updated
    const { data: assists } = await supabase.from("asistencias").select("sesion_id");
    const counts: Record<string, number> = {};
    (assists || []).forEach((a: any) => {
      if (a.sesion_id) counts[a.sesion_id] = (counts[a.sesion_id] || 0) + 1;
    });

    const { data } = await supabase
      .from("sesiones_evento")
      .select(`
        id, nombre, fecha, hora_inicio, hora_fin,
        eventos(id, titulo, fecha_inicio, fecha_fin, hora_inicio, hora_fin),
        qr_tokens_asistencia(id, token, estado, activo, fecha_activacion, fecha_desactivacion)
      `)
      .order("fecha", { ascending: false });
    
    if (data) {
      setSessionData(data.map(s => ({
        ...s,
        attendance_count: counts[s.id] || 0
      })));
    }
  };

  const handleDeleteSession = async (id: string, nombre: string) => {
    if (!confirm(`¿Seguro que deseas eliminar la sesión "${nombre}"?`)) return;

    try {
      const { error } = await supabase.rpc('eliminar_sesion_evento', { 
        p_sesion_evento_id: id 
      });
      
      if (error) {
        if (error.message.includes("asistencias")) {
          toast({ title: "No se puede eliminar", description: "La sesión tiene asistencias registradas.", variant: "destructive" });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: "Sesión eliminada correctamente" });
      await refreshSessions();
    } catch (err: any) {
      toast({ title: "Error al eliminar sesión", description: err.message, variant: "destructive" });
    }
  };

  const filteredSesiones = sessionData.filter(s => {
    const matchesSearch = s.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const eventTitle = (s.eventos as any)?.titulo || "";
    const matchesEvento = selectedEvento === "all" || eventTitle === selectedEvento;
    return matchesSearch && matchesEvento;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 italic">Sesiones</h1>
          <p className="text-[15px] font-medium text-slate-500">Gestión ejecutiva y directorio de sesiones activas.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 px-8 rounded-xl font-black bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 transition-all hover:-translate-y-0.5 gap-2 group italic">
              <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" strokeWidth={3} />
              Nueva Sesión
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 bg-transparent shadow-none">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-200/60 dark:border-slate-800 shadow-2xl">
              <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>
              <div className="p-8">
                <SesionesForm eventos={eventos} onCreated={() => { refreshSessions(); setIsCreateOpen(false); }} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200/40 dark:border-slate-800 backdrop-blur-md">
        <div className="relative w-full md:w-[320px] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            placeholder="Buscar por sesión..."
            className="w-full pl-11 h-11 bg-white/80 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-none focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium italic outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 text-slate-400">
            <Filter className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Evento</span>
          </div>
          <Select value={selectedEvento} onValueChange={setSelectedEvento}>
            <SelectTrigger className="w-full md:w-[250px] h-11 bg-white/80 dark:bg-slate-950 border-slate-200/60 dark:border-slate-800 rounded-xl shadow-none font-bold text-[13px] text-slate-700 dark:text-slate-300 italic">
              <SelectValue placeholder="Filtrar por evento" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 shadow-2xl">
              <SelectItem value="all" className="font-bold text-indigo-600">Ver todos</SelectItem>
              {Array.from(new Set(sessionData.map(s => (s.eventos as any)?.titulo))).filter(Boolean).map((titulo: any) => (
                <SelectItem key={titulo} value={titulo} className="font-medium">{titulo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:ml-auto">
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50/30 dark:bg-indigo-500/5 rounded-xl border border-indigo-100/50 dark:border-indigo-500/10">
            <span className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">{filteredSesiones.length} sesiones encontradas</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#F8FAFC] dark:bg-slate-800/40 border-b border-slate-200/50 dark:border-slate-800">
            <TableRow className="hover:bg-transparent border-0 h-14">
              <TableHead className="text-[11px] uppercase font-black tracking-[0.1em] text-slate-400 pl-8">Sesión / Evento</TableHead>
              <TableHead className="text-[11px] uppercase font-black tracking-[0.1em] text-slate-400">Programación</TableHead>
              <TableHead className="text-[11px] uppercase font-black tracking-[0.1em] text-slate-400">Asistencia</TableHead>
              <TableHead className="text-[11px] uppercase font-black tracking-[0.1em] text-slate-400">Estado QR</TableHead>
              <TableHead className="text-[11px] uppercase font-black tracking-[0.1em] text-slate-400 pr-8 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSesiones.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-24 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
                      <Clock9 className="w-8 h-8 text-slate-300" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-slate-600 dark:text-slate-300">No hay sesiones</p>
                      <p className="text-sm text-slate-400">Crea una nueva sesión o ajusta los filtros de búsqueda.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
            
            {filteredSesiones.map((s) => {
              const qrs: any[] = s.qr_tokens_asistencia ?? [];
              const activeQr = qrs.find(q => q.estado === 'activo' || q.activo)
                ?? qrs.find(q => q.token)
                ?? qrs[0];
              const qrEstado: QrEstado = activeQr?.estado ?? null;
              const count = s.attendance_count ?? 0;

              return (
                <TableRow key={s.id} className="group border-b border-slate-100/50 dark:border-slate-800/50 hover:bg-[#F9FBFD] dark:hover:bg-slate-800/30 transition-all duration-300 hover:scale-[1.001]">
                  <TableCell className="py-6 pl-8">
                    <div className="flex flex-col">
                      <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100 italic">{s.nombre}</span>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mt-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                        {(s.eventos as any)?.titulo}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" strokeWidth={2.5} />
                          <span className="text-[13px] font-bold capitalize">{formatToBogota(s.fecha, { day: '2-digit', month: 'short' })}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-slate-400">
                          <Clock9 className="w-3.5 h-3.5" strokeWidth={2.5} />
                          <span className="text-[11px] font-black">{s.hora_inicio ?? "—"}{s.hora_fin ? ` – ${s.hora_fin}` : ""}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 transition-transform group-hover:scale-110 duration-500">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-black text-slate-900 dark:text-slate-100 tabular-nums">{count}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registros</span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <QrBadge estado={qrEstado} activo={activeQr?.activo} />
                  </TableCell>

                  <TableCell className="pr-8 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 px-4 rounded-xl font-black text-[11px] uppercase tracking-wider border-slate-200/80 dark:border-slate-800 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all gap-2"
                        onClick={() => router.push(`/app/qr?sesionId=${s.id}`)}
                      >
                        Ir a QR
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <MoreHorizontal className="w-5 h-5 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-slate-200/60 dark:border-slate-800 shadow-2xl">
                          <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-3 py-2">Opciones de Sesión</DropdownMenuLabel>
                          <DropdownMenuSeparator className="mx-2 bg-slate-100 dark:bg-slate-800" />
                          <DropdownMenuItem className="rounded-xl px-3 py-2.5 font-bold text-[13px] text-slate-700 cursor-pointer focus:bg-indigo-50 focus:text-indigo-600 gap-2">
                            <Clock9 className="w-4 h-4" /> Ver Registros
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="mx-2 bg-slate-100 dark:bg-slate-800" />
                          <DropdownMenuItem 
                            className="rounded-xl px-3 py-2.5 font-bold text-[13px] text-rose-600 cursor-pointer focus:bg-rose-50 focus:text-rose-700 gap-2"
                            onClick={() => handleDeleteSession(s.id, s.nombre)}
                          >
                            <Trash2 className="w-4 h-4" /> Eliminar Sesión
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
