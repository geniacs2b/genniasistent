import { Button } from "@/components/ui/button";
import { CalendarDays, LayoutDashboard, Search } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = createClient();
  let eventos: { id: string; titulo: string; descripcion: string | null; fecha_inicio: string | null }[] = [];
  
  try {
    const { data, error } = await supabase
      .from("eventos")
      .select("id, titulo, descripcion, fecha_inicio")
      .eq("activo", true)
      .order("fecha_inicio", { ascending: true })
      .limit(3);
    
    if (!error && data) {
      eventos = data;
    }
  } catch (err) {
    console.error("Error fetching events for home:", err);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-4 py-24 bg-gradient-to-b from-slate-50 to-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
          
          <div className="container max-w-4xl mx-auto space-y-10">
            <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="p-4 bg-structural rounded-3xl shadow-2xl shadow-structural/20">
                <img src="/assets/Logo asistencia.png" alt="Logo" className="h-24 w-24 object-contain" />
              </div>
            </div>
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-black text-secondary animate-pulse uppercase tracking-wider">
                Software de Gestión de Eventos & Asistencia
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight lg:text-7xl text-structural max-w-3xl mx-auto leading-[1.1]">
                Tus eventos, <br />
                <span className="text-primary italic">bajo control</span>
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto font-medium">
                Inscríbete a capacitaciones, gestiona tu asistencia mediante códigos QR y descarga tus certificados con <span className="text-structural font-black uppercase">Genni</span><span className="text-primary font-black uppercase tracking-tighter">Asistent</span>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link href="/admin/login">
                <Button size="lg" className="gap-2 w-full sm:w-auto h-12 px-8">
                  <LayoutDashboard className="h-5 w-5" />
                  Acceso Administrativo
                </Button>
              </Link>
              {/* 
              <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 gap-2">
                <Search className="h-5 w-5" />
                Explorar Eventos
              </Button>
              */}
            </div>
          </div>
        </section>

        {/* 
        <section className="py-20 bg-background">
          <div className="container px-4 mx-auto">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-3xl font-bold">Próximos Eventos</h2>
              <Button variant="ghost" size="sm">Ver todos</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {eventos.map((evento) => (
                <Link key={evento.id} href={`/evento/${evento.id}`}>
                  <div className="group border rounded-xl p-6 hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer bg-card">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                      <CalendarDays className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{evento.titulo}</h3>
                    <p className="text-muted-foreground line-clamp-2 mb-4 italic text-sm">
                      {evento.descripcion || "Sin descripción disponible."}
                    </p>
                    <div className="text-primary font-medium flex items-center gap-2">
                      Saber más <span>→</span>
                    </div>
                  </div>
                </Link>
              ))}

              {eventos.length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl text-muted-foreground bg-muted/20">
                  No hay eventos activos en este momento. Ingresa al panel admin para crear uno.
                </div>
              )}
            </div>
          </div>
        </section>
        */}
      </main>
    </div>
  );
}
