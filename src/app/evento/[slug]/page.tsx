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
                  <div className="flex h-8 w-12 items-center justify-center rounded bg-[#1434CB]">
                    <svg viewBox="0 0 32 10" className="h-3.5 w-auto fill-white" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.235 0L8.71 9.823H5.215L3.435 1.554C3.254.73 3.088.46 2.392.128L.044 0h.105c1.78.36 3.407.973 4.542 1.834l1.918 7.989h3.6L15.932 0h-3.697zm6.75 9.823h3.328V0h-3.328v9.823zm8.93-9.59c-1.464-.383-3.116-.547-4.47-.547-3.957 0-6.738 2.052-6.764 5.01-.027 2.188 1.986 3.415 3.513 4.148 1.564.75 2.086 1.233 2.086 1.9 0 1.018-1.242 1.484-2.392 1.484-1.59 0-2.455-.246-3.76-.827l-.53-.25-1.524 9.489h1.365z"/>
                      <path d="M29.835 0c-.628 0-1.157.362-1.4.927l-5.305 12.656h3.498s.575-1.637.705-1.99c.38.002 3.844.002 4.28 0 .1.465.65 1.99.65 1.99h3.072L32.222 0h-2.387zm-.356 2.923l1.015 4.876h-2.186l1.17-4.876z"/>
                      <path d="M23.11 3.567c-.208-1.025-1.096-2.584-2.83-3.24L18.47 9.82h3.5l1.14-3.003h.001z"/>
                    </svg>
                  </div>
                  
                  {/* Mastercard */}
                  <div className="flex h-8 w-12 items-center justify-center rounded bg-[#1C1C1F]">
                    <svg viewBox="0 0 36 24" className="h-5 w-auto" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="7.5" fill="#EB001B" />
                      <circle cx="24" cy="12" r="7.5" fill="#F79E1B" />
                      <path d="M18 17.85A7.476 7.476 0 0 0 21.5 12 7.476 7.476 0 0 0 18 6.15a7.476 7.476 0 0 0-3.5 5.85 7.476 7.476 0 0 0 3.5 5.85z" fill="#FF5F00" />
                    </svg>
                  </div>

                  {/* Elo */}
                  <div className="flex h-8 w-12 items-center justify-center rounded bg-black">
                    <svg viewBox="0 0 40 40" className="h-6 w-auto" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="20" cy="20" r="16" fill="#00A4E0" />
                      <path d="M12 18h8v2h-8zM12 22h8v2h-8zM24 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 2a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM24 22a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 2a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" fill="#FFF" />
                      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="#FFF" fontSize="14" fontWeight="bold" fontStyle="italic" letterSpacing="-1">elo</text>
                    </svg>
                  </div>

                  {/* Amex */}
                  <div className="flex h-8 w-12 items-center justify-center rounded bg-[#006FCF]">
                    <span className="text-[10px] font-bold text-white tracking-widest">AMEX</span>
                  </div>

                  {/* Pix */}
                  <div className="flex h-8 items-center gap-1.5 px-2.5 rounded bg-[#32bcad]/10 border border-[#32bcad]/30">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#32bcad]" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5.615 14.625a3.98 3.98 0 0 0 2.83 1.17h.08l2.695 2.695a1.98 1.98 0 0 0 2.8 0l2.715-2.715a3.98 3.98 0 0 0 2.83-1.17l.955.955a.5.5 0 0 0 .707-.707l-.955-.955A3.98 3.98 0 0 0 20 11.07V10.9a3.98 3.98 0 0 0-1.17-2.83l-.955-.955a.5.5 0 0 0-.707.707l.955.955A2.98 2.98 0 0 1 19 10.9v.17a2.98 2.98 0 0 1-.875 2.125l-2.715 2.715a.98.98 0 0 1-1.386 0L11.33 13.22a.5.5 0 0 0-.707.707l2.694 2.694-2.715 2.715a.98.98 0 0 1-1.386 0L6.52 16.64a3.98 3.98 0 0 0 0-5.657L5.565 10.03A2.98 2.98 0 0 1 5 8.095a2.98 2.98 0 0 1 .875-2.12L8.59 3.26a.98.98 0 0 1 1.386 0l2.694 2.694a.5.5 0 0 0 .707-.707L10.68 2.551a1.98 1.98 0 0 0-2.8 0L5.165 5.267A3.98 3.98 0 0 0 4 8.095c0 1.063.415 2.073 1.17 2.83l.955.955a2.98 2.98 0 0 1 0 4.243l-.51-.51v.012z"/>
                    </svg>
                    <span className="text-xs font-bold text-[#32bcad]">Pix</span>
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
