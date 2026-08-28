import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, MapPin, Ticket, ArrowLeft, ShieldCheck, User, CreditCard, AlertCircle, Pencil } from "lucide-react";
import { siteConfig } from "@/config/site";
import { UserNav } from "@/components/user-nav";
import { createClient } from "@/lib/supabase/server";
import { TicketsBox } from "./_components/tickets-box";

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
      organizer: {
        select: { name: true },
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
              </div>
            </section>

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
                <button
                  disabled
                  title="Em breve"
                  className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-lg text-[var(--muted-fg)] cursor-not-allowed opacity-60"
                >
                  Entrar em contato
                </button>
              </div>
            </section>

            {/* Métodos de Pagamento */}
            <section className="border border-[var(--border)] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--border)] bg-[var(--muted)]">
                <CreditCard size={18} className="text-[var(--brand-500)]" />
                <h3 className="font-bold text-[var(--foreground)]">Métodos de pagamento</h3>
              </div>
              <div className="px-6 py-5 space-y-4">
                {/* Card brands */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "VISA",  bg: "#1a1f71", text: "#fff", style: "italic font-black" },
                    { label: "MC",    bg: "#eb001b", text: "#fff", style: "font-black", extra: "after:" },
                    { label: "ELO",   bg: "#00a4e0", text: "#fff", style: "font-black" },
                    { label: "AMEX",  bg: "#2e77bc", text: "#fff", style: "font-bold" },
                  ].map((card) => (
                    <span
                      key={card.label}
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-bold tracking-wider"
                      style={{ backgroundColor: card.bg, color: card.text }}
                    >
                      {card.label}
                    </span>
                  ))}
                  {/* Pix */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-[#32bcad]/10 text-[#32bcad] border border-[#32bcad]/30">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5.615 14.625a3.98 3.98 0 0 0 2.83 1.17h.08l2.695 2.695a1.98 1.98 0 0 0 2.8 0l2.715-2.715a3.98 3.98 0 0 0 2.83-1.17l.955.955a.5.5 0 0 0 .707-.707l-.955-.955A3.98 3.98 0 0 0 20 11.07V10.9a3.98 3.98 0 0 0-1.17-2.83l-.955-.955a.5.5 0 0 0-.707.707l.955.955A2.98 2.98 0 0 1 19 10.9v.17a2.98 2.98 0 0 1-.875 2.125l-2.715 2.715a.98.98 0 0 1-1.386 0L11.33 13.22a.5.5 0 0 0-.707.707l2.694 2.694-2.715 2.715a.98.98 0 0 1-1.386 0L6.52 16.64a3.98 3.98 0 0 0 0-5.657L5.565 10.03A2.98 2.98 0 0 1 5 8.095a2.98 2.98 0 0 1 .875-2.12L8.59 3.26a.98.98 0 0 1 1.386 0l2.694 2.694a.5.5 0 0 0 .707-.707L10.68 2.551a1.98 1.98 0 0 0-2.8 0L5.165 5.267A3.98 3.98 0 0 0 4 8.095c0 1.063.415 2.073 1.17 2.83l.955.955a2.98 2.98 0 0 1 0 4.243l-.51-.51v.012z"/>
                    </svg>
                    Pix
                  </span>
                </div>
                {/* Parcelamento */}
                <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                  </svg>
                  Parcele sua compra em até <strong>12x</strong>
                </div>
                {/* Segurança */}
                <div className="flex gap-3 bg-[var(--muted)] rounded-xl p-4 text-xs text-[var(--muted-fg)]">
                  <ShieldCheck size={32} className="text-emerald-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-[var(--foreground)] mb-0.5">Pagamento 100% seguro</p>
                    <p>Transações processadas pela <strong>Asaas</strong>, plataforma de pagamentos certificada pelo Banco Central do Brasil (BACEN). Seus dados são criptografados e jamais compartilhados.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Tickets Box */}
          <div className="lg:col-span-1">
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
