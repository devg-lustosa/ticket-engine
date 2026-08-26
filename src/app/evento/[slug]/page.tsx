import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, MapPin, Ticket, ArrowLeft, Clock } from "lucide-react";
import { siteConfig } from "@/config/site";
import { UserNav } from "@/components/user-nav";
import { createClient } from "@/lib/supabase/server";

interface EventPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function EventDetailsPage({ params }: EventPageProps) {
  const { slug } = await params;

  // Busca o evento pelo slug e inclui os lotes ordenados
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      batches: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!event || event.status !== "PUBLISHED") {
    notFound();
  }

  // Autenticação para o UserNav
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  let dbUser = null;
  if (authUser) {
    dbUser = await prisma.user.findUnique({
      where: { authId: authUser.id },
      select: { name: true, email: true },
    });
  }

  const eventDate = format(new Date(event.date), "dd 'de' MMMM yyyy", { locale: ptBR });
  const eventTime = format(new Date(event.date), "HH:mm", { locale: ptBR });
  const doorsOpenTime = event.doorsOpen ? format(new Date(event.doorsOpen), "HH:mm") : null;

  return (
    <main className="min-h-dvh bg-[var(--background)]">
      {/* Top Navbar */}
      <div className="bg-[var(--brand-600)] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 font-bold hover:opacity-90 transition-opacity">
            <Ticket className="h-6 w-6" />
            <span className="hidden sm:inline-block">{siteConfig.name}</span>
          </Link>
          <UserNav user={dbUser} />
        </div>
      </div>

      {/* Header / Cover */}
      <div className="relative w-full h-[300px] md:h-[400px] bg-[var(--brand-900)] overflow-hidden">
        {event.coverImage ? (
          <img 
            src={event.coverImage} 
            alt={event.title}
            className="w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12">
          <div className="mx-auto max-w-5xl">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white mb-4 transition-colors">
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

            <section className="bg-[var(--muted)] rounded-2xl p-6 border border-[var(--border)]">
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
                {doorsOpenTime && (
                  <div className="flex items-center gap-3">
                    <Clock size={20} className="text-[var(--brand-500)] shrink-0" />
                    <p>Abertura dos portões: <span className="font-semibold text-[var(--foreground)]">{doorsOpenTime}</span></p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Tickets Box */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-[var(--card)] rounded-2xl shadow-xl border border-[var(--border)] overflow-hidden">
              <div className="bg-[var(--brand-500)] p-4 text-white text-center">
                <h3 className="font-bold text-lg">Ingressos</h3>
              </div>
              
              <div className="p-1 divide-y divide-[var(--border)]">
                {event.batches.length === 0 ? (
                  <div className="p-6 text-center text-sm text-[var(--muted-fg)]">
                    Nenhum ingresso disponível no momento.
                  </div>
                ) : (
                  event.batches.map((batch) => {
                    const isAvailable = batch.soldQty < batch.totalQty;
                    
                    return (
                      <div key={batch.id} className="p-5 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-[var(--foreground)] text-lg">{batch.name}</h4>
                            {batch.description && (
                              <p className="text-sm text-[var(--foreground)] opacity-80 mt-0.5">{batch.description}</p>
                            )}
                          </div>
                          <span className="font-extrabold text-xl text-[var(--brand-500)] whitespace-nowrap">
                            R$ {Number(batch.price).toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                        
                        {isAvailable ? (
                          <Link
                            href={`/checkout/${batch.id}`}
                            className="w-full mt-2 block rounded-xl bg-[var(--brand-500)] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-[var(--brand-600)] active:scale-[0.98]"
                          >
                            Comprar Ingresso
                          </Link>
                        ) : (
                          <button
                            disabled
                            className="w-full mt-2 block rounded-xl bg-[var(--muted)] px-4 py-3 text-center text-sm font-bold text-[var(--muted-fg)] cursor-not-allowed"
                          >
                            Lote Esgotado
                          </button>
                        )}
                        
                        <div className="text-[11px] text-center text-[var(--foreground)] opacity-70 uppercase tracking-wider font-bold">
                          Disponibilidade: {batch.totalQty - batch.soldQty} restantes
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="bg-[var(--muted)] p-4 text-xs text-[var(--muted-fg)] text-center border-t border-[var(--border)]">
                Compras processadas via <strong>Asaas</strong> com Pix. Segurança 100% garantida.
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
