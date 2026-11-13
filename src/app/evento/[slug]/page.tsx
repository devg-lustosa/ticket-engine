import Image from "next/image";
import { creditCardEnabled } from "@/lib/payment-methods";
import { notFound } from "next/navigation";
import { getEventBySlug, getAllEventSlugs, getEventAttendees } from "@/services/event.service";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, MapPin, Ticket, ArrowLeft, ShieldCheck, User, CreditCard, AlertCircle, Pencil } from "lucide-react";
import { siteConfig } from "@/config/site";
import { TicketsBox } from "./_components/tickets-box";
import { EventMap } from "@/components/event-map";
import { EventAttendees } from "./_components/event-attendees";

export const revalidate = 60;

// Garante que os links de eventos carreguem instantaneamente construindo-os na CDN do Vercel
export async function generateStaticParams() {
  const events = await getAllEventSlugs();
  return events.map((e) => ({
    slug: e.slug,
  }));
}

interface EventPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function EventDetailsPage({ params }: EventPageProps) {
  const { slug } = await params;

  // Busca do evento utilizando a camada de serviço (com cache ativado)
  const event = await getEventBySlug(slug);

  if (!event || event.status !== "PUBLISHED") {
    notFound();
  }
  
  const attendees = await getEventAttendees(event.id);

  const eventDate = format(new Date(event.date), "dd 'de' MMMM yyyy", { locale: ptBR });
  const eventTime = format(new Date(event.date), "HH:mm", { locale: ptBR });

  return (
    <main className="min-h-dvh bg-[var(--background)]">
      {/* Header / Cover */}
      <div className="relative w-full h-[300px] md:h-[400px] bg-[var(--brand-900)] overflow-hidden">
        {event.coverImage ? (
          <Image 
            src={event.coverImage} 
            alt={event.title}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-60"
          />
        ) : (
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12">
          <div className="mx-auto max-w-5xl">
            <Link href="/eventos" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white mb-4 transition-colors" data-tooltip="Voltar para eventos">
              <ArrowLeft size={16} />
              Voltar para eventos
            </Link>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-2 leading-tight">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm md:text-base">
              <div className="flex items-center gap-1.5">
                <Calendar size={18} />
                {eventDate} às {eventTime}
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={18} />
                {event.venue}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">Sobre o Evento</h2>
              <div className="prose prose-gray max-w-none text-[var(--muted-fg)] whitespace-pre-line">
                {event.description || "Nenhuma descrição fornecida para este evento."}
              </div>
            </section>

            <section className="bg-[var(--muted)] rounded-2xl overflow-hidden border border-[var(--border)]">
              <div className="p-6">
                <h3 className="font-bold text-[var(--foreground)] mb-4">Informações de Local</h3>
                <div className="space-y-3 text-[var(--muted-fg)] text-sm">
                  <div className="flex items-start gap-3">
                    <MapPin size={20} className="text-[var(--brand-500)] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">{event.venue}</p>
                      {event.address && <p>{event.address}</p>}
                      {(event.city || event.state) && <p>{event.city} - {event.state}</p>}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Renderiza o mapa apenas se tivermos endereço para pesquisar */}
              {(event.address || event.city) && (
                <div className="border-t border-[var(--border)]">
                  <EventMap 
                    address={`${event.address ? event.address + ", " : ""}${event.city ? event.city + ", " : ""}${event.state || ""}`}
                  />
                </div>
              )}
            </section>

            {/* Mobile Tickets Box (Visible only on mobile, below Local) */}
            <div className="block lg:hidden">
              <TicketsBox
                batches={event.batches.map((b) => ({
                  ...b,
                  price: Number(b.price),
                }))}
              />
            </div>

            {/* Participantes (Quem vai) */}
            <EventAttendees attendees={attendees} />

            {/* Política do Evento */}
            <section className="border border-[var(--border)] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--border)] bg-[var(--muted)]">
                <ShieldCheck size={18} className="text-[var(--brand-500)]" />
                <h3 className="font-bold text-[var(--foreground)]">Política do Evento</h3>
              </div>
              <div className="px-6 py-5 space-y-5">
                <div className="flex gap-3">
                  <AlertCircle size={18} className="text-[var(--brand-500)] shrink-0 mt-0.5" />
                  <div className="text-sm text-[var(--muted-fg)]">
                    <p className="font-semibold text-[var(--foreground)] mb-1">Cancelamento de pedidos pagos</p>
                    <p>Cancelamentos de pedidos serão aceitos até <strong>7 dias após a compra</strong>, desde que a solicitação seja enviada até <strong>48 horas antes do início do evento</strong>.</p>
                  </div>
                </div>
                <div className="h-px bg-[var(--border)]" />
                <div className="flex gap-3">
                  <Pencil size={18} className="text-[var(--brand-500)] shrink-0 mt-0.5" />
                  <div className="text-sm text-[var(--muted-fg)]">
                    <p className="font-semibold text-[var(--foreground)] mb-1">Editar participante</p>
                    <p>Você poderá editar o participante de um ingresso <strong>apenas uma vez</strong>. Essa opção ficará disponível até <strong>24 horas antes do início do evento</strong>.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Sobre o Produtor */}
            <section className="border border-[var(--border)] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--border)] bg-[var(--muted)]">
                <User size={18} className="text-[var(--brand-500)]" />
                <h3 className="font-bold text-[var(--foreground)]">Sobre o Produtor</h3>
              </div>
              <div className="px-6 py-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--brand-500)]/10 flex items-center justify-center">
                    <User size={20} className="text-[var(--brand-500)]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--foreground)] text-sm">{event.organizer.name}</p>
                    <p className="text-xs text-[var(--muted-fg)]">Organizador do evento</p>
                  </div>
                </div>

              </div>
            </section>

            {/* Métodos de Pagamento */}
            <section className="border border-[var(--border)] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--border)] bg-[var(--muted)]">
                <CreditCard size={18} className="text-[var(--brand-500)]" />
                <h3 className="font-bold text-[var(--foreground)]">Métodos de pagamento</h3>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="font-semibold">{creditCardEnabled() ? "Pix e cartão de crédito à vista" : "Pix"}</p>
                <p className="text-sm text-muted-fg">O ingresso será liberado após a confirmação do pagamento pelo Asaas. Confira o valor antes de concluir.</p>

              </div>
            </section>
          </div>

          {/* Right Column: Tickets Box */}
          <div className="hidden lg:block lg:col-span-1">
            <TicketsBox
              batches={event.batches.map((b) => ({
                ...b,
                price: Number(b.price),
              }))}
            />
          </div>

        </div>
      </div>
    </main>
  );
}
