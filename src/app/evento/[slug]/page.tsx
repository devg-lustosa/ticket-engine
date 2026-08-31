import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, MapPin, Ticket, ArrowLeft, ShieldCheck, User, CreditCard, AlertCircle, Pencil } from "lucide-react";
import { siteConfig } from "@/config/site";
import { UserNav } from "@/components/user-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";
import { TicketsBox } from "./_components/tickets-box";

export const revalidate = 60;

interface EventPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function EventDetailsPage({ params }: EventPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Paraleliza a busca do evento e do usuário logado
  const [event, { data: { user: authUser } }] = await Promise.all([
    prisma.event.findUnique({
      where: { slug },
      include: {
        batches: {
          orderBy: { sortOrder: "asc" },
        },
        organizer: {
          select: { name: true },
        },
      },
    }),
    supabase.auth.getUser()
  ]);

  if (!event || event.status !== "PUBLISHED") {
    notFound();
  }
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
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <UserNav user={dbUser} />
          </div>
        </div>
      </div>

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
                    <svg viewBox="0 0 24 24" className="h-4 w-auto" style={{ fill: "#FFFFFF" }} xmlns="http://www.w3.org/2000/svg">
                      <path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z"/>
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
                    <svg viewBox="0 0 24 24" className="w-4 h-4" style={{ fill: "#32bcad" }} xmlns="http://www.w3.org/2000/svg">
                      <path d="M5.283 18.36a3.505 3.505 0 0 0 2.493-1.032l3.6-3.6a.684.684 0 0 1 .946 0l3.613 3.613a3.504 3.504 0 0 0 2.493 1.032h.71l-4.56 4.56a3.647 3.647 0 0 1-5.156 0L4.85 18.36ZM18.428 5.627a3.505 3.505 0 0 0-2.493 1.032l-3.613 3.614a.67.67 0 0 1-.946 0l-3.6-3.6A3.505 3.505 0 0 0 5.283 5.64h-.434l4.573-4.572a3.646 3.646 0 0 1 5.156 0l4.559 4.559ZM1.068 9.422 3.79 6.699h1.492a2.483 2.483 0 0 1 1.744.722l3.6 3.6a1.73 1.73 0 0 0 2.443 0l3.614-3.613a2.482 2.482 0 0 1 1.744-.723h1.767l2.737 2.737a3.646 3.646 0 0 1 0 5.156l-2.736 2.736h-1.768a2.482 2.482 0 0 1-1.744-.722l-3.613-3.613a1.77 1.77 0 0 0-2.444 0l-3.6 3.6a2.483 2.483 0 0 1-1.744.722H3.791l-2.723-2.723a3.646 3.646 0 0 1 0-5.156"/>
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
