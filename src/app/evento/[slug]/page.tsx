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
                <div className="flex flex-wrap items-center gap-2">
                  {/* Visa */}
                  <div className="flex h-8 w-14 items-center justify-center rounded" style={{ backgroundColor: "#1434CB" }}>
                    <svg viewBox="0 0 38 12" className="h-3.5 w-auto" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.52 0l-2.28 11.53H8.71L6.46 1.83C6.25.86 6.05.54 5.23.15L0 0h.13c2.09.43 4 .98 5.33 2.16l2.25 9.37h4.22L18.86 0h-4.34zm7.92 11.53h3.91V0h-3.91v11.53zm10.49-11.26c-1.72-.45-3.66-.64-5.25-.64-4.65 0-7.91 2.41-7.94 5.88-.03 2.57 2.33 4.01 4.12 4.87 1.84.88 2.45 1.45 2.45 2.23 0 1.2-.14 1.74-2.81 1.74-1.87 0-2.88-.29-4.41-.97l-.62-.29-1.79 11.14h1.6zm7.07 0c-.74 0-1.36.42-1.64 1.09l-6.23 14.86h4.11s.68-1.92.83-2.34c.45.01 4.51.01 5.03 0 .12.55.76 2.34.76 2.34h3.61l-6.47-15.95h-2.8zm-.42 3.43l1.19 5.73h-2.57l1.38-5.73z" />
                    </svg>
                  </div>
                  
                  {/* Mastercard */}
                  <div className="flex h-8 w-14 items-center justify-center rounded" style={{ backgroundColor: "#1C1C1F" }}>
                    <svg viewBox="0 0 36 24" className="h-5 w-auto" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="7.5" fill="#EB001B" />
                      <circle cx="24" cy="12" r="7.5" fill="#F79E1B" />
                      <path d="M18 17.85A7.476 7.476 0 0 0 21.5 12 7.476 7.476 0 0 0 18 6.15a7.476 7.476 0 0 0-3.5 5.85 7.476 7.476 0 0 0 3.5 5.85z" fill="#FF5F00" />
                    </svg>
                  </div>

                  {/* Elo */}
                  <div className="flex h-8 w-14 items-center justify-center rounded" style={{ backgroundColor: "#000000" }}>
                    <svg viewBox="0 0 40 40" className="h-6 w-auto" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="20" cy="20" r="16" fill="#00A4E0" />
                      <path d="M12 18h8v2h-8zM12 22h8v2h-8zM24 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 2a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM24 22a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 2a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" fill="#FFFFFF" />
                      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontSize="14" fontWeight="bold" fontStyle="italic" letterSpacing="-1">elo</text>
                    </svg>
                  </div>

                  {/* Amex */}
                  <div className="flex h-8 w-14 items-center justify-center rounded" style={{ backgroundColor: "#006FCF" }}>
                    <span className="text-[11px] font-extrabold text-white tracking-wider" style={{ fontFamily: "Arial, sans-serif" }}>AMEX</span>
                  </div>

                  {/* Pix */}
                  <div className="flex h-8 items-center gap-1.5 px-3 rounded border" style={{ backgroundColor: "rgba(50,188,173,0.1)", borderColor: "rgba(50,188,173,0.3)" }}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#32bcad" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5.615 14.625a3.98 3.98 0 0 0 2.83 1.17h.08l2.695 2.695a1.98 1.98 0 0 0 2.8 0l2.715-2.715a3.98 3.98 0 0 0 2.83-1.17l.955.955a.5.5 0 0 0 .707-.707l-.955-.955A3.98 3.98 0 0 0 20 11.07V10.9a3.98 3.98 0 0 0-1.17-2.83l-.955-.955a.5.5 0 0 0-.707.707l.955.955A2.98 2.98 0 0 1 19 10.9v.17a2.98 2.98 0 0 1-.875 2.125l-2.715 2.715a.98.98 0 0 1-1.386 0L11.33 13.22a.5.5 0 0 0-.707.707l2.694 2.694-2.715 2.715a.98.98 0 0 1-1.386 0L6.52 16.64a3.98 3.98 0 0 0 0-5.657L5.565 10.03A2.98 2.98 0 0 1 5 8.095a2.98 2.98 0 0 1 .875-2.12L8.59 3.26a.98.98 0 0 1 1.386 0l2.694 2.694a.5.5 0 0 0 .707-.707L10.68 2.551a1.98 1.98 0 0 0-2.8 0L5.165 5.267A3.98 3.98 0 0 0 4 8.095c0 1.063.415 2.073 1.17 2.83l.955.955a2.98 2.98 0 0 1 0 4.243l-.51-.51v.012z"/>
                    </svg>
                    <span className="text-[13px] font-bold" style={{ color: "#32bcad" }}>Pix</span>
                  </div>
                </div>

                {/* Parcelamento e Segurança */}
                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex items-center gap-2 text-sm text-[var(--success)] font-medium">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                    Parcele sua compra em até <strong>12x</strong>
                  </div>
                  
                  <div className="flex items-start gap-3 bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 mt-2">
                    <div className="mt-0.5">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--success)] fill-current" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 19.93V2.93l7 3.11v4.96c0 4.52-2.98 8.69-7 9.93zM16.59 8.59L12 13.17 9.41 10.59 8 12l4 4 6-6z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-[var(--foreground)] text-sm mb-1">Pagamento 100% seguro</p>
                      <p className="text-xs text-[var(--muted-fg)] leading-relaxed">
                        Transações processadas pela <strong>Asaas</strong>, plataforma de pagamentos certificada pelo Banco Central do Brasil (BACEN). Seus dados são criptografados e jamais compartilhados.
                      </p>
                    </div>
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
