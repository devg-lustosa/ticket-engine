import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { emptySales, salesForEvents } from "@/services/sales.service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LayoutDashboard,
  Plus,
  Calendar,
  MapPin,
  Users,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  DollarSign,
  Ticket as TicketIcon,
  CheckSquare,
  Wallet,
  Percent,
  Tag,
} from "lucide-react";
import { PublishButton } from "./_components/publish-button";
import { DeleteButton } from "./_components/delete-button";
import { CortesiaButton } from "./_components/cortesia-button";
import { BorderoButton } from "./_components/bordero-button";
import { NicknameModal } from "@/components/nickname-modal";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Rascunho", color: "bg-muted text-muted-fg" },
  PUBLISHED: { label: "Publicado", color: "bg-success/15 text-success" },
  CANCELLED: { label: "Cancelado", color: "bg-error/15 text-error" },
  FINISHED: { label: "Encerrado", color: "bg-warning/15 text-warning" },
};

export default async function StaffDashboardPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  if (!dbUser || (dbUser.role !== "STAFF" && dbUser.role !== "ORGANIZER")) {
    redirect("/meus-ingressos");
  }

  if (dbUser.role === "STAFF") redirect("/portaria");
  const { cursor } = await searchParams;
  const owner = dbUser.role === "ORGANIZER" ? { organizerId: dbUser.id } : {};
  const last = cursor ? await prisma.event.findFirst({ where: { id: cursor, ...owner }, select: { date: true, id: true } }) : null;
  if (cursor && !last) redirect("/painel");
  const fetched = await prisma.event.findMany({
    where: { ...owner, ...(last ? { OR: [{ date: { lt: last.date } }, { date: last.date, id: { lt: last.id } }] } : {}) },
    orderBy: [{ date: "desc" }, { id: "desc" }], take: 51,
    include: { batches: { select: { id: true, name: true, price: true, totalQty: true, soldQty: true } } },
  });
  const events = fetched.slice(0, 50);
  const sales = await salesForEvents(events.map(event => event.id));

  return (
    <main className="min-h-screen bg-background text-foreground">
      <NicknameModal hasNickname={!!dbUser.nickname} />
      
      <header className="mx-auto max-w-6xl px-4 pt-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm text-muted-fg">Área do organizador</p><h1 className="mt-1 text-3xl font-bold">Seus eventos</h1><p className="mt-2 text-muted-fg">Acompanhe as vendas e abra a operação de cada evento.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/portaria" className="nav-control border border-border">Abrir portaria</Link><Link href="/painel/eventos/novo" className="ui-button" data-tooltip="Criar evento"><Plus size={17} />Criar evento</Link></div>
      </header>

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Navegação Secundária */}
        {dbUser.role === "ORGANIZER" && (
          <div className="flex items-center gap-6 border-b border-border mb-8 pb-4">
            <Link href="/painel" className="text-brand font-medium border-b-2 border-brand pb-4 -mb-[17px]">
              Seus Eventos
            </Link>
            <Link href="/painel/equipe" className="text-muted-fg hover:text-foreground font-medium pb-4 -mb-[17px] transition-colors">
              Gestão de Equipe
            </Link>
            <Link href="/painel/configuracoes" className="text-muted-fg hover:text-foreground font-medium pb-4 -mb-[17px] transition-colors">
              Configurações
            </Link>
          </div>
        )}

        {!dbUser.role || dbUser.role !== "ORGANIZER" && (
          <h2 className="text-lg font-semibold mb-4">Seus Eventos</h2>
        )}
        
        {[...sales.events.values()].some(value => value.legacyPricingTickets || value.unreconciledCancellations) && <p role="status" className="mb-4 text-sm text-warning">Há pedidos antigos sem rateio histórico ou estornos sem conciliação. Confira o borderô antes do fechamento.</p>}
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Calendar size={48} className="text-muted-fg mb-4 opacity-50" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Nenhum evento cadastrado
            </h2>
            <p className="text-muted-fg mb-6">
              Crie seu primeiro evento para começar a vender ingressos.
            </p>
            {dbUser.role === "ORGANIZER" && (
              <Link
                href="/painel/eventos/novo"
                className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90 transition-colors" data-tooltip="Criar Evento"
              >
                <Plus size={16} />
                Criar Evento
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const status = STATUS_LABELS[event.status] ?? STATUS_LABELS.DRAFT;
              const eventDate = format(
                new Date(event.date),
                "dd 'de' MMMM, yyyy 'às' HH:mm",
                { locale: ptBR }
              );

              const summary = sales.events.get(event.id) ?? emptySales();
              const eventTicketsSold = summary.totalTicketsValid;
              const eventTotalRevenue = summary.grossRevenue;
              const eventCheckins = summary.totalCheckins;
              const eventPlatformFee = summary.platformFee;
              const eventNetRevenue = summary.netRevenue;

              return (
                <div
                  key={event.id}
                  className="bg-card border border-card-border rounded-xl overflow-hidden hover:border-border/80 transition-colors shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-4 p-4">
                    {/* Capa */}
                    <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                      {event.coverImage ? (
                        <img
                          src={event.coverImage}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Calendar size={24} className="text-muted-fg" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <PublishButton eventId={event.id} status={event.status} />
                      </div>
                      <h3 className="font-semibold text-foreground truncate">
                        {event.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-fg">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {eventDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={11} />
                          {event.venue}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={11} />
                          {eventTicketsSold} ingresso{eventTicketsSold !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-wrap items-center gap-1">
                      <Link
                        href={`/evento/${event.slug}`}
                        target="_blank"
                        className="nav-control text-muted-fg"
                        data-tooltip="Visualizar página" aria-label={"Visualizar " + event.title}
                      >
                        {event.status === "PUBLISHED" ? (
                          <Eye size={16} />
                        ) : (
                          <EyeOff size={16} />
                        )}<span className="ml-1 text-xs">Ver página</span>
                      </Link>

                      {dbUser.role === "ORGANIZER" && (
                        <>
                          <Link
                            href={`/painel/eventos/${event.id}/cupons`}
                            className="nav-control text-muted-fg"
                            data-tooltip="Gerenciar cupons" aria-label={"Cupons de " + event.title}
                          >
                            <Tag size={16} /><span className="ml-1 text-xs">Cupons</span>
                          </Link>
                          <Link
                            href={`/painel/eventos/${event.id}/editar`}
                            className="nav-control text-muted-fg"
                            data-tooltip="Editar evento" aria-label={"Editar " + event.title}
                          >
                            <Pencil size={16} /><span className="ml-1 text-xs">Editar</span>
                          </Link>
                          <CortesiaButton eventId={event.id} eventTitle={event.title} batches={event.batches.map(b => ({id: b.id, name: b.name}))} />
                          <BorderoButton eventId={event.id} eventTitle={event.title} />
                          <DeleteButton eventId={event.id} />
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Minimetrics for Organizer */}
                  {dbUser.role === "ORGANIZER" && (
                    <div className="border-t border-border/60 bg-muted/40 p-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <p className="text-xs text-muted-fg mb-1 flex items-center gap-1"><TicketIcon size={12}/> Vendidos</p>
                          <p className="text-lg font-bold text-foreground">{eventTicketsSold}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-fg mb-1 flex items-center gap-1"><DollarSign size={12}/> Bruto</p>
                          <p className="text-lg font-bold text-foreground">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(eventTotalRevenue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-fg mb-1 flex items-center gap-1 text-error/70"><Percent size={12}/> Comissão estimada ({summary.platformFeePercentage}%)</p>
                          <p className="text-lg font-bold text-error">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(eventPlatformFee)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-success mb-1 flex items-center gap-1"><Wallet size={12}/> Líquido estimado</p>
                          <p className="text-lg font-bold text-success">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(eventNetRevenue)}
                          </p>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <p className="text-xs text-muted-fg mb-1 flex items-center gap-1"><CheckSquare size={12}/> Check-ins</p>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-foreground">{eventCheckins}</span>
                            <span className="text-xs text-muted-fg">/ {eventTicketsSold}</span>
                          </div>
                          <div className="mt-1 w-full bg-border rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full transition-all"
                              style={{ width: eventTicketsSold > 0 ? `${(eventCheckins / eventTicketsSold) * 100}%` : "0%" }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <nav className="mt-6 flex justify-between text-sm" aria-label="Páginas de eventos">{cursor ? <Link href="/painel">Primeira página</Link> : <span />}{fetched.length > 50 && <Link href={"/painel?cursor=" + events[events.length - 1].id}>Próximos eventos →</Link>}</nav>
      </div>
    </main>
  );
}
