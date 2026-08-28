import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
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
} from "lucide-react";
import { PublishButton } from "./_components/publish-button";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Rascunho", color: "bg-gray-700 text-gray-300" },
  PUBLISHED: { label: "Publicado", color: "bg-green-900/50 text-green-400" },
  CANCELLED: { label: "Cancelado", color: "bg-red-900/50 text-red-400" },
  FINISHED: { label: "Encerrado", color: "bg-yellow-900/50 text-yellow-400" },
};

export default async function StaffDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  if (!dbUser || (dbUser.role !== "STAFF" && dbUser.role !== "ORGANIZER")) {
    redirect("/meus-ingressos");
  }

  const events = await prisma.event.findMany({
    orderBy: { date: "desc" },
    include: {
      batches: {
        select: {
          _count: { select: { tickets: true } },
        },
      },
    },
  });



  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center">
              <LayoutDashboard size={16} className="text-brand" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Dashboard de Eventos</h1>
              <p className="text-xs text-gray-400">
                {dbUser.role === "ORGANIZER" ? "Organizador" : "Colaborador"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Voltar
            </Link>
            {/* Botão de novo evento — apenas para Organizer */}
            {dbUser.role === "ORGANIZER" && (
              <Link
                href="/painel/eventos/novo"
                className="flex items-center gap-1.5 px-4 py-1.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90 transition-colors"
              >
                <Plus size={15} />
                Novo Evento
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        


        <h2 className="text-lg font-semibold mb-4">Seus Eventos</h2>
        
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Calendar size={48} className="text-gray-700 mb-4" />
            <h2 className="text-xl font-semibold text-gray-300 mb-2">
              Nenhum evento cadastrado
            </h2>
            <p className="text-gray-500 mb-6">
              Crie seu primeiro evento para começar a vender ingressos.
            </p>
            {dbUser.role === "ORGANIZER" && (
              <Link
                href="/painel/eventos/novo"
                className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90 transition-colors"
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

              let eventTicketsSold = 0;
              let eventTotalRevenue = 0;
              let eventCheckins = 0;
              
              if (dbUser.role === "ORGANIZER") {
                event.batches.forEach((batch) => {
                  batch.tickets.forEach((ticket) => {
                    if (ticket.status === "ACTIVE" || ticket.status === "USED") {
                      eventTicketsSold++;
                      if (ticket.status === "USED") {
                        eventCheckins++;
                      }
                      // @ts-ignore - we know payment exists if included
                      if (ticket.payment && ticket.payment.status === "PAID") {
                         // @ts-ignore
                         eventTotalRevenue += Number(ticket.payment.amount);
                      }
                    }
                  });
                });
              } else {
                 event.batches.forEach((batch) => {
                   eventTicketsSold += batch.tickets.length;
                 });
              }
              
              const eventPlatformFee = eventTotalRevenue * 0.05;
              const eventNetRevenue = eventTotalRevenue - eventPlatformFee;

              return (
                <div
                  key={event.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-4 p-4">
                    {/* Capa */}
                    <div className="w-16 h-16 rounded-lg bg-gray-800 overflow-hidden shrink-0">
                      {event.coverImage ? (
                        <img
                          src={event.coverImage}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Calendar size={24} className="text-gray-600" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <PublishButton eventId={event.id} status={event.status} />
                      </div>
                      <h3 className="font-semibold text-white truncate">
                        {event.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-400">
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
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={`/evento/${event.slug}`}
                        target="_blank"
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                        title="Visualizar página"
                      >
                        {event.status === "PUBLISHED" ? (
                          <Eye size={16} />
                        ) : (
                          <EyeOff size={16} />
                        )}
                      </Link>

                      {dbUser.role === "ORGANIZER" && (
                        <>
                          <Link
                            href={`/painel/eventos/${event.id}/editar`}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                            title="Editar evento"
                          >
                            <Pencil size={16} />
                          </Link>
                          <button
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Remover evento"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Minimetrics for Organizer */}
                  {dbUser.role === "ORGANIZER" && (
                    <div className="border-t border-gray-800/60 bg-gray-900/40 p-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><TicketIcon size={12}/> Vendidos</p>
                          <p className="text-lg font-bold">{eventTicketsSold}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><DollarSign size={12}/> Bruto</p>
                          <p className="text-lg font-bold">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(eventTotalRevenue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1 text-red-400/80"><Percent size={12}/> Taxa (5%)</p>
                          <p className="text-lg font-bold text-red-400">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(eventPlatformFee)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1 text-emerald-400/80"><Wallet size={12}/> Receita</p>
                          <p className="text-lg font-bold text-emerald-400">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(eventNetRevenue)}
                          </p>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><CheckSquare size={12}/> Check-ins</p>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">{eventCheckins}</span>
                            <span className="text-xs text-gray-600">/ {eventTicketsSold}</span>
                          </div>
                          <div className="mt-1 w-full bg-gray-800 rounded-full h-1.5">
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
      </div>
    </main>
  );
}
