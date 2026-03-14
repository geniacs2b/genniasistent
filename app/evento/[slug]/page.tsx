import { eventService } from "@/services/eventService";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatToBogota } from "@/lib/date";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EventPage({ params }: { params: { slug: string } }) {
  try {
    const { evento } = await eventService.getEventByFormSlug(params.slug);

    if (!evento || !evento.activo) {
      return notFound();
    }

    return (
      <div className="container mx-auto py-12 px-4 max-w-4xl">
        <Card className="shadow-lg border-0 bg-card">
          <CardHeader className="space-y-4 pb-8">
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground w-fit">
              {evento.modalidad || 'Presencial'}
            </div>
            <CardTitle className="text-4xl md:text-5xl font-extrabold tracking-tight">
              {evento.titulo}
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground whitespace-pre-wrap">
              {evento.descripcion}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3 text-muted-foreground">
                <CalendarDays className="h-6 w-6 text-primary" />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">Fecha y Hora</span>
                  <span className="text-sm">
                    {formatToBogota(evento.fecha_inicio, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="h-6 w-6 text-primary" />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">Ubicación</span>
                  <span className="text-sm">{evento.lugar || 'Por definir'}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Users className="h-6 w-6 text-primary" />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">Cupos Restantes</span>
                  <span className="text-sm">{evento.cupo_maximo ? `${evento.cupo_maximo} disponibles` : 'Sin límite'}</span>
                </div>
              </div>
            </div>

            <div className="pt-8 flex flex-col sm:flex-row gap-4 border-t">
              <Link href={`/inscripcion/${params.slug}`} className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  Inscribirse al Evento
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    return notFound();
  }
}
